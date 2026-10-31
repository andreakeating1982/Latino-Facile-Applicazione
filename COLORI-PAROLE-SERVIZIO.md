# Parole di servizio — nuova palette (29 ottobre 2026)

> **Nota storica sulla palette introdotta con il deploy 8754.** La produzione corrente è **8802**: [RILASCIO-8802.md](RILASCIO-8802.md). Palette e regole qui descritte sono preservate; i controlli elencati sotto si riferiscono al rilascio 8754, non a un nuovo collaudo del pacchetto corrente.

**Rilascio palette documentato: deploy 8754 del 29/10/2026.**
URL: https://latino-facile-app-2.easy-peasy.site
Codice del rilascio: `5fbfc61fc64036b442bca07703162cd70f1d28a3`.
Verifica post-deploy: endpoint reale `latino.analyze` HTTP 200 con Nunc blu,
in grigio chiaro, et grigio scuro; ripetuti sul pubblico 2/2 scenari UI
(API IA simulate), 6 PDF reali scaricati e 4/4 scenari drag foto.
Gli aggiornamenti documentali successivi non cambiano il runtime pubblicato.

| Categoria | Nuova tinta | Hex | Scritte dei chip |
|---|---|---|---|
| AVVERBI | Blu intenso invariato | #0057D9 | Chiare |
| PREPOSIZIONI | Grigio chiaro | #BDBDBD | Scure |
| CONGIUNZIONI | Grigio scuro | #4A4A4A | Chiare |

Richiesta finale: conservare il blu approvato e sostituire petrolio/oliva
con due grigi molto diversi. Il contrasto fra i due grigi è **4,72:1**;
le scritte dei chip contrastano rispettivamente 8,37:1 e 8,34:1.

I vecchi grigi #757575 e #455A64 non identificano più queste tre categorie.
Interiezioni/particelle/punteggiatura non incluse nella richiesta restano
invariate. Nessuna modifica ai sei casi, sfumature di numero, modi verbali,
ritaglio foto, classificazione grammaticale o pipeline OCR.

## Fonte e propagazione

- `SERVICE_COLORS` in `shared/types.ts` → POS_COLORS → optionColor e ruoli IA.
- LEGEND_ITEMS → legenda app, palette manuale e legenda PDF.
- I chip e le parole PDF usano i colori dell'analisi o la scelta manuale.
- `colorForEnclitic`: nel PDF -cum prende il grigio chiaro delle preposizioni,
  -que/-ve/-ne il grigio scuro delle congiunzioni, anche con vecchi dati.
- Il solo testo PDF chiaro mantiene fill #BDBDBD e contorno 0,35pt #595959;
  nessuno sfondo, nessuna rasterizzazione o duplicazione dei caratteri.
  q/Q isolano lo stato: gli altri colori non ereditano il contorno. Vale
  anche per override manuali e -cum; sottolineatura chiara resa visibile.
- Campione chiaro PDF bordato; `legendExplanationColor` rende leggibili le
  didascalie dei due grigi invece di schiarirle. Chip chiari con scritte scure,
  anche quando si ricolora una parola sconosciuta; nero originale invariato.
- Nell'app suffissi attaccati, base e inversione nero/bianco restano invariati.
- Il PDF interessato è quello GENERATO dal pulsante SCARICA IL PDF. File PDF
  già scaricati e quaderni statici storici non vengono riscritti.

## Verifiche

- `pnpm check`, `pnpm build`, 84/84 test unitari.
- `server/analyzer/serviceColors.test.ts`: fonte unica, motore e ruoli IA,
  tre tinte diverse dai casi/modi/sfumature, contrasto e suffissi.
- `client/src/lib/export.test.ts`: colori nei comandi PDF reali, palette
  manuale, rettangoli legenda e suffissi da dati vecchi.
- `tests/service-colors.e2e.ts`: desktop e mobile emulato, chip, legenda,
  palette, evidenziazione unica, override su un nome senza risfumatura,
  modalità lettura, suffix UI, parole sconosciute ricolorate, download dal
  pulsante reale (automatico/manuale chiaro/manuale scuro), errori JS.
- Verifica indipendente dei PDF scaricati: colori RGB effettivi delle parole,
  suffissi e rettangoli di legenda; contorni solo su grigio chiaro e senza
  propagazione alle altre parole, testo entro margini orizzontali. Sei PDF
  controllati: tre esportazioni per ciascuno di desktop e mobile emulato.
- `tests/crop-drag.e2e.mjs`: 4/4 scenari ripetuti, crop invariato.

Il solo fill grigio chiaro NON raggiunge 4,5:1 sul bianco (1,88:1): non
spacciarlo per un colore d'inchiostro accessibile da solo. Per questo viene
aggiunto un contorno leggibile (7,00:1 su bianco). Blu e grigio scuro non
richiedono questo adattamento. Le scritte adattate dei chip hanno contrasto
>=4,5:1. Non è una garanzia di distinguibilità per ogni persona, daltonismo
o schermo/stampa. Le etichette grammaticali
rimangono presenti; questo non certifica l'accessibilità dell'intera app.
API IA simulate per il collaudo UI; nessuna nuova misura di accuratezza
linguistica. Touch emulato, non test su telefono fisico.

```bash
pnpm check
pnpm exec vitest run --no-file-parallelism
pnpm build
# con server locale attivo:
pnpm exec tsx tests/service-colors.e2e.ts
node tests/crop-drag.e2e.mjs
```

