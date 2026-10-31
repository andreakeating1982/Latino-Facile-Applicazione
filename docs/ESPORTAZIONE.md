# Controllare e rigenerare il pacchetto ZIP

Tutti gli strumenti sono inclusi in `scripts/`: non richiedono skill installate, vecchie chat o percorsi del progetto originale. Node serve all'app; Bash, Git e Python 3.10+ soltanto all'esportazione avanzata.

## Versione sorgente corrente: 8802

Questo pacchetto deriva dalla produzione **8802**, codice `c9b23f54a307927397b664d93caef68975788c50`; [RILASCIO-8802.md](../RILASCIO-8802.md) documenta legenda, commit e hash delle risorse online. Il commit dello ZIP può essere successivo per sole guide/metadati: lo identifica il rapporto esterno. La baseline indipendente del cropper resta 8731. Non usare il vecchio collaudo del 29 ottobre come una nuova misura della versione attuale.

La configurazione Docker della 8802 ammette `dist/` nel contesto di build Cloud Run. **L'archivio sorgente continua a non contenerla**: sono Git e il verificatore ZIP, non `.dockerignore`, a governare l'esportazione. Questo aggiornamento non effettua deploy o upload a GitHub.

## 1. Controllo prima dell'export

Dalla cartella contenente `package.json`:

```bash
corepack pnpm package:check
corepack pnpm test:package
corepack pnpm check
corepack pnpm test:ci
corepack pnpm build
corepack pnpm smoke
```

`package:check` verifica file necessari, script/metadati, pin ambiente, link locali attivi, patch, `.env.example` vuoto, configurazione CI/Render/Docker, dati OCR reali, copie della cornice e 18 sorgenti/hash del foglio cropper. Non chiama servizi esterni né legge il `.env` reale.

`smoke` avvia e termina un proprio processo di produzione con ambiente ristretto, porta libera e `.env` disabilitato. Controlla anche l'hash dei file effettivamente serviti: il fallback della SPA potrebbe altrimenti mascherare un asset mancante con HTTP 200.

Questi controlli non misurano accuratezza grammaticale generale, OCR di foto reali, efficacia BES o conformità normativa. Per modifiche funzionali/UI eseguire anche le prove specifiche di [REBUILD.md](../REBUILD.md).

## 2. Salvare un commit pulito

```bash
git status --short
# Rivedere il diff e aggiungere soltanto i file desiderati.
git add PERCORSI_DA_INCLUDERE
git commit -m "Descrizione della versione esportabile"
git status --short  # deve essere vuoto
```

Non cancellare file utente per ottenere un albero pulito. Lo script rifiuta modifiche/staging/untracked non ignorati: non esporta una versione a metà e non usa `git reset`. Le cache ignorate non entrano nello ZIP.

Se la cartella deriva dallo ZIP e non ha `.git`, creare una **nuova** repository locale e un primo commit. Non è richiesto recuperare la storia Git o il vecchio commit di produzione.

## 3. Generare archivio, rapporto e checksum

```bash
bash scripts/export-package.sh ../latino-facile-sorgenti.zip
# Oppure: corepack pnpm export:zip -- ../latino-facile-sorgenti.zip
```

L'output deve essere **fuori dalla repository** e non deve esistere già: lo script non sovrascrive una consegna precedente. Senza argomento viene proposto un nome esterno derivato da pacchetto/data/commit.

Vengono prodotti:

- `nome.zip`: contenuto di `git archive HEAD` con singolo prefisso uguale al nome pacchetto;
- `nome.zip.verifica.json`: rapporto tecnico e SHA-256 di tutti i file;
- `nome.zip.sha256`: checksum dell'archivio.

Il rapporto resta esterno per non creare una catena autoreferenziale di hash. Lo ZIP contiene solo sorgenti e risorse committati: non `.git`, `.env`, `node_modules`, `dist`, database, log, cache, chiavi o ZIP generati.

## 4. Ripetere il controllo dello ZIP

```bash
python3 scripts/verify-package.py \
  --repo . \
  --archive ../latino-facile-sorgenti.zip \
  --report ../latino-facile-sorgenti.zip.verifica.json
```

Il verificatore controlla CRC, percorsi sicuri, assenza di duplicati/link simbolici, contenuto dei file con SHA-256, corrispondenza completa a HEAD, commento commit, file necessari, metadati e sorgenti/hash del cropper. Fallisce se trova file privati o firme note di credenziali; è una scansione prudenziale, **non un audit di sicurezza completo**.

Quando è disponibile il commit storico della produzione sorgente, registra separatamente il confronto dei file applicativi `client/`, `server/`, `shared/` e le differenze di configurazione. Se quel commit non esiste nella nuova repository GitHub, il confronto storico è dichiarato **non disponibile**, non un falso errore di esportazione. Le prove della nuova versione vanno comunque rieseguite.

## 5. Ricostruzione da zero prima di una consegna importante

1. Estrarre lo ZIP in una cartella nuova, senza `.env` o dati reali.
2. Installare con `--frozen-lockfile --prod=false`, possibilmente con uno store pnpm separato.
3. Eseguire struttura, typecheck, test, build e smoke dalla copia estratta, non soltanto dalla directory di sviluppo.
4. Provare una copia con **sole dipendenze di produzione** e il build creato: il server non deve richiedere Vite/tsx per avviarsi.
5. Provare clone in una destinazione nuova e nuova esportazione dopo un primo commit indipendente, senza ereditare il `.git` originale.
6. Verificare i file serviti e i PDF prodotti, non soltanto che l'archivio sia apribile.

Non avviare migrazioni, reset, seed o deploy per provare la portabilità. Per Render vedere [RENDER.md](../RENDER.md). Un archivio pronto al deploy non significa che il servizio remoto sia già stato creato o verificato.
