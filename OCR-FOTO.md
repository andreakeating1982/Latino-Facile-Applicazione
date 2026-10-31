# Foto, ritaglio e riconoscimento — contratto corrente

Questa guida descrive i file inclusi nel pacchetto e come riusarli senza dipendere da altre chat. Per **solo cropper** usare [PHOTO-CROP-CLONABILE.md](PHOTO-CROP-CLONABILE.md), con 18 sorgenti completi e hash. Per viewport/scroll del blog usare [SCROLLING-MOBILE.md](SCROLLING-MOBILE.md).

## 1. Flusso utente e limiti

Sotto il campo di testo in `/app` ci sono **SCATTA UNA FOTO DEL TESTO** e **CARICA UNA FOTO**. La fotocamera usa `capture="environment"`; il caricamento accetta immagini, non un flusso PDF, drop-zone o incolla globale.

1. Immagine fino a **18 MB**, normalizzata per orientamento EXIF.
2. Ritaglio obbligatorio prima del riconoscimento.
3. Riconoscimento IA se configurato; in caso di errore ripiego Tesseract sulla foto ritagliata.
4. Testo riconosciuto nel campo, al massimo **50 parole** (`MAX_PAROLE` in `Home.tsx`). Nessuna analisi automatica: lo studente può correggerlo e poi scegliere COLORA FRASE CON IA.

Se anche il ripiego fallisce, è necessario correggere/provare un'immagine leggibile o inserire manualmente il testo: nessun OCR può essere garantito su ogni foto. Le soglie della foto e del testo sono controlli diversi.

## 2. Pipeline e formati reali

```text
File immagine
  → normalizePhoto: orientamento EXIF, JPEG normalizzato
  → CropDialog: box percentuale, rotazioni e anteprima
  → confirm(): File PNG lossless, lato massimo 2200px
  → fileToScaledDataUrl: JPEG lato massimo 1800px per l'invio IA
  → POST /api/ai/transcribe { image: dataURL, kind: "photo" }
  → testo IA
  → se IA indisponibile: enhanceForOcr + Tesseract nel browser
  → pulizia / troncamento a 50 parole / inserimento nel campo
```

Non confondere il PNG restituito dal ritaglio con il JPEG usato successivamente per la richiesta IA. Il ridimensionamento dell'anteprima non modifica il calcolo percentuale del taglio.

## 3. File necessari

| File | Compito |
|---|---|
| `client/src/pages/Home.tsx` | Input foto, validazione, `handleFotoFile`, callback del cropper, IA/ripiego e inserimento testo |
| `client/src/lib/imagePrep.ts` | `normalizePhoto`, `enhanceForOcr` |
| `client/src/components/CropDialog.tsx` | Dialog di ritaglio |
| `client/src/lib/cropBox.ts` | Geometria pura: spostamento, bordi, angoli e minimo box |
| `client/src/hooks/useCropDialogViewport.ts` | Viewport visibile anche nell'iframe e blocco pagina con ripristino |
| `client/src/index.css` | Regole `.lf-crop-*`, touch e scroll |
| `client/src/lib/heightSync.ts` | Sincronizzazione cornice e sospensione durante il lock |
| `client/src/lib/aiTranscribe.ts` | Riduzione invio, richiesta REST, pulizia/plausibilità del testo latino |
| `server/analyzer/aiTranscribeLatino.ts` | Validazione immagine, contratto IA, route REST |
| `server/_core/index.ts` | Registrazione della route |
| `client/src/lib/ocr.ts`, `ocrClean.ts` | Tesseract e pulizia del ripiego |
| `client/src/lib/parole.ts` | Conteggio/troncamento per parola; il limite è definito in `Home.tsx` |
| `client/public/tessdata/lat.traineddata.gz` | Dati della lingua latina |
| `client/src/components/ui/dialog.tsx` e dipendenze UI | Infrastruttura Radix/shadcn del dialog |
| `tests/crop-mobile.e2e.mjs`, `tests/crop-drag.e2e.mjs` | Regressioni visuali e di interazione |
| `client/src/lib/cropBox.test.ts`, `ocr.test.ts`, `server/analyzer/aiTranscribeLatino.test.ts` | Test unitari pertinenti |

Non basta copiare `CropDialog.tsx`: mancherebbero viewport, lock, CSS e stabilità dell'iframe. Per un trapianto parziale seguire il foglio autonomo invece di copiare l'intero `Home.tsx`.

## 4. Ritaglio da preservare

