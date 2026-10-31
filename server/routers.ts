import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { analyzeText } from "./analyzer";
import { generateText } from "./_core/llm";
import { fixMtVerb, glossToItalian } from "./analyzer/itTranslate";
import { applyTranslationAnalysis } from "./analyzer/translationColors";
import { TRANSLATION_OVERRIDES, normalizeSentenceKey } from "./analyzer/itOverrides";
import { myMemoryTranslate } from "./analyzer/mt";
import { deeplConfigured, deeplTranslate } from "./analyzer/deepl";
import {
  verifyWithAI,
  assignRolesWithAI,
  aiQuotaExhausted,
} from "./analyzer/verifyAI";
import {
  applyRoleOverrides,
  applyVocativoGuard,
} from "./analyzer/translationColors";
import type { SentenceGroup } from "../shared/types";

/** Ricostruisce la frase latina originale (con la punteggiatura) dai token. */
function sentenceText(g: SentenceGroup): string {
  return g.tokens
    .map((t) => t.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Esegue più operazioni asincrone con concorrenza limitata. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

/** Completa la promise entro `ms` millisecondi o fallisce (per i timeout IA). */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error("timeout")), ms)
    ),
  ]);
}

/* 26/10u: timeout della verifica IA proporzionato al numero di frasi.
   I chunk girano a ondate di 4 (MAX_PARALLEL): con testi lunghi — quasi
   al limite delle 200 parole — servono più ondate e il tetto fisso di
   35 s tagliava fuori l'IA, che ricadeva sempre su colorazione/traduzione
   REGOLE (il problema segnalato su mobile). */
function aiVerifyTimeout(nSentences: number): number {
  return Math.min(90_000, 20_000 + nSentences * 6_000);
}

