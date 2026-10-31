# ♿ ACCESSIBILITÀ — Latino Facile

> **SEZIONE DI RIFERIMENTO DELLA REPOSITORY.** Questo documento ricapitola
> **TUTTE le misure di accessibilità implementate nell'app** e spiega come
> riutilizzarle facilmente su altre app simili (via repository GitHub).
> È pensata sia per chi usa l'app (insegnanti, studenti con DSA/BES, ipovedenti)
> sia per chi la mantiene o la clona (sviluppatori e **agenti AI**).
>
> 📌 **Navigazione rapida**: §1 tabella delle 14 misure · §2 dettaglio di ogni
> misura · §3 **guida al riuso su un'altra app** (mini-pacchetto + checklist) ·
> §4 checklist di verifica · §5 riferimenti. Nelle altre guide della repo
> (`README.md`, `REBUILD.md`, `ADATTARE.md`, `AGENTS.md`) questo documento è
> sempre citato come «**ACCESSIBILITA.md**»: è il pacchetto accessibilità
> riutilizzabile di questa famiglia di app didattiche.
>
> 🚀 **Implementare queste misure su un'altra app via GitHub**: tutto il
> «mini-pacchetto accessibilità» (font OpenDyslexic, barra di accessibilità,
> hook di lettura ad alta voce, regole CSS, CORS `/fonts`, sincronizzazione
> altezza embed) è dentro questa repository e si copia **così com'è** — vedi
> §3.1 (tabella dei file da copiare), §3.2 (checklist di integrazione) e §3.4
> (consiglio: crea una **repository template** su GitHub da cui clonare nuove
> app con l'accessibilità già pronta).

> **Limiti:** questa guida descrive misure implementate, non una certificazione WCAG/PDF-UA, un test completo con tutti gli screen reader o una validazione per ogni studente BES. Il grigio chiaro `#BDBDBD` nel PDF usa un contorno per la leggibilità ma il solo fill non raggiunge 4,5:1 sul bianco. I font locali non rendono l'intera app offline; vedere [docs/CONFIGURAZIONE.md](docs/CONFIGURAZIONE.md).

**App**: «Latino Facile» — colora le frasi latine parola per parola.
**Pubblico**: scuola secondaria, inclusa la didattica per studenti con **DSA (dislessia, disortografia)**, **BES** e **ipovisione**.
**Principio guida**: *ogni informazione veicolata dal colore deve essere disponibile anche senza colore*; *ogni comando deve essere raggiungibile da tastiera*; *le preferenze dell'utente devono persistere tra una sessione e l'altra*.

---

## 1. Panoramica: le misure in una tabella

| # | Misura | Beneficiario principale | Dove vive nel codice |
|---|--------|------------------------|----------------------|
| 1 | **Font OpenDyslexic** ad alta leggibilità (auto-ospitato) | Dislessia, ipovisione | `client/src/index.css` (`@font-face`) + `client/public/fonts/` |
| 2 | **Barra di accessibilità** (Font, Interlinea, Righello, Modalità) | Tutti | `client/src/components/AccessibilityToolbar.tsx` + `client/src/contexts/AccessibilityContext.tsx` |
| 2-bis | **Barra annunciabile agli screen reader** (icone `aria-hidden`, gruppi con `role="group"`, nome accessibile «Ascolto», descrizione `sr-only`, live region all'avvio) | **Cecità totale** | `AccessibilityToolbar.tsx` (♿ misura 2.2-bis) |
| 3 | **Dimensione testo regolabile** 80%–160% | Ipovisione, affaticamento visivo | `AccessibilityContext.tsx` → variabile CSS `--lf-scale` |
| 4 | **Interlinea regolabile** 1.65 / 1.9 / 2.2 / 2.6 | Dislessia | `AccessibilityContext.tsx` → variabile CSS `--lf-lh` |
| 5 | **Righello di lettura** (banda che segue il puntatore) | Dislessia, difficoltà di scanning | `client/src/index.css` (`.lf-ruler-band`) + context |
| 6 | **Modalità ad alto contrasto** | Ipovisione | `client/src/index.css` (`html.lf-hc`) |
| 7 | **Focus visibile** per navigazione da tastiera | Ipovisione, motorio | `client/src/index.css` (`:focus-visible`) |
| 8 | **`prefers-reduced-motion`** rispettato | Vestibolare, ipersensibilità | `client/src/index.css` (`@media (prefers-reduced-motion)`) |
| 9 | **Testo base grande** (18 px) e selezione ad alto contrasto | Tutti | `client/src/index.css` (`body`, `::selection`) |
| 10 | **ARIA e accessibilità da tastiera** sui controlli (incl. annuncio del pulsante ASCOLTO e barrette/frecce del dialog di ritaglio foto) | Screen reader, tastiera, **cecità totale** | `AccessibilityToolbar.tsx`, `Home.tsx`, `WelcomePage.tsx`, `CropDialog.tsx` |
| 11 | **PDF esportato in OpenDyslexic** | Dislessia (studio offline) | `client/src/lib/export.ts` |
| 12 | **Preferenze persistenti** (`localStorage`) | Tutti | `AccessibilityContext.tsx` (chiave `lf_access`) |
| 13 | **Embed accessibile** (cornici iframe con altezza automatica, schermo intero, stato online/errore) | Tutti (Blogger/siti) | `cornice-dinamica/` (⭐ `embed-latino-facile-dedicata.html`) + `client/src/lib/heightSync.ts` |
| 14 | **Lettura ad alta voce** (text-to-speech in italiano, pulsante Ascolto → Leggi) | Dislessia, DSA | `client/src/hooks/useReadAloud.ts` + `AccessibilityToolbar.tsx` |

---

## 2. Dettaglio delle misure

### 2.1 Font OpenDyslexic ad alta leggibilità

**Cosa fa.** L'intera interfaccia usa il font **OpenDyslexic**, un carattere progettato per ridurre gli errori di lettura nelle persone dislessiche (lettere con peso asimmetrico nella parte bassa, forme più distinguibili tra loro: b/d, p/q, n/u…). Non è un font «di contorno»: è il font **principale** di tutta l'app, non un'opzione da attivare.

**Come è implementato.**

- In `client/src/index.css` sono dichiarati quattro `@font-face` (Regular 400, Bold 700, Italic 400, Bold Italic 700) con `font-display: swap` (il testo resta leggibile subito, il font si applica quando è pronto — niente flash di testo invisibile).
- I file sono **auto-ospitati** in `client/public/fonts/` (`OpenDyslexic-Regular.ttf`, `OpenDyslexic-Bold.ttf`, `OpenDyslexic-Italic.otf`, `OpenDyslexic-Bold.otf`) e le versioni WOFF2 (`OpenDyslexic-Regular-v2.woff2`, `OpenDyslexic-Bold-v2.woff2`) usate dalle cornici embed. Il caricamento di questi font non dipende da CDN esterni. Altre funzioni dell'app possono contattare servizi di rete: questo non attesta un funzionamento integralmente offline o l'assenza di trattamento dati da parte dei servizi attivati.
- Il font è applicato a `body` e alla classe `.font-display`:
  ```css
  body { font-family: "OpenDyslexic", "Cambria", "Times New Roman", Georgia, serif; }
  ```
  Lo stack contiene fallback serif classici: se OpenDyslexic non è ancora caricato o non è disponibile, la pagina resta leggibile.
- Il server abilita il **CORS** su `/fonts/*` (`Access-Control-Allow-Origin: *` in `server/_core/index.ts`), così anche le cornici embed su siti esterni (Blogger) possono caricare i font dall'app.

**Come si riusa su un'altra app.** Copiare i file da `client/public/fonts/`, copiare i quattro blocchi `@font-face` in cima al proprio `index.css` e aggiungere `"OpenDyslexic", ...` in cima allo stack dei font di `body`. Poi copiare la regola CORS `/fonts` nel proprio server Express (vedi §3).

### 2.2 Barra di accessibilità (Font, Interlinea, Righello, Modalità, Ascolto)

**Cosa fa.** Una barra fissa in alto, visibile su **tutte le pagine**, con cinque comandi sempre raggiungibili:

- **Font** (`A−` / `A+`): riduce/aumenta la dimensione del testo in tutta l'app, da 80% a 160%, con la percentuale corrente mostrata accanto (`aria-live="polite"` così gli screen reader annunciano il cambio).
- **Interlinea**: cicla tra 1.65, 1.9, 2.2 e 2.6 — interlinea più ampia = righe più facilmente seguibili.
- **Righello**: attiva/disattiva una banda di lettura gialla che segue il puntatore del mouse e aiuta a mantenere la riga di lettura.
- **Modalità**: alterna il tema normale all'**alto contrasto**.
- **Ascolto**: avvia/interrompe la **lettura ad alta voce** della pagina in italiano (text-to-speech — vedi §2.14).

**Come è implementata.**

- `client/src/components/AccessibilityToolbar.tsx`: la UI (stile «Cornice Universale», gruppi `whitespace-nowrap` che vanno a capo come blocchi interi senza rompere l'etichetta dal proprio comando).
- `client/src/contexts/AccessibilityContext.tsx`: lo stato, applicato a `document.documentElement` (font-size radice + variabili CSS `--lf-scale` e `--lf-lh` + classi `lf-ruler` / `lf-hc` su `<html>`).
- La barra usa `role="toolbar"` con `aria-label`, e ogni pulsante ha `aria-label`, `title` e `aria-pressed` dove appropriato.

**♿ Annunciabilità agli screen reader (misura 2.2-bis).** La barra è stata resa
**dotata di nomi, gruppi e annunci ARIA** per screen reader (NVDA, JAWS, VoiceOver, TalkBack). La compatibilità va verificata con gli strumenti e i dispositivi effettivamente usati; non si dichiara qui un collaudo completo con tutti questi prodotti:

- **Icone decorative nascoste**: ogni icona lucide ha `aria-hidden="true"` (lucide
  non lo applica di default), così lo screen reader non annuncia "immagine" o i
  path degli SVG e legge direttamente il nome dei comandi.
- **Gruppi con `role="group"` e `aria-label`**: ogni capsula (Font, Interlinea,
  Righello, Modalità, Ascolto) è un gruppo nominato — lo screen reader annuncia
  "Gruppo Ascolto", "Gruppo Font" ecc. e i pulsanti interni vengono letti col
  loro contesto.
- **Il pulsante ASCOLTO è individuabile per nome**: il nome accessibile contiene
  la parola "Ascolto" ("Ascolto: leggi il testo ad alta voce" / "Ascolto:
  interrompi la lettura ad alta voce"): un alunno cieco che naviga per pulsanti
  lo trova subito, insieme allo stato premuto/non premuto (`aria-pressed`).
- **Descrizione introduttiva `sr-only`**: prima della barra c'è un testo
  nascosto visivamente ma letto dagli screen reader e dalla lettura vocale in
  modalità browse: "Barra di accessibilità: comandi per Font, Interlinea,
  Righello, Modalità e Ascolto. Il pulsante Ascolto legge il testo ad alta voce."
- **Live region all'avvio** (`role="status"` + `aria-live="polite"`): appena
  l'app carica, lo screen reader annuncia "Barra di accessibilità disponibile.
  Usa il pulsante Ascolto per la lettura ad alta voce del testo." — così un
  alunno completamente cieco sa subito che il pulsante ASCOLTO esiste, prima
  ancora di esplorare la pagina.

**Limite noto (lettura vocale del browser).** La funzione "Leggi ad alta voce"
integrata nei browser (es. Edge) salta **per progettazione** gli elementi
interattivi (pulsanti): non legge la barra nemmeno dopo queste correzioni. Per
un alunno cieco lo strumento corretto è uno screen reader vero (NVDA, JAWS,
VoiceOver, TalkBack), per il quale la barra è ora completamente annunciabile.
Nota: quando l'app è incorporata su Blogger via iframe, la lettura vocale del
browser non attraversa l'iframe (limite di sicurezza cross-origin): per leggere
il contenuto dell'app si usa il pulsante ASCOLTO interno (che legge in italiano
anche dentro l'iframe) oppure uno screen reader, che entra nell'iframe
tramite il titolo della cornice.

**Come si riusa su un'altra app.** Copiare `AccessibilityContext.tsx` e `AccessibilityToolbar.tsx` nel proprio progetto (adattando i colori alle proprie variabili Tailwind), avvolgere l'app con `<AccessibilityProvider>`, renderizzare `<AccessibilityToolbar />` una sola volta in cima al layout, e copiare in `index.css` le regole `.lf-ruler-band`, `html.lf-ruler`, `html.lf-hc` e le variabili `--lf-scale` / `--lf-lh` (vedi §3).

### 2.3 Dimensione del testo regolabile (80–160%)

**Cosa fa.** Con un clic su `A−`/`A+` tutto il testo dell'app scala proporzionalmente (titoli, bottoni, frasi colorate, PDF preview). L'intervallo è limitato (0.8–1.6) per non rompere il layout, e il passo è 0.1 (10%) per un controllo graduale.

**Come è implementato.** Lo stato `fontScale` aggiorna `root.style.fontSize = ${16 * fontScale}px` e la variabile CSS `--lf-scale`. Il body usa `font-size: calc(18px * var(--lf-scale, 1))`: poiché quasi tutte le dimensioni sono in `rem` (Tailwind), scalare la radice ridimensiona tutta la UI in modo coerente.

### 2.4 Interlinea regolabile

**Cosa fa.** Il pulsante Interlinea cicla tra quattro valori (1.65, 1.9, 2.2, 2.6). Un'interlinea più ampia è la misura più efficace per molti lettori dislessici.

**Come è implementato.** La variabile `--lf-lh` alimenta `line-height: var(--lf-lh, 1.65)` sul body; il valore corrente è mostrato sul pulsante (es. `1,7` in formato italiano).

### 2.5 Righello di lettura

**Cosa fa.** Una banda orizzontale gialla semitrasparente (bordi arancioni) che segue il puntatore del mouse: aiuta a mantenere la riga che si sta leggendo e a non saltare le righe. Ha `pointer-events: none`, quindi non interferisce mai con i clic.

**Come è implementato.** Il div `#lf-ruler-band` è renderizzato dal provider (con `aria-hidden="true"` perché è puramente decorativo); un listener `mousemove` ne aggiorna `top`. In CSS è nascosto di default (`display: none`) e mostrato solo con `html.lf-ruler .lf-ruler-band { display: block; }`.

### 2.6 Modalità ad alto contrasto

**Cosa fa.** Un clic su «Contrasto» aumenta il contrasto globale (`filter: contrast(1.3) saturate(1.15)`), rende lo sfondo bianco puro e rimuove le ombre morbide dalle card, mantenendo comunque la leggibilità dei colori grammaticali.

**Come è implementato.** La classe `html.lf-hc` attiva le regole in `index.css`:
```css
html.lf-hc { filter: contrast(1.3) saturate(1.15); }
html.lf-hc body, html.lf-hc .paper-bg { background-color: #ffffff; }
html.lf-hc .card-paper { background: #ffffff; border-color: #2e2018; box-shadow: none; }
```

### 2.7 Focus visibile (tastiera e ipovedenti)

**Cosa fa.** Ogni elemento interattivo mostra un **anello di focus rosso ben visibile** (3 px, offset 2 px) quando viene raggiunto con la tastiera (`Tab`) — indispensabile per chi non usa il mouse e per chi ha difficoltà a individuare la posizione corrente.

**Come è implementato.** Regola globale in `index.css`:
```css
:focus-visible { outline: 3px solid #b71c1c; outline-offset: 2px; }
```
Più regole specifiche (`.chip-word:focus-visible`, pulsanti della barra con `focus-visible:outline-3 focus-visible:outline-[#b71c1c]`). L'outline appare **solo** per navigazione da tastiera (`:focus-visible`), non al semplice clic del mouse.

### 2.8 Rispetto di `prefers-reduced-motion`

**Cosa fa.** Se il sistema operativo dell'utente ha attiva l'opzione «riduci movimento» (utile per chi soffre di disturbi vestibolari o ipersensibilità), tutte le animazioni e transizioni vengono ridotte a 0.01 ms e lo scroll diventa istantaneo.

**Come è implementato.** Blocco `@media (prefers-reduced-motion: reduce)` in `index.css` che azzera durate di animazioni, transizioni e `scroll-behavior`.

### 2.9 Testo base grande e selezione ad alto contrasto

- **Base 18 px**: il body parte da 18 px (più grande del default del browser, 16 px) per ridurre l'affaticamento visivo; con la scala A+ arriva fino a ~29 px.
- **Selezione ad alto contrasto**: `::selection { background: #b71c1c; color: #fff6ea; }` — il testo selezionato resta sempre leggibile.
- **`letter-spacing: 0.012em`** sul body: un leggero aumento della spaziatura tra lettere migliora la lettura.

### 2.10 ARIA e accessibilità da tastiera

Tutti i controlli sono raggiungibili e comprensibili senza mouse e da screen reader:

- Campi del modulo di ingresso: `aria-label` su Cognome, Nome, Data, Classe (`WelcomePage.tsx`).
- Parole colorate (chip): `tabIndex={0}` + `onKeyDown` (Invio = apri le analisi) + `aria-label="Cambia il colore di {parola}"` (`Home.tsx`).
- Pulsanti foto (SCATTA UNA FOTO DEL TESTO / CARICA UNA FOTO): `button` nativi con `aria-label` esplicite, stato `disabled` durante la lettura, avanzamento annunciato con `role="status"` `aria-live="polite"` (`Home.tsx`).
- Pulsanti di rimozione frase: `aria-label="Rimuovi questa frase"`.
- Dialog senza testo visibile: `DialogDescription` con classe `sr-only` (testo per screen reader non visibile a schermo).
- Barra di accessibilità: `role="toolbar"`, `aria-label`, `aria-pressed` sui toggle, `aria-live="polite"` sulla percentuale font.
- Il pallino colore nella legenda è `aria-hidden="true"`: l'informazione grammaticale è portata anche dall'etichetta testuale, non solo dal colore. Ogni voce della legenda porta inoltre il **complemento in forma di testo** (`compl` in `LEGEND_ITEMS`: SOGGETTO, COMPLEMENTO OGGETTO, PREDICATO VERBALE, esempi ET = E…), in grassetto maiuscolo nella versione chiara del colore del proprio caso (`lightenColor` in `shared/types.ts`): il significato non dipende mai dal solo colore e la legenda è identica in APP e PDF.
- **Voce verbale mai solo col colore**: i verbi passivi sono SOTTOLINEATI (linea nello stesso colore della parola) sia nell'app sia nel PDF, e la nota sotto la legenda («IL PREDICATO VERBALE SOTTOLINEATO = VOCE PASSIVA - IL PREDICATO VERBALE NON SOTTOLINEATO = VOCE ATTIVA», `LEGEND_VOICE_NOTE` in `shared/types.ts`, con solo il primo SOTTOLINEATO realmente sottolineato; nel PDF il font della nota si adatta automaticamente ai margini) porta l'informazione anche in forma testuale. La nota è inoltre CODIFICATA A DOPPIO SEGNALE: la parte della VOCE PASSIVA è in ROSSO (`VOICE_PASSIVE_COLOR` `#C62828`, incluso il SOTTOLINEATO sottolineato) e la parte della VOCE ATTIVA in VERDE (`VOICE_ACTIVE_COLOR` `#2E7D32`), sia nell'app sia nel PDF; il testo resta sempre leggibile anche senza colore (informazione portata da sottolineatura + testo + colore). `aria-label` della nota: «Voce verbale: verbo sottolineato = voce passiva; senza sottolineatura = voce attiva».
- Dialog di ritaglio foto (`CropDialog.tsx`, modale «Ritaglia la foto», senza sottotitolo né icona centrale; intera area selezionata trascinabile con mouse/touch, pan nei margini e fuori dalla selezione): le 4 barrette sui bordi e i 4 quadratini agli angoli sono `role="slider"` con `aria-label` (lato o angolo), `aria-valuenow` sulla dimensione del box, la zona «sposta in blocco» è un `role="group"` con `aria-label` e focus da tastiera con anello `focus-visible` ben visibile. Le **frecce direzionali** spostano la finestra di ritaglio senza mouse: 2% a pressione, Shift+frecce = 10%. I pulsanti **90°** hanno `aria-label` («Ruota la foto di 90 gradi a sinistra/destra»). La descrizione è riservata agli screen reader; non aggiungere istruzioni visibili sotto il titolo. Il progresso OCR è `role="status"` `aria-live="polite"`. **Guida completa dello scatto/ritaglio/OCR** (anche per replicarlo su altre app): [`OCR-FOTO.md`](OCR-FOTO.md).
- Le zone di presa del ritaglio sono ampie (44 px, bordi **e angoli**) e funzionano con mouse **e dita** (`touch-action: none` + pointer capture, così il gesto non compete mai con lo scroll della pagina); l'informazione sul ritaglio non è mai solo cromatica: le zone oscurate affiancano sempre il bordo tratteggiato bianco del box e l'intera area selezionata trascinabile (senza icona centrale). **Le foto piccole vengono ingrandite a schermo** verso 560 px sul lato lungo, nel limite della larghezza disponibile (`MIN_IMG_W` in `CropDialog.tsx`): le maniglie restano agibili anche su foto di poche decine di pixel e l'ingrandimento — solo visivo — non altera il taglio, calcolato in percentuale sull'originale.

**Legenda responsive — versione 8802.** In `LegendPanel` (`Home.tsx`) le singole etichette, i complementi e i sottotitoli usano `whitespace-nowrap`: SINGOLARE/PLURALE restano sulla riga del caso. La griglia passa da una a due a tre colonne e il font usa container query (`cqw`) sulla larghezza effettiva della voce, anche in iframe. I paragrafi di nota sotto la griglia possono andare a capo. Questo adattamento di layout non è una certificazione di leggibilità a qualunque zoom o con qualunque nuova stringa: per varianti linguistiche e tecnologie assistive servono verifiche specifiche.

### 2.11 PDF esportato in OpenDyslexic

**Cosa fa.** Il PDF della frase colorata viene generato **con il font OpenDyslexic** (`client/src/lib/export.ts` carica `/fonts/OpenDyslexic-Regular.ttf` e `-Bold.ttf` via `fetch` e li incorpora con pdf-lib): lo studente porta a casa (o stampa) un materiale leggibile quanto l'app. Parole grandi, in grassetto, lettere colorate, una frase per riga.

**Legenda PDF 8802.** La legenda resta su due colonne; `fitOneLine` in `export.ts` misura ogni etichetta/complemento/sottotitolo con il font realmente incorporato e ne riduce la dimensione entro i limiti impostati. SINGOLARE/PLURALE sono disegnati sulla stessa riga del caso e alla stessa dimensione nella voce. Il test in `export.test.ts` controlla le larghezze effettive. Non è una dichiarazione di PDF/UA: i PDF campione non sono taggati.

### 2.12 Preferenze persistenti

Le impostazioni di accessibilità (scala font, interlinea, righello, modalità) sono salvate in `localStorage` (chiave `lf_access`) a ogni modifica e ricaricate all'avvio: lo studente le imposta una volta e le ritrova a ogni visita, su tutte le pagine. La lettura è protetta da `try/catch` (storage non disponibile → default).

### 2.13 Embed accessibile (cornici iframe)

Le cornici dinamiche per Blogger/siti preservano l'accessibilità dell'app anche dentro un post. La versione ⭐ consigliata è `cornice-dinamica/embed-latino-facile-dedicata.html` (~18 KB, v3 impermeabile + anti-loop, dedicata a questa app): oltre all'altezza automatica include 🛡️ **isolamento tra istanze** (se il blog ha più cornici simili nella stessa pagina, ognuna mostra solo la propria app: id univoci con token, scoping DOM, filtro `e.source`) e 🛡️ **protezione anti-loop** (nessuna transizione CSS sull'altezza, debounce 200 ms, clamp 100–15000 px, conferma dei salti sospetti, congelamento dopo 3 crescite consecutive: l'iframe non si allunga a dismisura su mobile), pulsanti **Schermo intero** e **Ricarica** (sulla stessa riga del titolo, tutti centrati), spinner di caricamento e **stato online/errore** con pulsante Riprova (timeout 15 s) — pensati per l'uso in classe su LIM/proiettore. Esistono anche `embed-latino-facile-lite.html` (~5 KB, **riutilizzabile per altre app cambiando solo la riga `APP_URL`**), `embed-universale.html` (template generico) ed `embed-latino-facile.html` (versione autosufficiente, font incorporati in base64). Tutte condividono:

- **Font OpenDyslexic** anche nella cornice (caricati dall'app via CORS nella versione lite, incorporati in base64 nella versione autosufficiente).
- **Altezza automatica** dell'iframe tramite il protocollo `labvisivo:height` (`client/src/lib/heightSync.ts`): la pagina interna misura la propria altezza e la comunica al parent, che ridimensiona l'iframe — nessuna barra di scorrimento interna, nessun contenuto tagliato.
- La classe `lf-embedded` su `<html>` (messa da `heightSync.ts` quando l'app è dentro un iframe) azzera `min-h-screen`, così la pagina segue il contenuto e l'altezza misurata non crea loop di crescita.

### 2.14 Lettura ad alta voce (Ascolto → Leggi)

**Cosa fa.** Il quinto modulo della barra di accessibilità, **Ascolto**, legge ad alta voce **tutta la pagina** in italiano usando l'API Web Speech (`speechSynthesis`): è l'equivalente didattico della «lettura ad alta voce» fatta dall'insegnante, ed è la misura più utile per studenti con DSA. Il pulsante mostra **Leggi** (avvia) o **Stop** (interrompe).

**Come è implementato.**

- `client/src/hooks/useReadAloud.ts`: hook portato dall'app di riferimento (Widget Matematico / Equazioni Biquadratiche). Seleziona la **migliore voce italiana** disponibile (dà priorità alle voci neurali/naturali), legge **tutto il contenuto** della pagina attraversando i nodi di testo del DOM, e:
  - legge anche **etichette e valori dei campi di input** (Cognome, Nome, Data, Classe), con le **date in forma naturale** («01/09/2026» → «primo settembre duemilaventisei»);
  - converte le **parole MAIUSCOLE in minuscolo** (le voci TTS leggono le maiuscole con accenti sbagliati o lettera per lettera: «LATINO FACILE» → «latino facile»);
  - normalizza **esponenti e pedici Unicode** («x²» → «x al quadrato», «t₁» → «t uno»);
  - converte le formule LaTeX in italiano parlato (mantenuto per compatibilità: in Latino Facile non ci sono formule);
  - ignora toolbar, pulsanti, canvas e script (niente rumore);
  - divide il testo in frasi (max 220 caratteri) per pause naturali e robustezza sui browser.
- `AccessibilityToolbar.tsx`: il modulo **ASCOLTO** con icona altoparlante (`Volume2`) e pulsante Leggi/Stop (`aria-pressed`, `aria-label` dinamici).

**Come si riusa su un'altra app.** Copiare `useReadAloud.ts` nella propria cartella `hooks/` e importarlo nella barra (`const readAloud = useReadAloud()`), aggiungendo il modulo Ascolto con `onClick={readAloud.toggle}` e `{readAloud.speaking ? "Stop" : "Leggi"}`. Nessuna dipendenza npm: usa solo l'API nativa del browser.

---

## 3. Guida al riuso: come portare queste misure su un'altra app

> 📱 Nel **ritaglio foto** l'app dietro resta FERMA (`modal={true}`), mentre
> il corpo interno si scorre col dito. Viewport visibile nel blog, focus
> modale, maniglie touch 44 px e tastiera sono gestiti separatamente dallo
> scroll. ColorDialog non è stato modificato. Pattern attuale e test:
> [`SCROLLING-MOBILE.md`](SCROLLING-MOBILE.md).

> La repository di questa app è organizzata per rendere il riuso **diretto**: copia i file indicati, adatta colori/testi, e hai la stessa accessibilità. Con GitHub puoi anche creare un **template di partenza** (es. `web-app-accessibile-template`) da cui clonare nuove app.

### 3.1 Copia i file (mini-pacchetto accessibilità)

| File da copiare | Contenuto | Necessario per |
|---|---|---|
| `client/public/fonts/OpenDyslexic-*.{ttf,otf,woff2}` | I font (Regular, Bold, Italic, Bold Italic) | Font ad alta leggibilità |
| Blocchi `@font-face` in `client/src/index.css` | Dichiarazione dei font con `font-display: swap` | Font ad alta leggibilità |
| `client/src/contexts/AccessibilityContext.tsx` | Provider: stato, localStorage, righello, alto contrasto | Barra di accessibilità |
| `client/src/components/AccessibilityToolbar.tsx` | UI della barra (Font, Interlinea, Righello, Modalità, Ascolto) | Barra di accessibilità |
| `client/src/hooks/useReadAloud.ts` | Lettura ad alta voce (Web Speech API, voce italiana) | Barra di accessibilità (modulo Ascolto) |
| Regole `.lf-ruler-band`, `html.lf-ruler`, `html.lf-hc`, `--lf-scale`, `--lf-lh`, `:focus-visible`, `::selection`, `prefers-reduced-motion` in `client/src/index.css` | Tutti gli stili di accessibilità | Tutte le misure visive |
| Blocco CORS `/fonts` in `server/_core/index.ts` | `Access-Control-Allow-Origin: *` su `/fonts/*` | Embed cross-origin |
| `client/src/lib/heightSync.ts` | Protocollo `labvisivo:height` + classe `lf-embedded` | Embed iframe |
| `cornice-dinamica/embed-latino-facile-dedicata.html` | ⭐ Cornice completa (Schermo intero, Ricarica, stato online/errore, spinner, altezza dinamica, font via CORS) | Embed iframe (template consigliato) |

### 3.2 Passi di integrazione (checklist per sviluppatore o agente AI)

1. **Font**: copia la cartella `fonts/` nel tuo `public/`; incolla i quattro `@font-face` in cima al tuo `index.css`; aggiungi `"OpenDyslexic", "Cambria", ...` allo stack di `body`. Verifica con DevTools → Network che i font si carichino da `/fonts/`.
2. **Provider**: importa e avvolgi l'app: `<AccessibilityProvider>{/* la tua app */}</AccessibilityProvider>` (deve stare sopra il router, così le impostazioni valgono su tutte le pagine).
3. **Barra**: renderizza `<AccessibilityToolbar />` una volta, in cima al layout (fuori dal router ma dentro il provider). La barra è `w-fit mx-auto`, quindi si centra da sola. Per il modulo **Ascolto** copia anche `client/src/hooks/useReadAloud.ts` nella tua cartella `hooks/` (nessuna dipendenza npm: usa la Web Speech API del browser).
4. **CSS**: copia le regole di accessibilità (righello, alto contrasto, focus, riduzione movimento, selezione). Se usi Tailwind, le variabili `--lf-scale`/`--lf-lh` funzionano già con il tuo `index.css`; se non usi Tailwind, applica le stesse proprietà nel tuo CSS globale.
5. **Server (solo se hai un backend Express)**: aggiungi il middleware CORS `/fonts` così le cornici embed di terze parti possono usare i font.
6. **Persistenza**: il provider salva in `localStorage` da solo — nessuna configurazione extra.
7. **Embed (opzionale)**: se l'app va inserita in Blogger/siti, includi `heightSync.ts` (o copia il pattern del protocollo `labvisivo:height`) e crea la cornice a partire da `cornice-dinamica/embed-latino-facile-dedicata.html` (⭐ completa: Schermo intero, Ricarica, stato online/errore) oppure da `embed-latino-facile-lite.html` (minima).
8. **Controllo finale**: esegui la checklist di §4.

### 3.3 Adattare colori e testi

- I colori della barra sono definiti come costanti in `AccessibilityToolbar.tsx` (`groupCls`, `btnCls`, `activeBtnCls`), **identici alla barra di riferimento** (rilevati dai pixel della foto allegata): barra **bianco caldo `#fdfbf8`** con bordo `#dedbd6`, capsule gruppi **crema `#f5f0e6`** senza bordo, pulsanti **trasparenti** con bordo sottile `#dedbd6`, testo/icone **`#2e2118`** (marrone scuro caldo), anello di focus `#b71c1c` (solo tastiera). Sostituiscili con la palette della tua app.
- Il colore dell'anello di focus (`#b71c1c`) e della selezione (`::selection`) si cambiano in `index.css`.
- Le etichette «Font», «Interlinea», «Righello», «Modalità» sono testi normali: traducili o rinominali senza toccare la logica.

### 3.4 Consiglio: crea un template riusabile su GitHub

Per massimizzare il riuso, crea una repository `template` (su GitHub: Settings → **Template repository**) contenente: `AccessibilityContext.tsx`, `AccessibilityToolbar.tsx`, la cartella `fonts/`, le regole CSS di accessibilità e questo stesso `ACCESSIBILITA.md`. Ogni nuova app didattica potrà partire da **Use this template** e avere l'accessibilità già pronta. Lo stesso vale per il Blueprint `render.yaml` e la CI di `.github/workflows/ci.yml`, già inclusi in questa repo.

---

## 4. Checklist di verifica dell'accessibilità

Esegui questi controlli (manuali o automatici) prima di pubblicare un'app che riusa queste misure:

- [ ] Il font OpenDyslexic si carica (DevTools → Network → `/fonts/OpenDyslexic-Regular.ttf` → 200) e le pagine non mostrano «testo invisibile» (`font-display: swap` attivo).
- [ ] `Tab` muove il focus tra tutti i controlli; l'anello rosso di focus è ben visibile; `Invio` attiva chip, upload e pulsanti.
- [ ] `A−`/`A+` scala tutto il testo (da 80% a 160%); la percentuale viene annunciata (`aria-live`).
- [ ] Interlinea cicla 1.65 → 1.9 → 2.2 → 2.6 e il valore sul pulsante cambia.
- [ ] Righello ON mostra la banda gialla che segue il mouse; OFF la nasconde; non blocca i clic (`pointer-events: none`).
- [ ] Modalità Contrasto rende sfondi bianchi e aumenta il contrasto; il testo resta leggibile.
- [ ] Il pulsante "Ascolto → Leggi" legge ad alta voce la pagina in italiano (voce naturale); "Stop" interrompe la lettura.
- [ ] Riavviando il browser le preferenze sono ancora attive (`localStorage` → `lf_access`).
- [ ] Con «Riduci movimento» attivo nel sistema operativo, le animazioni sono quasi assenti.
- [ ] Screen reader (es. VoiceOver/NVDA): la barra si annuncia come «toolbar», i pulsanti hanno `aria-label`, i campi Cognome/Nome/Data/Classe hanno etichette.
- [ ] Il PDF esportato usa OpenDyslexic e le parole sono grandi, in grassetto, colorate, una frase per riga.
- [ ] Nell'embed (cornice iframe) l'altezza è automatica e il font è OpenDyslexic anche dentro la cornice.

---

## 5. Riferimenti

- **OpenDyslexic** — preservare le condizioni della versione effettiva: i binari inclusi riportano attribuzioni CC BY 3.0/Bitstream, non una generica attestazione OFL. Vedere [docs/LICENZE-E-RISORSE.md](docs/LICENZE-E-RISORSE.md) e i metadati incorporati.
- **WCAG 2.1/2.2** (W3C) — linee guida di riferimento: contrasto (1.4.3), ridimensionamento testo (1.4.4), focus visibile (2.4.7), navigazione da tastiera (2.1), `prefers-reduced-motion` (2.3.3).
- **L. 170/2010 e Linee Guida MIUR (DSA)** — contesto normativo italiano della didattica inclusiva.
- **tesseract.js, pdf-lib** — librerie usate per OCR e PDF (vedi `README.md`).
