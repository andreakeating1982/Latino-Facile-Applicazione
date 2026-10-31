# Latino Facile

**Colora le frasi latine, parola per parola.** Inserisci una o più frasi in latino e l'app le analizza una parola alla volta: ogni parola viene colorata secondo la sua funzione grammaticale (caso, modo, categoria) e toccandola si possono vedere tutte le analisi possibili e cambiarne il colore.

Applicazione web didattica completa: analisi grammaticale con dizionario in italiano, lettura del testo da foto con l'intelligenza artificiale (tool del Widget metacognitivo per espressioni: SCATTA/CARICA → ritaglio → trascrizione IA con ripiego su OCR tesseract.js), esportazione della frase colorata in PDF (con le traduzioni scritte dallo studente e numeri di pagina quando il documento supera una pagina) e traduzione in italiano con pulsante mostra/nascondi.

> 🤖 **Sei un agente AI o uno sviluppatore?** Leggi prima [`AGENTS.md`](AGENTS.md): è il punto di ingresso che indica quale guida seguire per ogni compito (ricostruire, cambiare lingua, deploy, accessibilità) e le parti del codice da non toccare mai.
>
> 📦 **Per ricostruire l'app da zero, segui la guida [`REBUILD.md`](REBUILD.md)** (pensata anche per agenti AI).
>
> ♿ **ACCESSIBILITÀ**: questa app è progettata per la didattica inclusiva (DSA/BES, ipovisione). Tutte le misure implementate — **font OpenDyslexic**, barra di accessibilità (dimensione testo, interlinea, righello di lettura, alto contrasto, lettura ad alta voce), focus da tastiera, `prefers-reduced-motion`, PDF in OpenDyslexic, embed accessibile — sono ricapitolate in **[`ACCESSIBILITA.md`](ACCESSIBILITA.md)** con le istruzioni passo-passo per riusarle su altre app simili.

## Rilascio corrente in produzione (29/10/2026)

**Parole di servizio:** AVVERBI blu intenso `#0057D9` (approvato, invariato),
PREPOSIZIONI grigio chiaro `#BDBDBD`, CONGIUNZIONI grigio scuro `#4A4A4A`. Fonte unica `SERVICE_COLORS`
in `shared/types.ts`, propagata a motore/regole/ruoli IA, legenda, scelta
manuale e PDF esportato. Testo scuro sui chip chiari; nel PDF riempimento
chiaro con contorno sottile scuro, senza sfondo. Didascalie leggibili e
campione chiaro bordato nel PDF. Enclitiche PDF: -cum chiaro, -que/-ve/-ne
scuro; inversione nero/bianco nell'app invariata. Casi, modi e crop NON cambiati.
**Produzione attiva: deploy 8754**, codice `5fbfc61fc64036b442bca07703162cd70f1d28a3`.
Pubblicazione autorizzata e verificata sul pubblico: backend reale con i tre
nuovi colori, 2/2 scenari UI desktop/mobile (IA simulata), 6 PDF scaricati e
4/4 scenari drag foto. I PDF conservano fill/contorni e legenda corretti.
Vedi `COLORI-PAROLE-SERVIZIO.md` per verifiche e limiti.

## Storico: rilascio precedente (28/10/2026)

**Versione pubblicata: deploy 8731**, URL https://latino-facile-app-2.easy-peasy.site.
Codice del rilascio: `3a4159402cb0f674ca2e269007d4cfcefe86bedd`.
Lo ZIP 8731 già consegnato corrisponde a quel rilascio; non comprende la
nuova palette ora pubblicata nel deploy 8754. Titolo
**RITAGLIA LA FOTO**, nessuna istruzione né icona centrale, spostamento diretto
su tutta l'area selezionata anche touch, presa continua di bordi/angoli e
inversione immediata al raggiungimento dei limiti. `confirm()`, geometria,
viewport e heightSync invariati. Vedi `tests/crop-drag.e2e.mjs`.

**Comprese anche le modifiche del precedente deploy 8730:** nel ritaglio
foto i quattro pulsanti **RUOTA SINISTRA / RUOTA DESTRA / CHIUDI / RITAGLIA**
sono centrati in UN SOLO riquadro, marroni e compatti (touch minimo 44px),
senza AZZERA. Il colore di **ALTRI MODI VERBALI** è ora **marrone cioccolato
`#795548`**, distinto dal verde ACCUSATIVO; unica fonte `OTHER_MOODS_COLOR`
per sei modi, motore, legenda, palette e PDF scaricabile. Vedi [`PHOTO-CROP-CLONABILE.md`](PHOTO-CROP-CLONABILE.md)
per il foglio autonomo di trapianto in un'altra app (istruzioni + sorgenti).