export const appRouter = router({
  system: systemRouter,

  // ==========================================================================
  // LATINO FACILE · Colora le frasi
  // ==========================================================================
  latino: router({
    analyze: publicProcedure
      .input(z.object({ text: z.string().min(1).max(2000) }))
      .mutation(async ({ input }) => {
        const analysis = await analyzeText(input.text);
        // GUARDIA VOCATIVO (26/10): nella colorazione iniziale le parole
        // della chiamata («Este, viri, filii…») non devono restare nominativo
        const vocRoles: Record<string, string> = {};
        applyVocativoGuard(analysis.sentences, vocRoles);
        if (Object.keys(vocRoles).length > 0)
          applyRoleOverrides(analysis.sentences, vocRoles);
        // La colorazione immediata usa le regole grammaticali; appena arriva
        // la traduzione (procedura `translate`) i colori vengono ricalcolati
        // dall'IA se disponibile, con il relativo badge.
        return { ...analysis, colorSource: "regole" as const };
      }),

    // Traduzione in italiano delle frasi, con più livelli di qualità:
    // 1) IA Easy-Peasy (traduzione naturale; quando la quota del piano c'è)
    // 2) overrides curati per le frasi celebri (traduzione canonica)
    // 3) DeepL ufficiale latino→italiano (chiave gratuita in .env)
    // 4) traduzione automatica MyMemory
    // 5) glossario offline parola-per-parola (solo come ultima risorsa)
    translate: publicProcedure
      .input(z.object({ text: z.string().min(1).max(2000) }))
      .mutation(
        async ({
          input,
        }): Promise<{
          lines: string[];
          source: "ai" | "auto" | "glossario";
          coloredSentences: SentenceGroup[];
          colorSource: "ai" | "regole";
        }> => {
          const text = input.text.trim();
          const analysis = await analyzeText(text);
          const groups = analysis.sentences;
          const texts = groups.map((g) => sentenceText(g));
          const sentenceCount = texts.length;
          /* 26/10u: BUDGET HTTP TOTALE — Cloud Run taglia le risposte oltre
             ~100 s (errore 524): la traduzione completa (IA + fallback +
             verifica) deve restare dentro ~92 s. Con i testi lunghi il
             timeout adattivo della sola verifica IA può arrivare a 55 s:
             il budget decide se val la pena fare anche i passi seguenti. */
          const t0Translate = Date.now();
          const BUDGET_MS = 92_000;
          const remainingMs = () =>
            Math.max(0, BUDGET_MS - (Date.now() - t0Translate));

          // 1) Traduzione + ruoli in UNA sola chiamata IA (Gemini via
          // generateText). Due chiamate consecutive sforavano il timeout e
          // la colorazione restava «regole» anche con la traduzione IA ok.
          /* 26/10u: aiVerified dichiarato FUORI dal try — con l'accettazione
             dei risultati parziali le frasi IA vengono usate anche quando
             la variabile deve restare visibile fino al return finale. */
          let aiVerified: Awaited<ReturnType<typeof verifyWithAI>> = null;
          try {
            const placeholders = texts.map(() => "(mancante)");
            /* 26/10q: DOPPIO TENTATIVO IA — quando la prima chiamata IA
               fallisce per un errore transitorio (quota/rate limit/ripresa
               di rete, tipico da mobile) la colorazione finale restava
               «regole». Il secondo tentativo parte solo se il primo è
               fallito VELOCEMENTE (< 30 s): dopo un timeout pieno un retry
               non aiuta e allungherebbe solo l'attesa.
               26/10u: timeout proporzionato alle frasi (aiVerifyTimeout) e
               RISULTATO PARZIALE ACCETTATO — con testi lunghi bastava UN
               solo chunk fallito perché l'intero risultato IA venisse
               scartato (`every(typeof l === "string")`) e tutto ricadesse
               su REGOLE. */
            for (let attempt = 1; attempt <= 2 && !aiVerified; attempt++) {
              /* 26/10v: quota AI esaurita (429) → niente retry inutili */
              if (attempt > 1 && aiQuotaExhausted()) break;
              const t0 = Date.now();
              const budgetMs = Math.min(
                aiVerifyTimeout(sentenceCount),
                remainingMs()
              );
              if (budgetMs < 15_000) break; // budget HTTP esaurito
              try {
                const res = await withTimeout(
                  verifyWithAI(texts, placeholders, groups),
                  budgetMs
                );
                if (res && res.lines.some((l) => typeof l === "string")) {
                  aiVerified = res;
                }
              } catch (err) {
                const fastFail = Date.now() - t0 < 30_000;
                console.warn(
                  `[IA] tentativo ${attempt} fallito (${fastFail ? "errore rapido" : "timeout"}):`,
                  err instanceof Error ? err.message : err
                );
                if (!fastFail) break; // timeout: inutile riprovare
              }
              if (attempt === 1 && !aiVerified) {
                // breve pausa prima del secondo tentativo
                await new Promise((r) => setTimeout(r, 800));
              }
            }
            /* 26/10u: niente più RITORNO ANTICIPATO — le frasi IA vengono
               inserite in `lines` (le altre seguono la catena di fallback
               overrides → DeepL → MyMemory → glossario) e la colorazione
               viene costruita alla fine su TUTTE le frasi, come nel
               percorso automatico. Così un testo lungo non perde più
               l'intera colorazione IA per un solo chunk fallito. */
          } catch (err) {
            console.warn(
              "[IA] traduzione+ruoli fallita, passo al percorso automatico:",
              err instanceof Error ? err.message : err
            );
          }

          // 2) Overrides curati per le frasi celebri + frasi IA (26/10u):
          // l'IA vince dove ha risposto, ANCHE a risultato parziale; gli
          // overrides curati hanno comunque la precedenza ASSOLUTA.
          const lines: (string | null)[] = new Array(sentenceCount).fill(null);
          const aiLineIdx = new Set<number>();
          if (aiVerified) {
            aiVerified.lines.forEach((l, i) => {
              if (typeof l === "string") {
                lines[i] = l;
                aiLineIdx.add(i);
              }
            });
          }
          /* 26/10y: CORRETTO BUG introdotto in 26/10u — qui l'assegnazione
             incondizionata `lines[i] = OVERRIDE ?? null` AZZERAVA le frasi IA
             appena inserite: la traduzione finiva sempre a DeepL/MyMemory
             (es. «Catilina» → «Cicerone»/«Cato») pur con etichetta «IA».
             Ora l'override si applica SOLO se esiste. */
          texts.forEach((s, i) => {
            const ov = TRANSLATION_OVERRIDES[normalizeSentenceKey(s)];
            if (ov) {
              lines[i] = ov;
              aiLineIdx.delete(i);
            }
          });

          // 3) DeepL (qualità alta) per le frasi rimanenti, se configurato
          let missing = texts
            .map((s, i) => (lines[i] ? -1 : i))
            .filter((i) => i >= 0);
          if (deeplConfigured() && missing.length > 0) {
            await mapLimit(missing, 3, async (i) => {
              const dl = await deeplTranslate(texts[i]);
              if (dl) lines[i] = dl;
            });
            missing = texts
              .map((s, i) => (lines[i] ? -1 : i))
              .filter((i) => i >= 0);
          }

          // 4) MyMemory per le frasi che DeepL non ha coperto
          await mapLimit(missing, 3, async (i) => {
            const mt = await myMemoryTranslate(texts[i]);
            if (mt) lines[i] = mt;
          });

          // 4.5) Riallineamento persona/numero/tempo: MyMemory (e DeepL)
          // possono cambiare la persona («hai» invece di «voi»), il numero o
          // il tempo del verbo principale. L'analisi grammaticale del latino
          // è già disponibile: sostituiamo la forma verbale italiana con
          // quella corretta (es. «Hai elogiato» → «Voi lodavate»).
          for (let i = 0; i < groups.length; i++) {
            if (!lines[i]) continue;
            /* 26/10u: le frasi IA non passano dal riallineamento MT — già
               corrette dall'IA, il fix verbale è solo per DeepL/MyMemory */
            if (aiLineIdx.has(i)) continue;
            lines[i] = fixMtVerb(lines[i]!, groups[i]);
          }

          // 5) Glossario offline solo per le frasi senza traduzione
          let anyGlossario = false;
          const finalLines = groups.map((g, i) => {
            const l = lines[i];
            if (l) return l;
            anyGlossario = true;
            return glossToItalian(g.tokens);
          });

          // 5.5) Gli overrides curati hanno la precedenza ASSOLUTA: traduzione
          // canonica e verificata a mano per le frasi celebri e per i casi in
          // cui anche l'IA sbaglia (es. passivo reso attivo: «nuntiatur» →
          // «annuncia» invece di «è annunciata»).
          for (let i = 0; i < finalLines.length; i++) {
            const ov = TRANSLATION_OVERRIDES[normalizeSentenceKey(texts[i])];
            if (ov) finalLines[i] = ov;
          }

          // 5.6) Verifica automatica con l'IA (solo nel percorso automatico:
          // se la traduzione IA del livello 1 è già riuscita la qualità è alta
          // e si evita un secondo giro). L'IA corregge la traduzione (voce
          // passiva, persona/numero, genitivi trasformati in aggettivi…) e
          // assegna a ogni parola il ruolo sintattico per la colorazione. È
          // best-effort: in caso di errore o timeout si mantiene il risultato
          // automatico.
          /* 26/10s: DOPPIO TENTATIVO anche nel percorso automatico — come
             nel livello 1, se la verifica IA fallisce per un errore
             transitorio (quota/rate limit/rete, più frequente da mobile)
             si riprova una volta dopo 800 ms, SOLO se il primo tentativo è
             fallito velocemente (< 30 s). Senza retry la traduzione restava
             «automatica» invece che «IA». */
          let verified: Awaited<ReturnType<typeof verifyWithAI>> = null;
          /* 26/10u: se il livello 1 ha già dato frasi IA (anche parziali), la
             seconda verifica non serve — e col budget HTTP stretto dei testi
             lunghi rischia solo di far scadere la richiesta in 524. */
          if (!aiVerified) {
            for (let attempt = 1; attempt <= 2 && !verified; attempt++) {
              /* 26/10v: quota AI esaurita (429) → niente retry inutili */
              if (attempt > 1 && aiQuotaExhausted()) break;
              const t0auto = Date.now();
              const budgetAuto = Math.min(
                aiVerifyTimeout(sentenceCount),
                remainingMs() - 5_000
              );
              if (budgetAuto < 15_000) break; // budget HTTP esaurito
              try {
                verified = await withTimeout(
                  verifyWithAI(texts, finalLines, groups),
                  budgetAuto
                );
              } catch {
                verified = null;
              }
              if (attempt === 1 && !verified && Date.now() - t0auto < 30_000) {
                await new Promise((r) => setTimeout(r, 800));
              }
            }
          } // fine if (!aiVerified)
          if (verified) {
            for (let i = 0; i < finalLines.length; i++) {
              finalLines[i] = verified.lines[i] ?? finalLines[i];
            }
            // gli overrides curati restano la fonte canonica
            for (let i = 0; i < finalLines.length; i++) {
              const ov = TRANSLATION_OVERRIDES[normalizeSentenceKey(texts[i])];
              if (ov) finalLines[i] = ov;
            }
          }

          // Colorazione GUIDATA DALLA TRADUZIONE ITALIANA: il colore di ogni
          // parola latina deriva dal ruolo che ha nella traduzione mostrata
          // (es. «di Roma» → genitivo, «dagli abitanti» → ablativo).
          const coloredSentences = applyTranslationAnalysis(analysis.sentences, finalLines);
          // poi i ruoli verificati dall'IA correggono i casi che le regole
          // non possono risolvere (es. «incolae» senza nominativo)
          /* 26/10u: i ruoli IA valgono sia dal livello 1 (aiVerified) sia
             dal percorso automatico (verified) */
          const aiSource = aiVerified ?? verified;
          let aiRoles =
            aiSource && Object.keys(aiSource.roles).length > 0;
          if (aiRoles && aiSource) {
            applyRoleOverrides(coloredSentences, aiSource.roles, aiSource.numbers, aiSource.enclitics);
          } else {
            // fallback: SOLO i ruoli (output più piccolo e più affidabile del
            // JSON combinato traduzioni+ruoli): massimizza la colorazione IA
            try {
              const rolesRes = await withTimeout(
                assignRolesWithAI(texts, finalLines, groups),
                /* 26/10u: mai oltre il budget HTTP totale */
                Math.min(20_000, remainingMs())
              );
              if (rolesRes) {
                applyRoleOverrides(coloredSentences, rolesRes.roles, rolesRes.numbers, rolesRes.enclitics);
                aiRoles = true;
              }
            } catch {
              // resta la colorazione delle regole grammaticali
            }
          }
          if (!aiRoles) {
            // GUARDIA VOCATIVO anche nel percorso regole: «Este, viri,
            // filii… tolerate» non deve restare nominativo nemmeno se
            // l'IA non è riuscita
            const vocRoles: Record<string, string> = {};
            applyVocativoGuard(coloredSentences, vocRoles);
            if (Object.keys(vocRoles).length > 0)
              applyRoleOverrides(coloredSentences, vocRoles);
          }
          return {
            lines: finalLines,
            /* 26/10u: source onesto — «ai» se l'IA copre almeno metà delle
               frasi (anche parziale), «auto» se la maggior parte viene da
               DeepL/MyMemory. */
            source: aiVerified
              ? texts.filter(
                  (s, i) =>
                    aiLineIdx.has(i) ||
                    TRANSLATION_OVERRIDES[normalizeSentenceKey(s)]
                ).length *
                  2 >=
                sentenceCount
                ? ("ai" as const)
                : ("auto" as const)
              : verified
                ? ("ai" as const)
                : anyGlossario
                  ? ("glossario" as const)
                  : ("auto" as const),
            colorSource: aiRoles ? "ai" : "regole",
            coloredSentences,
          };
        }
      ),

    // Trascrizione della FOTO con l'intelligenza artificiale (visione):
    // NOTA (trapianto 26/10): la trascrizione foto NON passa più da qui —
    // il client chiama la route REST condivisa col Widget metacognitivo
    // `POST /api/ai/transcribe` (registrata in `server/_core/index.ts`
    // da `registerAiTranscribeRoute` di `aiTranscribeLatino.ts`) e ripiega
    // sull'OCR classico (Tesseract) se l'IA non risponde.

    // Ricalcolo dei colori quando l'utente MODIFICA la traduzione
    // (aggiunge o toglie parole): la colorazione segue sempre la
    // traduzione italiana mostrata, quindi viene ricalcolata da qui.
    recolor: publicProcedure
      .input(
        z.object({
          text: z.string().min(1).max(2000),
          lines: z.array(z.string()).min(1).max(20),
        })
      )
      .mutation(async ({ input }) => {
        const analysis = await analyzeText(input.text.trim());
        const coloredSentences = applyTranslationAnalysis(
          analysis.sentences,
          input.lines
        );
        // Colorazione AI-first anche dopo la modifica manuale: l'IA assegna i
        // ruoli in base alla NUOVA traduzione; se non risponde (quota esaurita,
        // timeout) restano le regole grammaticali.
        let colorSource: "ai" | "regole" = "regole";
        try {
          const groups = analysis.sentences;
          const texts = groups.map((g) => sentenceText(g));
          const rolesRes = await withTimeout(
            assignRolesWithAI(texts, input.lines, groups),
            30_000
          );
          if (rolesRes && Object.keys(rolesRes.roles).length > 0) {
            applyRoleOverrides(coloredSentences, rolesRes.roles, rolesRes.numbers, rolesRes.enclitics);
            colorSource = "ai";
          }
        } catch {
          colorSource = "regole";
        }
        return { coloredSentences, colorSource };
      }),
  }),
});

export type AppRouter = typeof appRouter;
