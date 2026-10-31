# Riordino tecnico del pacchetto — 29 ottobre 2026

## Ambito

Sorgente applicativa: Latino Facile, produzione **8754**, commit `5fbfc61fc64036b442bca07703162cd70f1d28a3`. Baseline autonoma del cropper: **8731**. Il riordino riguarda documentazione, configurazione e strumenti di clonazione/esportazione; **non pubblica un nuovo sito e non modifica UI, analizzatore, generazione PDF, `confirm()` o geometria del ritaglio**.

## Problemi individuati e correzioni

| Prima | Ora |
|---|---|
| Guide incrementali con limiti 200 parole/400 caratteri, vecchi colori e istruzioni contrastanti | Guide correnti consolidate sul codice; testi precedenti conservati separatamente come archivio non operativo |
| Descrizione di `AppFooter.tsx`/`PDF_LINK` o pulsanti quaderno non presenti | Mappa file reale; nessun invito a reintrodurli |
| Indicazione errata che il database servisse alla traduzione IA | Chiave IA e login PostgreSQL distinti; DB opzionale soltanto per auth |
| Generico Node 22+ mentre `pdfjs-dist` richiede almeno 22.13.0 nel ramo 22 | `.node-version`, CI, Blueprint e Docker allineati a 22.22.2; minimo esplicitato |
| Dockerfile Node 20 che presumeva `dist/` già presente e rimuoveva la patch | Alternativa multistadio dai sorgenti con lock/patch e runtime non root |
| `autoDeploy: true` presentato erroneamente come blocco dopo CI | `autoDeployTrigger: checksPass`, documentato secondo lo schema ufficiale |
| CI poteva accettare zero test; nessun avvio del bundle esportato | Suite obbligatoria e smoke di produzione senza segreti/DB |
| Strumenti export presenti solo nelle skill, legati a path/storia Git originale | Script inclusi nel repository; verifica e riesportazione anche da nuova storia Git |
| Copia/adattamento descritto come semplice cambio di lingua | Cloner controllato, bozza esplicita, contratto reale e checklist di adattamento linguistico completo |
| Assunzione «niente CDN/offline» per tutto l'OCR | Distinzione dati locali, worker/core predefiniti e servizi esterni |
| Licenza font indicata genericamente OFL | Metadati dei file effettivi preservati; avvertenza su CC BY/Bitstream e risorse terze |

## Prove richieste dalla consegna

Gli esiti effettivamente eseguiti sono riassunti in [VERIFICHE-2026-10-29.md](VERIFICHE-2026-10-29.md). Il rapporto finale allegato allo ZIP registra anche commit, checksum e limiti della consegna. I controlli ripetibili sono descritti in [ESPORTAZIONE](../ESPORTAZIONE.md) e [REBUILD](../../REBUILD.md).

- Installazione/build da archivio estratto e store indipendente.
- Typecheck, suite unitaria e avvio produzione reale.
- Asset pubblici confrontati per hash, font CORS, gzip OCR e API di base.
- Runtime con sole dipendenze di produzione.
- Clone controllato, rifiuto di sovrascrittura e riesportazione da repository indipendente.
- Collegamenti/risorse, schema Render ufficiale, CRC e hash dell'archivio.
- Collaudo browser pertinente, distinguendo API simulate, canvas reale e touch emulato.

## Limiti da non nascondere

- Nessun nuovo deploy su Easy-Peasy, GitHub o Render in questa attività.
- Nessun account, chiave o database reale trasferito o usato nel collaudo isolato.
- Nessuna nuova misura esaustiva di grammatica, traduzione, OCR reale o efficacia BES.
- Nessuna nuova certificazione WCAG/PDF-UA, privacy, sicurezza o licenze.
- Il Blueprint può essere validato strutturalmente senza creare risorse: disponibilità dell'account, piano, dominio e rete vanno verificati al deploy reale.
- Docker non è disponibile nell'ambiente di questo riordino: Dockerfile rivisto e stadi Node/sole dipendenze verificabili, ma **nessun `docker build/run` dichiarato eseguito**.
- Il cloner crea una bozza funzionante della sorgente con identità separata, non una nuova lingua già corretta.

I PDF statici storici, i font, i dati OCR, i test esistenti e tutti i sorgenti applicativi restano conservati.
