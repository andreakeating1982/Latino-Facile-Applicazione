# Rilascio mobile di Latino Facile — 28 ottobre 2026

## Versione inclusa nel pacchetto

- **Produzione:** deploy **8731**, stato attivo al momento della verifica.
- **URL:** https://latino-facile-app-2.easy-peasy.site
- **Commit del codice pubblicato:** `3a4159402cb0f674ca2e269007d4cfcefe86bedd`.
- Lo ZIP contiene lo stesso codice applicativo, con guide e manifest aggiornati
  dopo il rilascio. Il commit dell'archivio è registrato da `git archive` nel
  commento ZIP. Questo aggiornamento documentale NON è un nuovo deploy.

## Correzione compresa

Il ritaglio foto tiene ferma l'app sottostante e permette di scorrere
all'interno della finestra col dito. Anche nel blog con iframe ad altezza
automatica, la finestra segue la parte realmente visibile sul telefono.
Solo titolo **RITAGLIA LA FOTO** e foto scorrono, senza istruzioni sotto.
Quattro comandi RUOTA SINISTRA/DESTRA, CHIUDI e RITAGLIA in UN riquadro
centrato, tutti marroni e compatti. Nessun AZZERA né icona centrale.
Trascinare l'interno della selezione in ogni direzione con dito o mouse;
scroll sui margini e zone esterne alla selezione. Pointer capture sul
wrapper stabile e delta incrementali eliminano la zona morta di inversione
ai limiti (difetto riprodotto nel precedente 8730).

La correzione NON richiede di sostituire il codice embed già incollato nel
blog. Il ColorDialog delle parole, la colorazione grammaticale, la traduzione
e il PDF non sono stati modificati dal solo fix del trascinamento.
Sono comprese le modifiche del 8730: ALTRI MODI VERBALI marrone #795548
in analisi/legenda/palette/PDF, verde ACCUSATIVO invariato. `confirm()` e la
libreria di geometria `cropBox.ts` sono rimasti invariati nella correzione.

## File che devono viaggiare insieme

| File | Funzione |
|---|---|
| `client/src/components/CropDialog.tsx` | Dialog modale, corpo scorrevole, piedino e gesti |
| `client/src/hooks/useCropDialogViewport.ts` | Lock ripristinabile e viewport visibile, anche cross-origin |
| `client/src/index.css` | Regole `.lf-crop-*`, griglie touch, safe-area |
| `client/src/lib/heightSync.ts` | Sospensione resize durante `data-lf-crop-open`, ripresa dopo `lf:crop-closed` |
| `tests/crop-mobile.e2e.mjs` | Nove scenari senza chiamate IA reali |
| `tests/crop-drag.e2e.mjs` | Quattro scenari dedicati: otto maniglie, inversione, quattro direzioni, capture/cancel |
| `PHOTO-CROP-CLONABILE.md` | Foglio autonomo con 18 file testuali incorporati, per trapianto in altra app |
| `SCROLLING-MOBILE.md` | Contratto, motivazione, limiti e prove |

Non ricostruire il comportamento copiando solo il componente. Le vecchie
indicazioni `modal={false}` riferite al ritaglio sono superate; leggere
`SCROLLING-MOBILE.md` prima delle note storiche nelle altre guide.

## Verifiche del rilascio

Typecheck e build riusciti; **64/64 test unitari** superati. **9/9 scenari
end-to-end** superati in anteprima e poi ripetuti contro il sito pubblico:

| Scenario | Esito |
|---|---|
| Telefono 320×568 | Superato |
| Telefono 393×780 | Superato |
| Orizzontale 740×360 | Superato |
| Blog cross-origin su schermo stretto | Superato |
| Blog cross-origin su schermo normale | Superato |
| Blog cross-origin già scorso | Superato |
| Alto contrasto nel blog | Superato |
| Cambio orientamento a finestra aperta | Superato |
| Desktop con tastiera | Superato |

Altri **4/4 scenari drag** (320px, 393px, iframe cross-origin già scorso,
desktop mouse) sono passati anche sul pubblico, per 143 controlli. I nove
scenari generali hanno 201 controlli. Kit standalone: 6/6 scenari, typecheck
E build, senza analizzatore/backend di Latino Facile.

Le prove verificano: finestra e pulsanti entro lo schermo, swipe interno,
nessuno scroll trascinato su app/blog dai gesti interni, drag maniglie,
rotazione, cornice stabile, chiusura/ripristino stili e conferma del taglio.

**Limiti:** touch emulato in Chromium, non telefono fisico iOS/Android;
canvas di conferma reale, risposta OCR simulata. Non è una misurazione di
accuratezza OCR o grammaticale e non è una certificazione completa di
accessibilità. Non può bloccare tocchi iniziati sul blog fuori dall'iframe
cross-origin. I test non inviano immagini a servizi IA.

## Ripetere le verifiche (per sviluppatori)

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm exec vitest run --no-file-parallelism
pnpm build
pnpm exec playwright install chromium
# Con pnpm dev già in esecuzione sulla porta 3000:
node tests/crop-mobile.e2e.mjs
node tests/crop-drag.e2e.mjs
# In alternativa, contro il sito pubblico:
CROP_QA_BASE_URL=https://latino-facile-app-2.easy-peasy.site \
CROP_QA_OUTPUT=/tmp/latino-mobile-qa node tests/crop-mobile.e2e.mjs
CROP_DRAG_BASE_URL=https://latino-facile-app-2.easy-peasy.site \
CROP_DRAG_OUTPUT=/tmp/latino-drag-qa node tests/crop-drag.e2e.mjs
```

Per ricostruzione identica: `REBUILD.md`; per varianti: `ADATTARE.md`; per
GitHub/Render: `RENDER.md`; per riuso accessibilità: `ACCESSIBILITA.md`.
Le credenziali non sono incluse: configurare privatamente l'ambiente dal
modello `.env.example`. Non eseguire reset o migrazioni distruttive su un
database con dati per il solo fatto di ricostruire l'app.

