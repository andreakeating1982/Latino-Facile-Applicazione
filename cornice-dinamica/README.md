# CORNICE DINAMICA — LATINO FACILE (embed per Blogger)

Questa cartella contiene la **cornice dinamica** dell'app LATINO FACILE: un blocco
HTML autonomo da incollare su Blogger (o su qualsiasi sito) che mostra l'app
dentro un iframe con **altezza automatica** e **font OpenDyslexic**.

## File contenuti

| File | Descrizione |
|---|---|
| `embed-latino-facile-dedicata.html` | ⭐ **Versione DEDICATA (~18 KB, v3 impermeabile + anti-loop)**: serve **solo** «Latino Facile» (URL fisso). 🛡️ **IMPERMEABILE**: funziona anche se il blog ha altre cornici simili nella stessa pagina — ogni istanza è un'isola (id univoci con token, scoping DOM, filtro `e.source`, nessuna app può apparire dentro l'iframe di un'altra). 🛡️ **ANTI-LOOP**: niente transizione CSS sull'altezza, debounce 200 ms, clamp 100–15000 px, conferma dei salti sospetti (>2× e >1000 px) e congelamento dopo 3 crescite consecutive — l'iframe non «si allunga a dismisura» su mobile. Layout: **titolo e pulsanti sulla stessa riga, tutti centrati**. Pulsanti **Schermo intero** e **Ricarica**, **spinner**, **stato online/errore** con Riprova (timeout 15 s), ping periodico + altezza al resize. Font OpenDyslexic via CORS. **La versione consigliata per questo blog.** |
| `test-impermeabile.html` | **Pagina di test**: simula il blog con 2 cornici + una cornice «estranea» che tenta il furto dell'iframe e posta altezze false. Apri il file in un browser per verificare che ogni cornice mostri solo la propria app (le istruzioni di verifica sono nella pagina). |
| `embed-latino-facile-lite.html` | **Versione leggera (~5 KB)**: font OpenDyslexic caricati dall'app via CORS. Codice piccolo e leggibile, ideale da incollare nel post. **Riutilizzabile**: per un'altra app basta cambiare la riga `APP_URL` (o passare `?app=URL` nella pagina). Richiede che l'app sia online. |
| `embed-universale.html` | **Template universale per altre app**: identico alla versione lite ma con URL segnaposto (`https://LA-TUA-APP.example.com/`). Copia il file, cambia `APP_URL` e `APP_TITLE` e incollalo dove vuoi. |
| `embed-latino-facile.html` | **Versione autosufficiente (~110 KB)**: font incorporati in base64. I soli font restano disponibili se l'app è offline; il contenuto dell'app richiede comunque un server raggiungibile. Non è un'app offline autosufficiente. |
| `../client/public/fonts/OpenDyslexic-Regular-v2.woff2` | Font Regular servito dall'app a `/fonts/OpenDyslexic-Regular-v2.woff2` (non una copia in questa cartella) |
| `../client/public/fonts/OpenDyslexic-Bold-v2.woff2` | Font Bold servito dall'app a `/fonts/OpenDyslexic-Bold-v2.woff2` (non una copia in questa cartella) |
| `fonts/OpenDyslexic-Regular.woff2` | Font OpenDyslexic Regular (copia senza suffisso, per compatibilità) |
| `fonts/OpenDyslexic-Bold.woff2` | Font OpenDyslexic Bold (copia senza suffisso, per compatibilità) |
| `README.md` | Questo file |

## Come si usa

1. Apri il post in Blogger e passa alla **vista HTML**.
2. Incolla l'intero contenuto di `embed-latino-facile-dedicata.html` (⭐ consigliata)
   oppure di `embed-latino-facile-lite.html` (minima) o di
   `embed-latino-facile.html` (autosufficiente).
3. Pubblica. L'iframe mostra l'app e si adatta da solo all'altezza del contenuto
   (desktop, tablet, cellulare).

## Riutilizzare la cornice per un'altra app

La cornice è **universale**: per usarla con un'altra app basta cambiare la riga
`APP_URL` nella sezione `⚙️ CONFIGURAZIONE` (e, facoltativamente, `APP_TITLE`).
Tutto il resto — iframe, font OpenDyslexic, altezza dinamica — si adatta da solo.

**Bonus (zero modifiche):** se l'URL è passato come parametro della pagina, ha la
precedenza su `APP_URL`:

```
https://tuosito.it/post?app=https://mia-altra-app.example.com/&title=LA MIA APP
```

- `app` (o `url`): l'URL dell'app da mostrare nella cornice
- `title`: (facoltativo) il titolo mostrato nella barra della cornice

