# Latino Facile

App didattica per analizzare e colorare le frasi latine, leggere il testo da una foto, scrivere una traduzione e scaricare il PDF. Interfaccia e PDF usano font OpenDyslexic auto-ospitati.

> **Pacchetto sorgente completo, non una build già compilata.** Estrarre lo ZIP, entrare nella cartella `latino-facile-app/` e usare le guide sotto. Su GitHub devono essere nella **radice della repository** `package.json`, `pnpm-lock.yaml` e `render.yaml`: non caricare il solo ZIP né una cartella annidata in più.
>
> **Versione inclusa: produzione 8802 del 31/10/2026**, codice `c9b23f54a307927397b664d93caef68975788c50`. Legenda responsive senza a-capo e legenda PDF aggiornata. Provenienza, hash pubblici e limiti: [RILASCIO-8802.md](RILASCIO-8802.md). L'aggiornamento dello ZIP non effettua un nuovo deploy.
>
> **Accessibilità da preservare:** [ACCESSIBILITA.md](ACCESSIBILITA.md). Le misure presenti non costituiscono una certificazione WCAG/PDF-UA o una validazione clinica/didattica per tutti gli studenti.

## Scegli il percorso

| Obiettivo | Documento |
|---|---|
| Avvio rapido e mappa del pacchetto | Questo README e [docs/STRUTTURA.md](docs/STRUTTURA.md) |
| Ricostruire **questa app identica** | [REBUILD.md](REBUILD.md) |
| Creare una copia e **adattarla** a un'altra lingua o attività | [ADATTARE.md](ADATTARE.md) |
| Trasferire da ZIP a **GitHub → Render** | [RENDER.md](RENDER.md) |
| Lavorare con un agente IA senza altre chat o skill | [AGENTS.md](AGENTS.md) |
| Configurare chiavi, servizi esterni e database opzionale | [docs/CONFIGURAZIONE.md](docs/CONFIGURAZIONE.md), [.env.example](.env.example) |
| Foto, riconoscimento e ritaglio | [OCR-FOTO.md](OCR-FOTO.md), [SCROLLING-MOBILE.md](SCROLLING-MOBILE.md) |
| Trapiantare **solo** il cropper | [PHOTO-CROP-CLONABILE.md](PHOTO-CROP-CLONABILE.md), 18 sorgenti incorporati |
| Inserire l'app nel blog | [cornice-dinamica/README.md](cornice-dinamica/README.md) |
| Verificare o rigenerare lo ZIP | [docs/ESPORTAZIONE.md](docs/ESPORTAZIONE.md) |
| Conoscere il riordino e i limiti dei controlli | [docs/portabilita/RIORDINO.md](docs/portabilita/RIORDINO.md) |
| Identificare il codice della versione pubblicata 8802 | [RILASCIO-8802.md](RILASCIO-8802.md) |
| Leggere il collaudo corrente della copia estratta | [docs/portabilita/VERIFICHE-8802-2026-10-31.md](docs/portabilita/VERIFICHE-8802-2026-10-31.md); hash e commit finali nel rapporto esterno della consegna |
| Consultare il precedente riordino, solo storico | [docs/portabilita/VERIFICHE-2026-10-29.md](docs/portabilita/VERIFICHE-2026-10-29.md) |

## Requisiti e avvio locale

- Node **22.22.2**, indicato anche in [.node-version](.node-version); il minimo del ramo 22 è **22.13.0**, richiesto da `pdfjs-dist`.
- pnpm **10.4.1**, fissato nel campo `packageManager` con hash; Git per clonare/esportare.
- Python **3.10+** soltanto per il controllo avanzato/esportazione ZIP; non serve al server Render.

```bash
corepack enable
corepack pnpm install --frozen-lockfile --prod=false
cp .env.example .env
# Facoltativo: compilare EASY_PEASY_API_KEY nel solo .env locale.
corepack pnpm dev
```

Aprire `http://localhost:3000`. `/` contiene la scheda studente, `/app` l'attività. Non servono un database, un account o una chiave IA per aprire l'app, usare il motore latino di base e generare PDF.

**Per riprodurre anche le funzioni IA occorre una propria `EASY_PEASY_API_KEY` valida**, configurata sul server: traduzione, verifica dei ruoli e trascrizione foto. La chiave non è inclusa nel pacchetto e non richiede un database. Senza chiave si usano le regole e i ripieghi disponibili; la qualità non è equivalente al percorso IA. Ulteriori dipendenze di rete sono descritte in [CONFIGURAZIONE](docs/CONFIGURAZIONE.md).

## Controlli ripetibili

```bash
corepack pnpm package:check  # struttura, guide, risorse, configurazione e cropper
corepack pnpm test:package   # sicurezza del clone e strumenti di packaging
corepack pnpm check          # TypeScript
corepack pnpm test:ci        # test unitari, esecuzione non parallela
corepack pnpm build          # dist/index.js + dist/public/
corepack pnpm smoke          # avvio produzione isolato, health/API/font/OCR
```