- Titolo **RITAGLIA LA FOTO**, nessun sottotitolo, icona centrale o AZZERA.
- Quattro comandi: **RUOTA SINISTRA, RUOTA DESTRA, CHIUDI, RITAGLIA**, tutti centrati in un unico gruppo.
- `modal={true}`: pagina dell'app dietro ferma, corpo della finestra scorrevole e piedino separato. Non cambiare ColorDialog per uniformarlo.
- Tutta l'area selezionata è trascinabile direttamente con mouse/touch; i margini beige e le zone esterne permettono lo scroll del corpo.
- Pointer capture sul wrapper stabile, un pointerId, delta dall'ultimo evento e fine su up/cancel/lostcapture: niente zona morta invertendo ai limiti.
- Maniglie di lati/angoli interamente dentro il box, zona touch 44px. Box minimo 8%; tastiera frecce 2%, Maiusc+frecce 10%.
- Anteprima delle foto piccole ingrandita verso lato lungo 560px **compatibilmente con la larghezza disponibile**; mai deformare l'immagine per raggiungere quel numero.
- Con `data-lf-crop-open` heightSync sospende nuove misure; su `lf:crop-closed` rimisura dopo il ripristino.

**Non modificare `confirm()` o `cropBox.ts` per un problema di layout, scrolling o esportazione.** L'output PNG e la geometria percentuale sono invarianti.

## 5. IA e ripiego Tesseract

`POST /api/ai/transcribe` usa `EASY_PEASY_API_KEY` dal server; nessun DB richiesto. Senza chiave risponde **503**, se la trascrizione fallisce **502**: il client interpreta questi casi come motivo per provare il ripiego locale. L'immagine IA è inviata a un servizio esterno, non resta soltanto nel browser.

Tesseract usa `createWorker("lat", 1, {langPath: "/tessdata", ...})`, `PSM.SINGLE_BLOCK`, spazi preservati e DPI 300. I dati `lat.traineddata.gz` sono inclusi e serviti dal proprio host. **Worker e core/WASM usano invece i default di Tesseract.js e possono essere caricati da rete/CDN**: questo pacchetto non è una promessa di funzionamento interamente offline.

`ocrPdf` rimane una funzione di libreria, ma il flusso foto dell'app **non accetta PDF**. Non aggiungere pulsanti o import di PDF per il solo fatto che la funzione esista.

## 6. Riutilizzare su un'altra app o lingua

1. Per il ritaglio soltanto: [PHOTO-CROP-CLONABILE.md](PHOTO-CROP-CLONABILE.md), senza clonare backend o analizzatore.
2. Per l'intero flusso: portare i file e la registrazione della route; adattare l'integrazione nella propria pagina, non sostituire il suo contenuto alla cieca.
3. Adattare prompt/contratto IA, `cleanAiLatin` e `aiLatinPlausible`: gli accenti o caratteri validi di una nuova lingua non devono essere scartati da controlli latini.
4. Fornire il **vero modello** OCR della lingua desiderata e aggiornare `createWorker`: rinominare il file latino non cambia il suo vocabolario.
5. Preservare ARIA, focus, touch, viewport e heightSync; testare anche iframe e tastiera.
6. Applicare il limite di testo scelto in digitazione **e** OCR e aggiungere test.

Dettagli di adattamento dell'intera app: [ADATTARE.md](ADATTARE.md). La geometria non dipende dalla lingua, ma riconoscimento/pulizia e analisi linguistica sì.

## 7. GitHub e Render

I file `client/public/` vengono copiati dal build Vite in `dist/public/` e serviti da Express. Il Blueprint Node installa anche gli strumenti di build; non richiede modelli sul filesystem effimero scaricati a mano dopo il deploy.

Verificare che il modello OCR sia un vero gzip e i font siano veri binari con CORS, non una pagina HTML restituita dal fallback SPA. `pnpm smoke` esegue questi controlli da un server isolato senza chiavi; per l'IA reale serve configurazione della destinazione. Guida: [RENDER.md](RENDER.md).

## 8. Collaudo ripetibile

```bash
corepack pnpm check
corepack pnpm test:ci
corepack pnpm exec playwright install chromium
# Con un server app attivo:
node tests/crop-mobile.e2e.mjs
node tests/crop-drag.e2e.mjs
```

I test browser simulano la risposta OCR, usano canvas reale e touch emulato. Non misurano qualità OCR, accuratezza del latino o comportamento su telefoni fisici. Provare anche foto reali autorizzate, in buona luce, con testo leggibile e senza dati personali non necessari.

- [ ] Selezione, bordi/angoli, inversione ai limiti e rotazioni funzionano.
- [ ] App dietro ferma; scroll interno e comandi visibili anche nel blog.
- [ ] Chiudere ripristina stili, posizione e altezza cornice.
- [ ] Testo riconosciuto editabile e troncato a 50 parole, non analizzato automaticamente.
- [ ] Errori IA consentono il ripiego; errori OCR non producono una falsa riuscita.
- [ ] Modello OCR/font reali serviti dalla destinazione; IA solo con chiave server propria.
