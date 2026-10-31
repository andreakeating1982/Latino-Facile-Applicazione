# AGENTS.md — ingresso per agenti IA

Leggere questo documento prima di intervenire. Il repository è autosufficiente: non presupporre chat precedenti, skill installate, percorsi `/home/user`, una build esistente o credenziali ereditate.

## 1. Identificare il compito

| Compito | Guida |
|---|---|
| Ricostruzione identica | [REBUILD.md](REBUILD.md) |
| Nuova app / nuova lingua / nuovo contenuto | [ADATTARE.md](ADATTARE.md) |
| GitHub e trasferimento su Render | [RENDER.md](RENDER.md) |
| Variabili e dipendenze esterne | [docs/CONFIGURAZIONE.md](docs/CONFIGURAZIONE.md) |
| Accessibilità e riuso | [ACCESSIBILITA.md](ACCESSIBILITA.md) |
| Foto/OCR | [OCR-FOTO.md](OCR-FOTO.md) |
| Touch/scroll/viewport iframe | [SCROLLING-MOBILE.md](SCROLLING-MOBILE.md) |
| Solo photo cropper | [PHOTO-CROP-CLONABILE.md](PHOTO-CROP-CLONABILE.md) |
| Embed Blogger | [cornice-dinamica/README.md](cornice-dinamica/README.md) |
| Nuovo export verificato | [docs/ESPORTAZIONE.md](docs/ESPORTAZIONE.md) |
| Mappa cartelle | [docs/STRUTTURA.md](docs/STRUTTURA.md) |

Se esiste `VARIANTE-DA-ADATTARE.md`, leggerlo prima: le verifiche della sorgente non certificano la nuova app. `manifest.json` distingue la sorgente pubblicata dalla bozza clonata.

## 2. Stato corrente della sorgente

App: **Latino Facile**. Rotte `/` e `/app`; `/login` è infrastruttura opzionale. Sorgenti applicativi della produzione **8802** del 31/10/2026, commit `c9b23f54a307927397b664d93caef68975788c50`. Riferimento corrente: [RILASCIO-8802.md](RILASCIO-8802.md). Configurazione di esportazione, guide e strumenti possono avere commit successivi senza un nuovo rilascio del sito.

Il codice prevale sulle note storiche in [docs/storico](docs/storico/README.md). Non importare da esse vecchi limiti, colori, header, footer, pulsanti o strategie del cropper. Le percentuali linguistiche riportate in appunti precedenti non sono una nuova misura verificata da questo export.

## 3. Regole da preservare

1. **Modifiche circoscritte.** Un export non autorizza modifiche didattiche, nuovi servizi, migrazioni, upload a GitHub o deploy. Non cambiare dipendenze solo per un riordino documentale.
2. **Dati e segreti.** Non includere `.env`, chiavi, database, file studenti, log o cache. Non leggere/esportare credenziali reali e non copiarle da altre app. Usare [.env.example](.env.example). Il database è opzionale e serve all'autenticazione, **non** alla traduzione IA.
3. **Accessibilità.** Preservare font OpenDyslexic, provider, barra a cinque moduli, ARIA, focus, preferenze `lf_access`, righello, contrasto e `prefers-reduced-motion`. Il PDF usa i TTF incorporati; non dichiararlo PDF/UA o WCAG certificato senza verifica specifica.
4. **Palette condivisa.** In `shared/types.ts`: `SERVICE_COLORS` = avverbi `#0057D9`, preposizioni `#BDBDBD`, congiunzioni `#4A4A4A`; `OTHER_MOODS_COLOR = #795548`. Non cambiare i casi per errore. UI, legenda, scelta manuale e PDF devono seguire le stesse costanti. Per il grigio chiaro PDF conservare fill + contorno `0.35pt #595959` isolato con q/Q; didascalie tramite `legendExplanationColor`.
5. **Enclitiche.** Nell'app restano attaccate alla base, contorno del colore della base e testo nero/bianco opposto. Nel PDF `colorForEnclitic`: `-cum` preposizione chiara, `-que/-ve/-ne` congiunzione scura. Non applicare l'inversione UI al PDF.
6. **Foto e cropper.** SCATTA/CARICA → `normalizePhoto` → `CropDialog` → PNG lossless max 2200px → invio IA JPEG max 1800px → ripiego Tesseract → testo. Nessuna analisi automatica dopo l'OCR. Cropper baseline **8731**: solo titolo RITAGLIA LA FOTO, niente icona/istruzioni/AZZERA; quattro comandi centrati. `modal={true}`, pagina dietro ferma, corpo interno scorrevole, capture stabile e delta incrementali. **Non modificare `confirm()`, `cropBox.ts`, `moveBox`, `resizeBox` o `resizeCorner`** per layout/esportazione.
7. **Dipendenze del cropper.** Portare insieme componente, hook viewport, CSS, heightSync e test. Non uniformare ColorDialog a CropDialog: hanno contratti diversi.
8. **UI e PDF.** Limite corrente **50 parole** in `Home.tsx`; sconosciuti: chip nero e scritta bianca. Textarea/traduzione a sinistra, bottone SALVA con `h-auto`. Salvataggio traduzione senza download automatico; scaricare solo con SCARICA IL PDF. Nessun header aggiuntivo in `/app`, footer o pulsante quaderno. PDF delle frasi senza titolo aggiunto; numero centrato in grassetto soltanto se multipagina. Legenda app 1/2/3 colonne con `whitespace-nowrap` e dimensione in `cqw`: SINGOLARE/PLURALE non separati dal caso. Legenda PDF in due colonne con `fitOneLine`, stessa dimensione per SINGOLARE/PLURALE nella voce. Non ripristinare la vecchia griglia 2/3/4 o eliminare la misura delle larghezze PDF.
9. **Embed.** Conservare `labvisivo:height`, ping/token, filtro `e.source`, misurazione del contenuto reale e CORS `/fonts`. Durante `data-lf-crop-open` sospendere heightSync, poi rimisurare su `lf:crop-closed`. Non modificare l'embed per il solo cambio di una guida.
10. **IA.** Configurare la propria chiave solo per l'app autorizzata; riavviare il processo dopo una modifica ambiente. `colorSource: regole` non prova da solo una chiave mancante: può dipendere da rete, risposta o limiti del servizio. Non promettere tempi fissi o accuratezza totale. `verifyAI.ts`: chunk corrente 1, parallelo massimo 8; verificare il codice prima di ottimizzare.