Il **deploy produzione 8731** comprende tutto quanto descritto sopra.
Verificati sul pubblico 9/9 scenari generali e 4/4 dedicati al trascinamento;
64/64 test unitari e build/typecheck superati prima del rilascio. Touch
emulato e OCR simulato: non una certificazione su telefoni fisici o OCR reale.
Non occorre sostituire il codice embed per queste correzioni. Vedi [`RILASCIO-MOBILE-2026-10-28.md`](RILASCIO-MOBILE-2026-10-28.md)
per versione, file indispensabili, test e limiti del collaudo.

## Skill pertinenti dopo il riordino

Per questa app usare **didattica-app-lingue** (manutenzione, colori/PDF,
foto/OCR e accessibilità) e **didattica-pubblicazione-blog** (ZIP, deploy,
GitHub/Render e cornici). Le schede installabili sono consegnate separatamente;
lo ZIP resta autosufficiente grazie alle guide incluse. Dettagli e distinzione
rispetto al quaderno statico: [`SKILLS-APP.md`](SKILLS-APP.md).

## 📦 Contenuto del pacchetto ZIP (funzionale per agenti AI)

> Il pacchetto ZIP esportabile di questa app è **una repository GitHub pronta** e
> pensata per essere usata anche da un **agente AI** senza altri contesti. Sei
> scopi, sei guide dedicate:
>
> | Scopo | Guida da seguire |
> |---|---|
> | 🤖 **Ricostruire QUESTA app identica** (dal repo GitHub o dallo ZIP) | [`REBUILD.md`](REBUILD.md) |
> | 🔀 **Creare una NUOVA app cambiando lingua** (inglese, spagnolo, francese…) | [`ADATTARE.md`](ADATTARE.md) |
> | 🚀 **Trasferire l'app da Easy-Peasy AI a Render via GitHub** | [`RENDER.md`](RENDER.md) |
> | ♿ **ACCESSIBILITÀ: tutte le misure (font OpenDyslexic, barra, lettura ad alta voce…) + riuso su altre app** | [`ACCESSIBILITA.md`](ACCESSIBILITA.md) |
> | 📷 **Scatto foto / ritaglio / OCR** (replicabile su altre app via GitHub e su Render) | [`OCR-FOTO.md`](OCR-FOTO.md) |
> | 📱 **Ritaglio mobile** (pagina dietro ferma, corpo interno scorrevole anche nel blog) | [`SCROLLING-MOBILE.md`](SCROLLING-MOBILE.md) |
>
> La **cornice dinamica** (embed iframe per Blogger/siti) è inclusa in
> [`cornice-dinamica/`](cornice-dinamica/README.md) e viene servita anche dal
> deploy dell'app (`/cornice-test/embed-latino-facile-dedicata.html`).

---

## 📖 Documentazione della repository

| Documento | Scopo | Per chi |
|---|---|---|
| [`AGENTS.md`](AGENTS.md) | **Punto di ingresso per agenti AI**: quale guida seguire per ogni compito e le parti di codice da non toccare mai | Agenti AI, sviluppatori |
| [`REBUILD.md`](REBUILD.md) | Ricostruire l'app **identica da zero**, passo-passo (con checklist e mappa file) | Agenti AI, sviluppatori |
| [`RENDER.md`](RENDER.md) | 🚀 **Trasferire l'app da Easy-Peasy AI a Render via GitHub** (ZIP → GitHub → Blueprint → verifica) | Insegnanti, sviluppatori, agenti AI |
| [`ADATTARE.md`](ADATTARE.md) | Creare una **nuova app simile cambiando lingua** (inglese, spagnolo, francese…): testi, motore, OCR, PDF, traduzione, cornice, deploy | Agenti AI, sviluppatori |
| [`ACCESSIBILITA.md`](ACCESSIBILITA.md) | **♿ Recap di TUTTE le misure di accessibilità** (font OpenDyslexic, barra, lettura ad alta voce, focus, PDF…) **+ guida al riuso su altre app** | Insegnanti, sviluppatori, agenti AI |
| [`OCR-FOTO.md`](OCR-FOTO.md) | **📷 Scatto foto, ritaglio e OCR**: flusso, file da copiare, bug del lato destro, riuso su altre app, Render | Agenti AI, sviluppatori |
| [`SCROLLING-MOBILE.md`](SCROLLING-MOBILE.md) | **📱 Ritaglio mobile**: pagina dietro ferma (`modal={true}`), viewport visibile anche nel blog, corpo touch scorrevole e test cross-origin; gli altri dialoghi restano distinti | Agenti AI, sviluppatori |
| [`cornice-dinamica/README.md`](cornice-dinamica/README.md) | Cornici embed iframe per Blogger/siti (altezza automatica, font OpenDyslexic) | Insegnanti, sviluppatori |
| [`manifest.json`](manifest.json) | Metadati macchina: stack, script, variabili d'ambiente, documenti di riferimento | Agenti AI, tool di ricostruzione |