`smoke` avvia e chiude un **proprio** server su una porta libera, senza leggere il `.env` dell'app o usare chiavi/database reali. Controlla anche il contenuto effettivo dei file statici: il semplice HTTP 200 può essere il fallback HTML della SPA e non è sufficiente.

La CI in [.github/workflows/ci.yml](.github/workflows/ci.yml) esegue gli stessi controlli su push/PR `main` e `master`. Non accetta silenziosamente una suite senza test. Non effettua migrazioni, seed o chiamate IA.

## Produzione e Render

```bash
corepack pnpm build
NODE_ENV=production PORT=3000 node dist/index.js
```

Il frontend e le API sono serviti da **un unico processo Express**. Il Blueprint [render.yaml](render.yaml) usa il runtime **Node**, installa anche gli strumenti di build e avvia `node dist/index.js`; `PORT` è assegnata da Render e il server ascolta su `0.0.0.0`. Health check: `GET /_health` → testo `OK`.

Il percorso consigliato è **estrarre → caricare i file su GitHub → New / Blueprint su Render**. Il deploy automatico è configurato con `autoDeployTrigger: checksPass`: Render aspetta i controlli CI della versione collegata. La pubblicazione reale richiede l'account dell'utente, le variabili scelte e una sua operazione esplicita: questo pacchetto non pubblica nulla da solo.

Il [Dockerfile](Dockerfile) alternativo è multistadio e ricostruisce dai sorgenti: non richiede `dist/` nello ZIP. [.dockerignore](.dockerignore) esclude credenziali e file locali. I dettagli e i limiti della verifica Docker sono in [RENDER.md](RENDER.md).

## Clonazione e adattamento

```bash
# Dalla repository sorgente pulita e già committata:
node scripts/clone-app.mjs --target ../nuova-app --name nuova-app --title "NUOVA APP"
```

Il comando copia solo file committati, rifiuta una destinazione esistente e **non** trasferisce `.env`, dipendenze, database o storia Git. Rinomina l'identità, separa i metadati della sorgente e rende esplicito che la nuova app è **una bozza ancora basata sul motore latino**. Non trasforma automaticamente Whitaker e le regole latine in un analizzatore di inglese/francese/spagnolo. Seguire [ADATTARE.md](ADATTARE.md), completare i test della nuova lingua e configurare una propria destinazione di deploy.

## Stato dell'app e risorse preservate

- Base applicativa: produzione **8802**, codice `c9b23f54a307927397b664d93caef68975788c50`. Sorgenti `client/`, `server/`, `shared/`, lockfile e configurazione di avvio preservati; questo aggiornamento riguarda soltanto documentazione e metadati del pacchetto.
- Legenda app: griglia **1/2/3 colonne**, etichette senza a-capo (`whitespace-nowrap`), font adattato alla larghezza reale tramite container query. Nel PDF a due colonne `fitOneLine` misura i testi col font incorporato. I paragrafi di nota sotto la griglia restano testo corrente, non voci della legenda.
- Palette corrente: avverbi `#0057D9`, preposizioni `#BDBDBD`, congiunzioni `#4A4A4A`; altri modi `#795548`. UI, legenda e PDF derivano dalle stesse costanti. Dettagli: [COLORI-PAROLE-SERVIZIO.md](COLORI-PAROLE-SERVIZIO.md).
- Limite corrente: **50 parole**, definito in `Home.tsx`; il limite API di 2000 caratteri è un controllo distinto.
- Cropper: baseline indipendente **8731**, invariata; `modal={true}`, scroll interno, drag diretto, quattro comandi centrati. Non modificare `confirm()` o `cropBox.ts` per riordinare il pacchetto.
- I nove `quaderno-unico-v*.pdf` sono **asset storici preservati** in `client/public/`, non il PDF dinamico delle frasi. Non reintrodurre pulsanti al quaderno.
- Le vecchie guide contraddittorie sono conservate come testo in [docs/storico](docs/storico/README.md); non sono istruzioni operative.
- Le skill sono un supporto opzionale: [SKILLS-APP.md](SKILLS-APP.md). Tutte le guide necessarie sono già nel repository.

<details>
<summary>Riferimento visivo del ritaglio mobile incluso nel pacchetto</summary>

![Ritaglio foto mobile — risorsa di riferimento](docs/photo-crop-mobile.png)

Il riferimento non sostituisce i sorgenti o il collaudo corrente.
</details>

## Stack e licenze

React 19, Vite 7, TypeScript, Tailwind 4; Express, tRPC, Drizzle/PostgreSQL opzionale; Whitaker, Tesseract.js, pdf-lib. `pnpm-lock.yaml` e la patch di Wouter sono indispensabili per ricostruire le stesse dipendenze.

Il metadato del progetto dichiara MIT; le dipendenze, i font e i dati linguistici mantengono le rispettive licenze. Vedere [docs/LICENZE-E-RISORSE.md](docs/LICENZE-E-RISORSE.md); non attribuire automaticamente la licenza del codice ai PDF o agli altri asset.
