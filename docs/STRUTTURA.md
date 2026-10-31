# Struttura del pacchetto esportabile

Lo ZIP contiene una sola cartella radice. Caricare su GitHub **il contenuto di quella cartella**, non un ulteriore livello di annidamento.

```text
latino-facile-app/
├── README.md, AGENTS.md             ingresso utente e agente IA
├── REBUILD.md, ADATTARE.md           copia identica / nuova app
├── RENDER.md, render.yaml            trasferimento GitHub → Render
├── ACCESSIBILITA.md                 misure e mini-pacchetto riutilizzabile
├── OCR-FOTO.md, SCROLLING-MOBILE.md  foto, riconoscimento e dialog mobile
├── PHOTO-CROP-CLONABILE.md           foglio autonomo, 18 sorgenti + hash
├── SKILLS-APP.md                     skill opzionali; nessuna dipendenza da esse
├── client/
│   ├── index.html                   ingresso Vite
│   ├── src/                         React, stili, PDF, foto e accessibilità
│   └── public/                      font, modello OCR, cornice servita, PDF storici
├── server/                          Express, tRPC, analizzatore e provider
├── shared/                          tipi, palette e legenda condivisi
├── drizzle/                         schema/migrazioni login opzionale, non dati
├── patches/                         patch Wouter referenziata dal lockfile
├── tests/                           test browser ripetibili
├── scripts/                         controlli, smoke, clone ed export autonomi
├── docs/
│   ├── STRUTTURA.md                  questa mappa
│   ├── CONFIGURAZIONE.md             variabili, rete, privacy e DB opzionale
│   ├── ESPORTAZIONE.md               controllo e rigenerazione ZIP
│   ├── LICENZE-E-RISORSE.md          provenienza e limiti delle licenze
│   ├── portabilita/                 esito e motivi del riordino
│   ├── storico/                     vecchie guide conservate, NON operative
│   └── photo-crop-mobile.png         riferimento visivo già incluso
├── cornice-dinamica/                 sorgenti HTML embed + test + font
├── .github/workflows/ci.yml          controlli automatici senza credenziali
├── .env.example                     sole variabili vuote e commenti
├── .gitignore, .dockerignore         esclusione file privati/locali
├── .node-version                    Node verificato
├── Dockerfile                       build multistadio alternativa
├── manifest.json                    metadati coerenti e mappa per strumenti
└── package.json, pnpm-lock.yaml      script e dipendenze riproducibili
```

## Separazioni importanti

- `client/public/quaderno-unico-v*.pdf`: **nove asset storici preservati**, non risultati salvati dagli studenti né un nuovo quaderno adattato. Restano ai loro percorsi per non rompere risorse già distribuite; nessun pulsante va ripristinato.
- `drizzle/`: contiene definizioni/migrazioni, **non un database esportato**. Non applicarle automaticamente nel build.
- `server/_core/` e diversi componenti UI: infrastruttura dello scaffold preservata; non eliminare file perché sembrano inutilizzati senza una richiesta e un test di dipendenze.
- `cornice-dinamica/`: sorgenti da incollare nel blog; `client/public/cornice-test/`: copie effettivamente servite. Non basta aggiornare una sola copia dopo un cambio dominio.
- `docs/storico/`: conserva il materiale precedente come testo; non caricarlo al posto di AGENTS/guide correnti in un nuovo adattamento.
- `.cache/`, `reports/`, `dist/`, `node_modules`, `.env`, database e ZIP generati sono locali e ignorati: **non appartengono alla consegna sorgente**.

Tutte le istruzioni correnti usano percorsi relativi e comandi dalla radice del progetto; non richiedono altre chat o accesso al progetto originale.
