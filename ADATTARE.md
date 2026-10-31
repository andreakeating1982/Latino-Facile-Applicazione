# Creare e adattare una nuova app

> **Clonazione non significa adattamento linguistico completato.** Il pacchetto fornisce una base funzionante e componenti riutilizzabili, ma motore, prompt, normalizzazione e regole sono specifici del latino. Cambiare solo titolo, codice OCR o lingua del provider non produce un analizzatore corretto di un'altra lingua.

Per ricostruire l'originale usare [REBUILD.md](REBUILD.md). Per pubblicare su Render usare [RENDER.md](RENDER.md). Prima di modificare leggere [AGENTS.md](AGENTS.md).

## 1. Scegliere il tipo di copia

| Obiettivo | Intervento |
|---|---|
| Stessa app latina con identità/dominio diversi | Copia sorgenti + configurazione, test e nuove chiavi; mantenere il motore |
| Altra lingua, stessa esperienza di analisi colorata | Adattare anche analizzatore, regole, prompt, dati OCR e test linguistici |
| Altra attività didattica | Riutilizzare UI, accessibilità, foto/PDF ed embed; progettare esplicitamente il nuovo contratto di contenuto |
| Solo ritaglio foto | Usare [PHOTO-CROP-CLONABILE.md](PHOTO-CROP-CLONABILE.md), senza copiare analizzatore/backend latino |

Prima verificare che la sorgente passi installazione, check, test, build e smoke.

## 2. Clonazione controllata

Lo script incluso richiede **Git e una sorgente committata e pulita**; non richiede dipendenze npm, credenziali o connessioni esterne.

```bash
# Dopo l'estrazione ZIP, creare prima una repository locale se manca:
git init
git add .
git commit -m "Import sorgente verificata"

node scripts/clone-app.mjs \
  --target ../nuova-app \
  --name nuova-app \
  --title "NUOVA APP"
# Se il dominio finale è già noto, aggiungere --url https://dominio-scelto.example/
```

Cosa fa:

- copia solo i file del commit corrente, compresi file nascosti pubblici, patch, test e asset;
- rifiuta sorgente sporca, file privati tracciati, collegamenti simbolici e destinazione esistente o dentro la sorgente;
- non copia `.git`, `.env`, `node_modules`, `dist`, database, cache o log;
- aggiorna nome pacchetto/servizio, titolo HTML e titolo della scheda studente;
- separa la provenienza in `manifest.json.sourceApp` e azzera i metadati di pubblicazione della variante;
- marca la copia con `VARIANTE-DA-ADATTARE.md` e un README da bozza: non eredita una certificazione o un deploy della sorgente;
- aggiorna le cornici con il dominio passato oppure con `https://da-configurare.invalid/`, evitando che la nuova cornice apra per errore la produzione originale;
- **non cambia motore latino, limite input, prompt, lingua TTS, contenuti didattici o dati OCR** e non inizializza né pubblica una repository remota.

È una copia sicura iniziale, non un generatore automatico di nuove attività. Proseguire nella cartella destinazione.

```bash
cd ../nuova-app
corepack pnpm install --frozen-lockfile --prod=false
cp .env.example .env
corepack pnpm package:check
```

In alternativa usare GitHub → **Use this template** su una propria repository template, oppure `git clone` in una nuova cartella. In questo caso eseguire manualmente le stesse operazioni di identità, metadati e dominio; non rimuovere la storia o il remote di un progetto già esistente senza richiesta.

## 3. Identità e testi

| File | Azione |
|---|---|
| `package.json`, `manifest.json`, `render.yaml` | Nome, descrizione, provenienza e servizio della **nuova** app |
| `client/index.html` | Titolo e metadati; `lang` deve descrivere la lingua dell'**interfaccia**: resta `it` se i comandi restano italiani |
| `client/src/pages/WelcomePage.tsx` | Titolo e testi della scheda; chiave storage dello studente solo se occorre separare più app sullo stesso dominio |
| `client/src/pages/Home.tsx` | Placeholder, esempi, toast, pulsanti e nomi download; non rimuovere ARIA o `h-auto` |
| `shared/types.ts` | Etichette/descrizioni di legenda; conservare il contratto o versionarlo esplicitamente se cambia il modello didattico |
| `client/src/lib/export.ts` | Testi e nomi PDF; preservare font, sottolineature e colori condivisi |
| `client/src/components/AccessibilityToolbar.tsx`, `useReadAloud.ts` | Mantenere i comandi italiani se così richiesto; adattare la voce alla lingua del contenuto solo con verifica dedicata |

Non fare una sostituzione globale di «latino»: può danneggiare endpoint, chiavi storage, fixture e tipi senza creare il motore desiderato.

## 4. Contratto dell'analizzatore

La firma reale è:

```ts
analyzeText(text: string): Promise<AnalyzeResponse>
```

`AnalyzeResponse`, `SentenceGroup`, `TokenData`, `TokenAnalysis` e `AnalysisOption` sono in `shared/types.ts`. Il risultato contiene `sentences[].tokens[]`, `unknownWords` e `apiUsed`; ogni analisi include `options`, indice `selected`, categoria, colore, etichetta, fonte e gli eventuali numero/voce/suffisso.

Per una nuova lingua:

