import { describe, expect, it } from "vitest";
import { analyzeText } from "./index";
import { applyRoleOverrides } from "./translationColors";

/* 28/10 — regressione enclitiche: nessun uso di IA (ruoli vuoti), si prova
   solo il rilevamento deterministico aggiunto in applyRoleOverrides. */
async function suffissi(text: string): Promise<Record<string, string | null>> {
  const res = await analyzeText(text);
  const sentences = res.sentences ?? (res as any).coloredSentences;
  applyRoleOverrides(sentences, {});
  const out: Record<string, string | null> = {};
  for (const s of sentences)
    for (const t of s.tokens) {
      if (t.isPunct || !t.analysis) continue;
      out[t.word.toLowerCase()] = t.analysis.suffisso?.testo ?? null;
    }
  return out;
}

const NON_ENCLITICHE = [
  "nomine", "homine", "virgine", "ratione", "legione", "regione", "nave",
  "neve", "breve", "bene", "omne", "sine", "Cicerone", "Platone", "Nerone",
  "carne", "mane", "ordine", "pane", "atque", "neque", "itaque", "denique",
  "quoque", "usque", "uterque", "quisque", "ubique", "undique", "quinque",
  "aeque", "nonne", "namque", "quicumque", "umquam", "passione", "cum",
  "bove", "lance", "pugne", "seu", "sive", "absque", "ergo", "male",
];

describe("enclitiche: nessun falso positivo", () => {
  it("parole comuni in -ne/-ve/-que/-cum restano intere", async () => {
    const falsi: string[] = [];
    for (let i = 0; i < NON_ENCLITICHE.length; i += 10) {
      const ws = NON_ENCLITICHE.slice(i, i + 10);
      const r = await suffissi(ws.map((w) => `Vidi ${w}.`).join(" "));
      for (const w of ws) if (r[w.toLowerCase()]) falsi.push(`${w}:${r[w.toLowerCase()]}`);
    }
    expect(falsi).toEqual([]);
  }, 60000);
});

describe("enclitiche: pronome + cum", () => {
  it("riconosce mecum, tecum, secum, nobiscum, vobiscum, quocum", async () => {
    const ws = ["mecum", "tecum", "secum", "nobiscum", "vobiscum", "quocum", "quibuscum"];
    const r = await suffissi(ws.map((w) => `Audio ${w}.`).join(" "));
    for (const w of ws) expect(r[w]).toBe("cum");
  });
});

describe("enclitiche: -ne/-que/-ve su parole che il dizionario non conosce intere", () => {
  it("amasne, rexne, tresve sono separate; le altre restano uguali", async () => {
    const r = await suffissi("Audio amasne. Video rexne. Habeo tresve.");
    expect(r["amasne"]).toBe("ne");
    expect(r["rexne"]).toBe("ne");
    expect(r["tresve"]).toBe("ve");
    expect(r["audio"]).toBeNull();
    expect(r["video"]).toBeNull();
    expect(r["habeo"]).toBeNull();
  });
});