## Caratteristiche

- **Analisi parola per parola** con il motore Whitaker's Words, arricchito con traduzioni e glossario in italiano
- **Frasi colorate** secondo uno schema cromatico fisso (soggetto, verbo, complementi, ecc.), identico a quello del quaderno cartaceo
- **Toeletta interattiva**: premi la parola per vederne il significato
- **Foto** (tool del Widget metacognitivo): due pulsanti terracotta SCATTA UNA FOTO DEL TESTO (fotocamera posteriore) e CARICA UNA FOTO (file): l'app raddrizza la foto, permette di ritagliare i margini (bordi, angoli, rotazione 90°; le foto piccole vengono ingrandite a schermo, maniglie sempre agibili) e l'IA trascrive il testo latino nel campo di input (ripiego OCR Tesseract; limite corrente di 50 parole, come `MAX_PAROLE` in `Home.tsx`). Guida completa per replicarlo: [`OCR-FOTO.md`](OCR-FOTO.md)
- **Download in PDF** della frase colorata: parole ingrandite, in grassetto e con le lettere colorate (niente riquadri), una frase per riga
- **Traduzione in italiano** con il pulsante *Mostra/Nascondi traduzione*: traduzione automatica con l'IA (se è configurata la chiave API) oppure traduzione parola per parola dal glossario integrato
- Interfaccia in **font OpenDyslexic** ad alta leggibilità (per dislessia e ipovedenti), con fallback Cambria / Times New Roman / Georgia
- **Accessibilità inclusiva**: barra con dimensioni testo (80–160%), interlinea regolabile, righello di lettura e modalità alto contrasto; preferenze salvate e persistenti — vedi **[`ACCESSIBILITA.md`](ACCESSIBILITA.md)**

## ♿ Accessibilità (inclusiva)

Questa app è progettata per la **didattica inclusiva** (DSA/BES, ipovisione). Tutte le misure sono ricapitolate in **[`ACCESSIBILITA.md`](ACCESSIBILITA.md)**, che include anche la guida passo-passo per portarle su altre app (via GitHub). In sintesi:

| Misura | Effetto |
|---|---|
| **Font OpenDyslexic** (auto-ospitato) | Font **principale** dell'interfaccia, ad alta leggibilità per la dislessia |
| **Barra di accessibilità** (Font, Interlinea, Righello, Modalità, Ascolto) | Visibile su tutte le pagine; preferenze salvate in `localStorage` |
| **Dimensione testo** 80–160% e **interlinea** 1.65–2.6 | Regolabili dall'utente |
| **Righello di lettura** e **alto contrasto** | Aiuti visivi attivabili al volo |
| **Focus da tastiera** visibile + ARIA | Navigazione senza mouse e screen reader |
| **`prefers-reduced-motion`** | Animazioni ridotte se richiesto dal sistema |
| **Lettura ad alta voce** (Ascolto → Leggi) | Sintesi vocale in italiano di tutta la pagina (Web Speech API) |
| **PDF in OpenDyslexic** | Materiale di studio stampabile quanto leggibile |
| **Embed accessibile** | Cornici iframe con altezza automatica (vedi sotto) |

> ♿ **Per riusarle su un'altra app**: segui la guida in [`ACCESSIBILITA.md`](ACCESSIBILITA.md) §3 — copia il «pacchetto accessibilità» (font, `AccessibilityContext.tsx`, `AccessibilityToolbar.tsx`, regole CSS, CORS `/fonts`, `heightSync.ts`) e adatta colori/testi. Il documento è pensato anche per gli **agenti AI**: è autosufficiente e dà istruzioni operative.