## 4. Mappa operativa

| Funzione | File |
|---|---|
| Scheda studente e identità | `client/src/pages/WelcomePage.tsx`, `client/index.html` |
| Campo testo, foto, colorazione, traduzione e comandi PDF | `client/src/pages/Home.tsx` |
| Tipi, palette e legenda | `shared/types.ts` |
| Analisi asincrona | `server/analyzer/index.ts`: `analyzeText(text): Promise<AnalyzeResponse>` |
| Dizionario e regole latine | `server/analyzer/whitaker.ts`, `collatinus.ts`, `translationColors.ts` |
| IA, traduzione e API | `server/routers.ts`, `server/analyzer/verifyAI.ts`, `server/_core/llm.ts` |
| Foto IA e OCR | `client/src/lib/aiTranscribe.ts`, `ocr.ts`, `imagePrep.ts`, `server/analyzer/aiTranscribeLatino.ts` |
| Cropper e viewport | `client/src/components/CropDialog.tsx`, `client/src/hooks/useCropDialogViewport.ts`, `client/src/lib/cropBox.ts` |
| PDF | `client/src/lib/export.ts` |
| Accessibilità | `client/src/contexts/AccessibilityContext.tsx`, `client/src/components/AccessibilityToolbar.tsx`, `client/src/hooks/useReadAloud.ts`, `client/src/index.css` |
| Server, health, statici, font CORS | `server/_core/index.ts`, `server/_core/static.ts` |
| Build/deploy/export | `package.json`, `pnpm-lock.yaml`, `patches/`, `render.yaml`, `Dockerfile`, `scripts/` |

## 5. Verificare prima di consegnare

```bash
corepack pnpm install --frozen-lockfile --prod=false
corepack pnpm package:check
corepack pnpm test:package
corepack pnpm check
corepack pnpm test:ci
corepack pnpm build
corepack pnpm smoke
```

Per una modifica UI/foto/PDF eseguire anche i test browser descritti in [REBUILD.md](REBUILD.md), non limitarsi alla build. I test con API simulate o touch emulato non misurano la grammatica, l'OCR reale o l'idoneità BES su tutti i dispositivi.

Per esportare: stato Git pulito, checkpoint, `bash scripts/export-package.sh /percorso/esterno/app.zip`, rapporto e checksum. Non avviare `db:reset`, seed o migrazioni per collaudare il pacchetto. La richiesta di ZIP non autorizza una pubblicazione; per un nuovo deploy Easy-Peasy: checkpoint → preview condivisa → fermarsi → nuova conferma esplicita → checkpoint → produzione.