Nota sui font: la cornice carica gli OpenDyslexic da `APP_URL/fonts/*`. Le app
della famiglia LabVisivo li servono con CORS abilitato; se l'app target non li
serve, si usano i font di riserva (Cambria/Georgia) senza alcun errore bloccante.

## Le versioni a confronto

| Caratteristica | `...-dedicata.html` | `...-lite.html` | `embed-latino-facile.html` |
|---|---|---|---|
| Dimensione | ~18 KB (v3 impermeabile + anti-loop) | ~5 KB | ~110 KB |
| Dedicata a Latino Facile | ✅ sì (URL fisso) | riutilizzabile (`?app=`) | riutilizzabile |
| Schermo intero / Ricarica | ✅ sì | solo «Apri» | solo «Apri» |
| Stato online/errore + Riprova | ✅ sì (timeout 15 s) | no | no |
| Spinner di caricamento | ✅ sì (con `prefers-reduced-motion`) | no | no |
| Font OpenDyslexic | via `/fonts/*` (CORS) | via `/fonts/*` (CORS) | incorporati in base64 |
| App online richiesta | sì (font + contenuto) | sì (font + contenuto) | solo per il contenuto |
| Vantaggio | completa, dedicata, impermeabile, anti-loop, stato incluso | codice minimo e leggibile | font incorporati; app comunque richiesta online |

## 🛡️ Impermeabilità: perché ora ogni cornice vede solo la propria app

Prima (v1/v2) le cornici usavano **id fissi** (`lfIframe`, `lfCornice`) e
`document.getElementById` globale: se il blog aveva **più cornici simili nella
stessa pagina** (es. più post con app della stessa famiglia LabVisivo), gli
script si agganciavano al **primo** iframe trovato — e dentro una cornice
compariva l'app dell'altra. In più ogni cornice ascoltava **tutti** i messaggi
`postMessage` della pagina e applicava altezze arrivate da altre app.

La v3 rende ogni cornice **impermeabile e non comunicante**:

1. **Scoping DOM per istanza**: lo script trova il PROPRIO `<div class="lf-cornice">`
   risalendo da `document.currentScript` (non più per id globale).
2. **Id univoci con token**: a runtime gli id vengono rinominati con un suffisso
   casuale (`lfIframe-lf5ebjz6da`…). Nessun'altra cornice che cerchi `lfIframe`
   può più agganciare i nostri elementi (e viceversa).
3. **Filtro `e.source`**: il listener accetta messaggi **solo** se arrivano dal
   PROPRIO iframe (`e.source === iframe.contentWindow`). I messaggi di altezza
   delle altre app vengono ignorati.
4. **Token `cornice`**: l'URL dell'iframe porta `?cornice=<token>`; l'app lo
   rispecchia nei messaggi (`heightSync.ts`) e la cornice rifiuta token altrui.
5. **Ping sicuro**: in uscita usa `'*'` (destinatario = nostro iframe, sicuro)
   e in ricezione filtra per `e.source` + token.
6. **CSS scoped**: tutte le regole usano la classe `.lf-cornice` — nessun
   selettore globale che possa toccare il layout del blog o di altre cornici.

Puo' incollare la stessa cornice in **più post della stessa pagina**: ogni
istanza resta indipendente.

## Come funziona l'altezza dinamica

- L'app (dentro l'iframe) misura la propria altezza reale e la invia al genitore
  con un messaggio: `{ type: "labvisivo:height", height: <numero> }`.
- Il codice dell'app che fa questo è in `../client/src/lib/heightSync.ts`
  (inizializzato da `../client/src/main.tsx`).
- La cornice ascolta i messaggi e imposta `iframe.style.height`.
- La cornice invia anche un "ping" (`{ type: "labvisivo:ping", cornice: <token> }`)
  dopo il caricamento per richiedere l'altezza: l'app risponde con la sua
  altezza rispecchiando il token (gestore in `heightSync.ts`).
- **Fix anti-loop (app)**: quando l'app è dentro un iframe aggiunge la classe
  `lf-embedded` a `<html>` e disattiva `min-h-screen`/`min-h-dvh`
  (vedi `../client/src/index.css`), così l'altezza misurata non dipende più
  dall'altezza dell'iframe (niente crescita infinita).