## Stack tecnologico

- **Frontend**: Vite 7, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Express 4, tRPC 11, Drizzle ORM, PostgreSQL (opzionale: il cuore dell'app funziona anche senza database)
- **Analisi latina**: `whitakers-words` + dizionario italiano personalizzato
- **Foto**: trascrizione con IA (route REST condivisa col Widget metacognitivo `POST /api/ai/transcribe`, visione Gemini; richiede `EASY_PEASY_API_KEY`) con ripiego su OCR tesseract.js (dati `lat.traineddata` inclusi)
- **PDF**: pdf-lib + font OpenDyslexic (inclusi — il PDF usa lo stesso font accessibile dell'app)

## Requisiti

- **Node.js 22+**
- **pnpm 10+** (nel progetto è già dichiarato `packageManager: pnpm@10.4.1`)

## Installazione e avvio (sviluppo)

```bash
# 1. Installa le dipendenze (usa il lockfile per un risultato riproducibile)
pnpm install --frozen-lockfile

# 2. Crea il file delle variabili d'ambiente partendo dall'esempio
cp .env.example .env
#    poi compila le variabili indicate sotto

# 3. Avvia il server di sviluppo
pnpm dev
```

L'app è disponibile su **http://localhost:3000**.

## Variabili d'ambiente (file `.env`)

| Variabile | Obbligatoria | Descrizione |
|---|---|---|
| `DATABASE_URL` | No* | Stringa di connessione PostgreSQL (es. `postgresql://utente:password@host:5432/latino_facile`). Usata da auth e funzioni di sistema, non dal cuore dell'app |
| `PORT` | No | Porta di ascolto del server. In produzione (Render/Cloud Run) la imposta la piattaforma; in locale il default è 3000 |
| `BETTER_AUTH_SECRET` | No* | Chiave segreta per le sessioni di autenticazione. Genera con: `openssl rand -base64 32` |
| `TRUSTED_ORIGINS` | No | Origini attendibili per CORS/cookie (in produzione metti il tuo dominio, separato da virgole) |
| `EASY_PEASY_API_KEY` | No | Chiave dell'API Easy-Peasy.AI per la **traduzione automatica con l'IA**. Se assente, la traduzione usa comunque il glossario parola per parola |
| `DEEPL_API_KEY` | No | Chiave API DeepL (gratuita, 500.000 caratteri/mese, su https://www.deepl.com/pro-api) per la **traduzione latino→italiano di alta qualità**. Se assente, si ripiega su MyMemory |

\* Le funzioni principali (analisi, colorazione, OCR, PDF, traduzione glossario) funzionano senza database né chiave API: servono solo per autenticazione e traduzione IA.

## Controlli qualità

```bash
pnpm check    # type-check TypeScript (tsc --noEmit)
pnpm test     # test unitari (vitest)
pnpm format   # formatta il codice con Prettier
```

## CI automatica (GitHub Actions)

La repository include `.github/workflows/ci.yml`: a ogni push o pull request verso `main`/`master` la CI esegue automaticamente installazione con lockfile, type-check, test unitari e build di produzione, salvando `dist/` come artefatto scaricabile. Lo stato delle esecuzioni è visibile nella scheda **Actions** della repository.

## Build e avvio in produzione

```bash
pnpm build    # compila il client (vite) e il server (esbuild) in dist/
pnpm start    # NODE_ENV=production node dist/index.js
```

Il server Express serve anche i file statici del client, quindi un singolo processo è sufficiente.

### Trasferimento da Easy-Peasy AI a Render (via GitHub)

> 🚀 **Guida completa passo-passo: [`RENDER.md`](RENDER.md)** — dal pacchetto ZIP alla repository GitHub, al Blueprint su Render, con verifica finale e risoluzione dei problemi.

Il pacchetto ZIP è una **repository GitHub pronta**: contiene tutto il codice sorgente, il lockfile, le patch pnpm, gli asset (OCR, font, quaderno PDF), la CI (`.github/workflows/ci.yml`) e il **Blueprint Render** (`render.yaml`). Ecco il percorso completo:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/<TUO-UTENTE>/latino-facile-app)

> 🔘 Il pulsante si attiva dopo aver caricato la repo su GitHub: sostituisci `<TUO-UTENTE>` nell'URL con il tuo username.

**1. Crea la repository su GitHub**

1. Su [github.com](https://github.com) → **New repository** → nome `latino-facile-app` → **Private** o **Public** → crea (senza README/LICENSE iniziali, per evitare conflitti di merge).
2. Copia il contenuto dello ZIP nella cartella del progetto ed esegui:

```bash
cd latino-facile-app
# se lo ZIP non contiene già la cartella .git, inizializza:
git init
git add .
git commit -m "Latino Facile: app completa (analisi Whitaker, OCR, PDF, traduzione)"
git branch -M main
git remote add origin https://github.com/<TUO-UTENTE>/latino-facile-app.git
git push -u origin main
```

> ⚠️ **Sicurezza**: `.env` è escluso (vedi `.gitignore`) — non committare mai chiavi API. Usa `.env.example` come riferimento.

**2. Collega Render (Blueprint, con un clic)**

1. Su [render.com](https://render.com) (account gratuito) → **New → Blueprint**.
2. Collega la repository `latino-facile-app`: Render legge `render.yaml` e crea il Web Service con build `pnpm install --frozen-lockfile && pnpm build`, start `pnpm start`, health check su `/_health`, Node.js 22 e `BETTER_AUTH_SECRET` generata automaticamente.
3. Al termine del primo deploy: apri il servizio → **Environment** → imposta `TRUSTED_ORIGINS` col dominio (es. `https://latino-facile.onrender.com`) e, se vuoi, `EASY_PEASY_API_KEY` / `DEEPL_API_KEY` / `DATABASE_URL`. Salva: Render riavvia da solo.

Render imposta `PORT` automaticamente: il server ascolta su `0.0.0.0` e la piattaforma instrada le richieste.

> ⚠️ **Senza database**: il cuore dell'app (analisi, colorazione, OCR, PDF, traduzione con glossario) funziona senza database né chiavi API. Il database PostgreSQL serve solo per autenticazione (Better Auth) e per la traduzione IA.

**3. Aggiornamenti futuri**

Ogni `git push` su `main` attiva sia la CI (GitHub Actions: check + test + build) sia il deploy automatico su Render (`autoDeploy: true` nel Blueprint).

### Altre piattaforme

Basta un processo Node che esegua `pnpm start`:

- **Railway**: build `pnpm install && pnpm build`, start `pnpm start`
- **Google Cloud Run**: build `pnpm install && pnpm build`, start `pnpm start` (endpoint health check `/_health` già presente)
- **Qualsiasi VPS**: dopo `pnpm build`, esegui `pnpm start` (eventualmente con PM2)

In ogni caso imposta le variabili d'ambiente della piattaforma (vedi tabella sopra).

## 🚀 Creare una nuova app simile (es. inglese o spagnolo)

Questa repository è progettata per essere **clonata e adattata**: seguendo la guida **[`ADATTARE.md`](ADATTARE.md)** un agente AI o uno sviluppatore può creare un'app identica per un'altra lingua straniera (inglese, spagnolo…) cambiando solo:

- i **testi dell'interfaccia** (titolo, pulsanti, legenda, etichette, PDF)
- il **motore di analisi / glossario** per la nuova lingua (per il latino si usa Whitaker's Words)
- i **dati OCR** (`eng.traineddata.gz`, `spa.traineddata.gz`…)
- il **quaderno PDF** e i colori del brand
- la **cornice dinamica** (basta cambiare `APP_URL`)

L'**accessibilità resta identica** (font OpenDyslexic, barra, focus, PDF): è il «pacchetto accessibilità» riutilizzabile descritto in [`ACCESSIBILITA.md`](ACCESSIBILITA.md) §3. La guida copre anche il deploy su Render con la stessa procedura GitHub → Render di questa repo.

## 🖼️ Cornice dinamica (embed per Blogger/siti)

La cartella **`cornice-dinamica/`** contiene la cornice iframe per mostrare l'app dentro un post (Blogger o qualsiasi sito), con **altezza automatica** (protocollo `labvisivo:height`) e **font OpenDyslexic**:

- `embed-latino-facile-dedicata.html` — ⭐ **versione dedicata (~18 KB, v3 impermeabile + anti-loop)**: titolo e pulsanti **sulla stessa riga, tutti centrati**, **Schermo intero** e **Ricarica**, spinner di caricamento, **stato online/errore** con pulsante Riprova (timeout 15 s), **isolamento totale** se il blog ha più cornici simili (id univoci, scoping DOM, filtro `e.source`), **anti-loop altezza** (debounce, clamp, conferma salti sospetti). Per un'altra app basta cambiare la riga `APP_URL`
- `embed-latino-facile-lite.html` — versione leggera (~5 KB), **universale**: per un'altra app basta cambiare la riga `APP_URL` (o passare `?app=URL&title=NOME` nella pagina)
- `embed-universale.html` — template generico con URL segnaposto, per creare la cornice di una nuova app
- `embed-latino-facile.html` — versione autosufficiente (~110 KB, font incorporati)

Istruzioni complete, ricostruzione per l'IA, CORS e altezza dinamica: [`cornice-dinamica/README.md`](cornice-dinamica/README.md). L'accessibilità dell'embed è descritta in [`ACCESSIBILITA.md`](ACCESSIBILITA.md) §2.13.

## Struttura del progetto

```
latino-facile-app/
├── .github/workflows/ci.yml # CI: install + check + test + build a ogni push
├── client/                  # Frontend React (Vite)
│   ├── src/
│   │   ├── pages/Home.tsx   # Pagina principale dell'app
│   │   ├── lib/             # export PDF, OCR, client tRPC
│   │   └── components/ui/   # Componenti shadcn/ui
│   └── public/
│       ├── fonts/           # Font OpenDyslexic (app + PDF esportato)
│       └── tessdata/        # Dati OCR latino (tesseract.js)
├── server/                  # Backend Express + tRPC
│   ├── routers.ts           # Procedure latino.analyze / latino.translate
│   ├── analyzer/            # Motore Whitaker + glossario italiano
│   └── _core/               # Infrastruttura del scaffold
├── shared/                  # Tipi condivisi client/server
├── drizzle/                 # Schema e migrazioni del database
├── patches/                 # Patch pnpm (necessaria per l'installazione)
├── manifest.json            # Metadati macchina per la ricostruzione
├── render.yaml              # Blueprint Render: deploy con un clic
├── cornice-dinamica/        # Cornici iframe per Blogger (dedicata v3 impermeabile + anti-loop ~18 KB + lite universale ~5 KB + autosufficiente ~110 KB)
│   └── embed-latino-facile(-dedicata/-lite).html, embed-universale.html + README
├── AGENTS.md                # 🤖 Punto di ingresso per agenti AI (quale guida seguire)
├── ACCESSIBILITA.md         # ♿ Recap di tutte le misure di accessibilità + guida al riuso
├── RENDER.md         # 🚀 Guida: trasferimento Easy-Peasy AI → Render via GitHub
├── ADATTARE.md              # 🔀 Guida: creare una nuova app simile (es. inglese/spagnolo/francese)
├── REBUILD.md               # Guida di ricostruzione da zero (per agenti AI)
├── package.json
└── pnpm-lock.yaml           # Lockfile: installazioni riproducibili
```

## Note importanti

- **OCR**: i dati linguistici di tesseract (`lat.traineddata.gz`) sono inclusi in `client/public/tessdata/`; non rimuoverli o il riconoscimento del testo latino smette di funzionare.
- **Font**: i font OpenDyslexic in `client/public/fonts/` sono usati sia per l'interfaccia sia per generare il PDF esportato (`export.ts` li incorpora con pdf-lib): un solo set di font, sempre accessibile.
- **Quaderno PDF**: i pulsanti "IL QUADERNO PDF" e la costante `PDF_LINK` NON esistono più in `client/src/pages/Home.tsx` (rimossi dall'app): i file `quaderno-unico-v*.pdf` in `client/public/` restano SOLO come asset storici serviti da Express, senza alcun link/pulsante nell'app. NON reintrodurre pulsanti o link al quaderno senza richiesta esplicita dell'utente.
- **Sicurezza**: il file `.env` non è incluso nel repository (vedi `.gitignore`); non committare mai chiavi API.
- **Limite di input**: l'app accetta al massimo 200 parole per testo digitato o riconosciuto da foto (costante `MAX_PAROLE` e funzioni `contaParole`/`troncaParole` in `client/src/lib/parole.ts`, usati in `client/src/pages/Home.tsx`). La tua foto con 5 frasi (~30 parole) ci sta larghissima.

## Licenza

MIT