1. Progettare un lessico/tagger/analizzatore che restituisca quel contratto oppure definire esplicitamente un contratto nuovo e aggiornare insieme UI, API e PDF.
2. Sostituire o isolare `server/analyzer/whitaker.ts`, `collatinus.ts`, `mapper.ts` e le regole in `index.ts`: Whitaker e le flessioni latine non sono un motore per inglese/francese/spagnolo.
3. Rivedere **anche** `translationColors.ts`: guardie vocativo, desinenze, concordanze, ablativo/preposizioni ed enclitiche sono logica latina, non codice universale da conservare alla cieca.
4. Adattare `normalize.ts`, tokenizer e gestione degli accenti/legature/apostrofi. Non eliminare accenti francesi o spagnoli solo perché il latino li normalizza.
5. Rivedere `verifyAI.ts` in tutti i prompt/parsing, gli esempi e `server/routers.ts` per traduzione/ruoli/ricolorazione. Mantenere timeout e ripieghi solo dove coerenti col nuovo motore.
6. Decidere una mappatura didattica corretta: il tag POS «nome» non equivale automaticamente a «soggetto», né le lingue moderne hanno tutti i casi latini. Non promettere una legenda universale corretta senza un progetto linguistico esplicito.

Mantenere l'API `latino.*` durante la prima prova è possibile: il namespace interno non determina la lingua. Se si rinomina, aggiornare **insieme** router, hook tRPC, test, smoke ed eventuali documenti; evitare modifiche parziali.

## 5. Foto IA e OCR

- Adattare contratto e lingua in `server/analyzer/aiTranscribeLatino.ts`.
- Rivedere `cleanAiLatin`/`aiLatinPlausible` in `client/src/lib/aiTranscribe.ts`: non devono rifiutare accenti o testo legittimo della nuova lingua.
- In `client/src/lib/ocr.ts` cambiare il codice `createWorker` **e fornire il vero modello** `eng`/`fra`/`spa` in `client/public/tessdata/`. **Rinominare `lat.traineddata.gz` non lo converte in un'altra lingua.** Verificare origine/licenza e compatibilità del modello.
- Conservare normalizzazione immagine, cropper, hook viewport, CSS e heightSync; tradurre solo i testi se necessario. [OCR-FOTO.md](OCR-FOTO.md) e [SCROLLING-MOBILE.md](SCROLLING-MOBILE.md) descrivono il contratto.
- Aggiornare limite di parole solo su richiesta, in digitazione e OCR insieme; il limite corrente della sorgente è 50.

I dati lingua sono locali, ma worker/core Tesseract usano i percorsi predefiniti: per una variante integralmente offline servirà un intervento dedicato e verificato, non solo lo ZIP.

## 6. Traduzione e PDF

Adattare glossari `itGloss*.ts`, frasi curate in `itOverrides.ts`, `itTranslate.ts`, coppie linguistiche di provider e prompt del server. Una chiave IA valida non rende corretta una coppia linguistica ancora latina.

Il PDF dinamico delle frasi è in `export.ts`; i nove quaderni statici `quaderno-unico-v*.pdf` sono **storici**, non pulsanti attivi da ripristinare. Nel clone possono essere archiviati o sostituiti solo con una decisione esplicita; non presentarli come materiale della nuova lingua.

Se cambia la palette o la legenda, aggiornare la fonte condivisa, UI, scelta manuale, analizzatore e PDF e creare test attesi. Preservare la struttura 8802: griglia app 1/2/3 colonne, etichette `whitespace-nowrap` e font in `cqw`; PDF in due colonne con `fitOneLine` sul font incorporato. Con etichette tradotte più lunghe verificare nuovamente che entrino nelle colonne senza tagli o sovrapposizioni: i test della sorgente non garantiscono automaticamente qualunque nuova stringa. Il foglio del cropper conserva la propria baseline: non aggiornarne i sorgenti incorporati per il solo cambio del nome app.

## 7. Accessibilità, cornice e dati

Preservare il pacchetto di [ACCESSIBILITA.md](ACCESSIBILITA.md): font, provider, barra, ARIA, tastiera, focus, TTS, preferenze, CSS e CORS font. Per il cropper portare anche viewport/lock/heightSync, senza toccare `confirm()` o la geometria.

Una volta noto il dominio, aggiornare `APP_URL` nei file pertinenti di `cornice-dinamica/` **e** la copia servita in `client/public/cornice-test/`; verificarne l'allineamento. Non cambiare token, filtro `e.source` o anti-loop. Il dominio passato al cloner non crea il servizio: deve corrispondere a quello realmente assegnato dopo il deploy.

Ogni clone usa chiavi e, se desiderato, un database propri. Mai puntare al DB della sorgente per collaudare o fare seed; le migrazioni non fanno parte della build.

## 8. Validazione della nuova app

```bash
corepack pnpm package:check
corepack pnpm check
corepack pnpm test:ci
corepack pnpm build
corepack pnpm smoke
```

Lo smoke della sorgente contiene una frase **latina** e attese della palette sorgente: nella nuova lingua aggiornarle insieme al motore. Se passa ancora solo il latino, non dichiarare completato l'adattamento.

Preparare casi attesi della nuova attività: frasi semplici, ambigue, negative/interrogative, pronomi, punteggiatura, accenti, nomi propri, parole sconosciute e testi al limite; testare API reali e percorso senza IA. Verificare foto reali, PDF, desktop/mobile, iframe e tecnologie assistive. Distinguere sempre API simulate, touch emulato e hardware reale.

Prima di una consegna della variante:

- [ ] `VARIANTE-DA-ADATTARE.md` completato; niente attestazioni di pubblicazione ereditate.
- [ ] Nuovo motore, prompt, normalizzazione, OCR e traduzione verificati nella lingua scelta.
- [ ] Nessun URL operativo, chiave o database della sorgente trasferito.
- [ ] Metadati, guide, test e PDF aggiornati; `package:check` e build riusciti.
- [ ] Nuova repository Git con `package.json` e `render.yaml` in radice.
- [ ] [RENDER.md](RENDER.md) eseguito soltanto dopo autorizzazione a pubblicare.
- [ ] Nuovo ZIP da commit pulito, [ESPORTAZIONE](docs/ESPORTAZIONE.md), rapporto e checksum della variante.