- **Fix anti-loop (cornice, v3)**: anche lato cornice l'altezza viene
  stabilizzata con 4 difese (vedi il codice in `applicaAltezza()`):
  1. **Niente transizione CSS** sull'altezza dell'iframe (durante
     l'animazione l'app misura altezze intermedie e le rinvia → il loop si
     auto-amplifica);
  2. **Debounce 200 ms**: l'altezza è applicata solo quando l'app smette di
     inviare per ~200 ms (layout stabilizzato);
  3. **Clamp di sanità**: valori < 100 px o > 15000 px ignorati;
  4. **Conferma dei salti sospetti**: una crescita > 2× (e > 1000 px)
     rispetto all'ultima altezza applicata è accettata SOLO se l'app
     conferma rinviando lo STESSO valore entro 2 s (un loop divergente
     invia valori sempre diversi → mai confermato → l'iframe resta fermo).
     In più, 3 crescite consecutive congelano gli aggiornamenti per 5 s
     (anti-loop graduale).

## CORS sui font

Per la versione leggera il server dell'app risponde a `/fonts/*` con
`Access-Control-Allow-Origin: *` (aggiunto in `../server/_core/index.ts`).
Senza questo header il browser bloccherebbe il `@font-face` cross-origin quando
la cornice è su un dominio diverso (Blogger).

## Come ricostruire la cornice (per l'IA o a mano)

0. **Nuova app, zero modifiche al codice**: parti da `embed-universale.html`
   (template con URL segnaposto), imposta `APP_URL` (e, facoltativo, `APP_TITLE`)
   nella sezione `⚙️ CONFIGURAZIONE` e incolla il file dove vuoi. L'iframe, i
   font OpenDyslexic e l'altezza dinamica derivano tutti da `APP_URL`: non c'è
   altro da cambiare. In alternativa, puoi passare `?app=URL&title=NOME` come
   parametri della pagina senza toccare il file.
1. **URL dell'app (file esistenti)**: nei file HTML cerca `https://latino-facile-app-2.easy-peasy.site`
   e sostituiscilo con l'URL di produzione aggiornato (stessa cosa per eventuali
   altri domini).
2. **Font (versione autosufficiente)**: i WOFF2 incorporati provengono dai TTF in
   `../client/public/fonts/OpenDyslexic-Regular.ttf` e
   `OpenDyslexic-Bold.ttf`.

   **Nota**: la versione lite punta ai file `OpenDyslexic-Regular-v2.woff2` e
   `OpenDyslexic-Bold-v2.woff2` (suffisso `-v2`) perché il suffisso cambia
   l'URL e quindi bypassa la cache CDN/Cloudflare: la prima richiesta passa
   dal server Express che aggiunge l'header CORS. Se sostituisci i font,
   cambia anche il suffisso (es. `-v3`) per evitare la cache. Per rigenerarli:
   ```bash
   pip install fonttools brotli
   python3 -c "
   from fontTools.ttLib import TTFont
   for n in ['OpenDyslexic-Regular', 'OpenDyslexic-Bold']:
       f = TTFont(f'{n}.ttf'); f.flavor = 'woff2'; f.save(f'{n}.woff2')
   "
   ```
   Poi sostituisci le stringhe base64 nel file HTML:
   ```bash
   base64 -w0 OpenDyslexic-Regular.woff2   # → incolla in src data:font/woff2;base64,...
   base64 -w0 OpenDyslexic-Bold.woff2      # → incolla in src data:font/woff2;base64,...
   ```
3. **Perché base64 (versione autosufficiente)?** Incorporando i font la cornice
   funziona ovunque anche senza CORS o con l'app momentaneamente offline.
   La versione leggera invece sfrutta il CORS di `/fonts/*` per restare minima.

## Accessibilità dell'embed

La cornice preserva l'accessibilità dell'app anche dentro un post: font
**OpenDyslexic** anche nella cornice (via CORS nella versione lite, in base64 in
quella autosufficiente), **altezza automatica** dell'iframe (protocollo
`labvisivo:height`, nessun contenuto tagliato) e pagina interna senza
`min-h-screen` quando è in embed (classe `lf-embedded`). Il recap completo delle
misure di accessibilità dell'app è in [`../ACCESSIBILITA.md`](../ACCESSIBILITA.md)
(§2.13 Embed accessibile; §3 guida al riuso su altre app).

## Note di stile

- La cornice riprende i colori dell'app: sfondo carta `#f8f1e4` **uniforme**
  (stesso colore di pagina e header; la barra di accessibilità interna
  all'app è bianco caldo `#fdfbf8` con capsule crema `#f5f0e6`, bordi
  `#dedbd6`, testo `#2e2118`), bordo morbido
  `rgba(46,32,24,.15)` + ombra leggera, titolo inchiostro `#2e2018` e link
  "Apri ↗" in alto a destra.
- Il titolo "LATINO FACILE" è in **OpenDyslexic Bold** (17px, letter-spacing 2px),
  lo stesso font usato in tutta l'app (vedi `../client/src/index.css`).
