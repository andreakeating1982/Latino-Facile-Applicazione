# ZIP → GitHub → Render

Questa procedura trasferisce i sorgenti di Latino Facile su un **Web Service Node**. Non crea un sito statico e non pubblica l'app originale automaticamente. Il Blueprint incluso non crea database e non esegue migrazioni/seed.

## 1. Preparare la repository GitHub

1. Estrarre lo ZIP. Entrare nella cartella `latino-facile-app/` (oppure il nome della propria variante).
2. Verificare che `package.json`, `pnpm-lock.yaml`, `.node-version`, `render.yaml`, `client/`, `server/`, `shared/` e `patches/` siano **direttamente in questa cartella**.
3. Creare su GitHub una repository vuota, pubblica o privata. Non precompilarla con un altro README/lockfile.
4. Pubblicare **i file estratti**, inclusi `.github`, `.gitignore`, `.dockerignore`, `.node-version` e `.env.example`. Non caricare il solo ZIP o un `node_modules` locale. Non aggiungere `.env`.

```bash
# Dalla cartella che contiene direttamente package.json:
git init
git add .
git status --short  # controllare che nessun segreto sia tracciato
git commit -m "Import app con guide e configurazione portabile"
git branch -M main
git remote add origin URL_DELLA_PROPRIA_REPOSITORY_GITHUB
git push -u origin main
```

Se si usa il caricamento web di GitHub, controllare esplicitamente i file nascosti: alcuni strumenti non li selezionano insieme agli altri. Se Git è già configurato non ripetere `git init`/`remote add` e non sovrascrivere remote o storia esistenti.

Prima di collegare la destinazione, la scheda **Actions** deve mostrare la CI del commit caricato. Per una variante scegliere un nome di servizio Render distinto per non modificare un'app esistente.

## 2. Creare il servizio dal Blueprint

Da Render scegliere **New → Blueprint**, collegare la repository e selezionare il ramo desiderato. Il file [render.yaml](render.yaml) contiene:

| Impostazione | Valore |
|---|---|
| Tipo | Web Service |
| Runtime | Node |
| Node | `22.22.2` |
| pnpm | `10.4.1`, da `packageManager` con hash |
| Build | `corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm build` |
| Avvio | `node dist/index.js` |
| Ambiente | `NODE_ENV=production` |
| Health check | `/_health` |
| Deploy automatico | `autoDeployTrigger: checksPass` |
| Database | Nessuno obbligatorio |

`--prod=false` è intenzionale: Vite, esbuild, TypeScript e gli strumenti di build sono tra le dipendenze di sviluppo, anche quando `NODE_ENV=production`. Non eliminare patch o lockfile per risolvere un errore d'installazione.

Il Blueprint specifica il piano/area iniziali; verificarne disponibilità e limiti nel proprio account prima di confermare. Non serve una cartella `dist` caricata su GitHub. Il pulsante finale di creazione avvia una pubblicazione reale e va usato solo quando la si desidera.

**Alternativa manuale:** New → Web Service → scegliere runtime Node e compilare gli stessi campi. Root Directory: **vuota**, se `package.json` è in radice. Se esiste un monorepo, indicare invece la cartella che contiene quei file, non `client/`.

## 3. Configurare le variabili

Nella scheda **Environment** aggiungere solo ciò che si desidera usare:

| Variabile | Serve per |
|---|---|
| `EASY_PEASY_API_KEY` | Foto IA, traduzione e verifica/colorazione con IA; **non richiede DB** |
| `DEEPL_API_KEY` | Provider alternativo di traduzione già previsto dal codice |
| `DATABASE_URL` | PostgreSQL per il login opzionale |
| `BETTER_AUTH_SECRET` | Sessioni, solo se si usa il login; il Blueprint genera un valore |
| `TRUSTED_ORIGINS` | Origini attendibili del login, es. il dominio finale; non abilita da sola login o CORS font |
| `GOOGLE_CLIENT_*` / `GITHUB_CLIENT_*` | Soltanto eventuali provider OAuth configurati separatamente |

Non impostare manualmente `PORT`: Render la fornisce e il server ascolta su `0.0.0.0`. Non usare chiavi in variabili `VITE_*`, perché entrerebbero nel frontend pubblico. Non caricare `.env` o segreti nel repository. [CONFIGURAZIONE](docs/CONFIGURAZIONE.md) distingue fallback, servizi esterni e privacy.

Dopo aver modificato l'ambiente riavviare/ridistribuire il servizio con il comando previsto dal dashboard. L'assenza di IA non è un errore di build: l'app si apre con regole/ripieghi, di qualità differente dal percorso IA.

Il database non viene creato o migrato automaticamente. Se si vuole il login, configurare un DB della **destinazione** e revisionare le migrazioni prima di applicarle. Non usare `db:reset` o dati della produzione sorgente.

## 4. Verificare il dominio assegnato

1. `https://DOMINIO-ASSEGNATO/_health` → HTTP 200 e testo esatto **`OK`**.
2. `/` → scheda studente; `/app` → attività, anche aprendo direttamente la rotta.
3. I font in `/fonts/` devono essere file reali con `Access-Control-Allow-Origin: *`; verificare MIME/contenuto, non il solo 200.
4. `/tessdata/lat.traineddata.gz` deve essere un vero gzip (o il modello della variante), non l'HTML della SPA.
5. Provare analisi, traduzione secondo la configurazione scelta, foto con ritaglio e PDF da pulsante.
6. Verificare barra di accessibilità, tastiera, desktop/mobile e iframe della destinazione.

La CI contiene un avvio di produzione isolato equivalente nella struttura al processo Node Render. **Non sostituisce un deploy reale su Render**, che può avere vincoli, rete e risorse diversi; non certifica automaticamente IA o autenticazione non configurate.

## 5. Cornice Blogger: evitare il vecchio sito

Il nuovo dominio non aggiorna il blog da solo. Nei file pertinenti di `cornice-dinamica/` cambiare la configurazione `APP_URL`, poi aggiornare **anche** la copia servita in `client/public/cornice-test/`. Verificare che l'iframe punti alla destinazione e non alla produzione sorgente. Riferimento: [cornice-dinamica/README.md](cornice-dinamica/README.md).

Non modificare protocollo `labvisivo:height`, token, filtro `e.source`, CORS font o difese anti-loop. Il cloner assegna un URL inattivo quando il dominio non è ancora noto proprio per evitare aperture accidentali del vecchio sito.

## 6. Aggiornamenti e CI

La CI su push/PR `main`/`master` esegue struttura, tipi, test, build e smoke senza chiavi o DB reali. Il Blueprint usa **`checksPass`**, non il vecchio `autoDeploy: true`: l'auto-deploy aspetta i controlli CI del commit collegato. Controllare dal dashboard che il ramo, l'integrazione GitHub e i check siano effettivamente riconosciuti. Un deploy manuale è una decisione distinta.

Per modifiche a database o schema chiedere prima l'autorizzazione necessaria: il deploy non è un motivo per resettare dati. Per la produzione Easy-Peasy restano necessarie preview condivisa e conferma successiva; questa guida non le aggira.

## 7. Docker alternativo

Il runtime consigliato dal Blueprint è **Node**, quindi il Dockerfile non è usato nel percorso standard. Il [Dockerfile](Dockerfile) alternativo:

- usa Node 22.22.2 in tutti gli stadi;
- installa dal lockfile mantenendo le patch;
- compila client e server dai sorgenti, senza pretendere `dist/` nello ZIP;
- separa le dipendenze di produzione e avvia come utente non root;
- esclude segreti, file locali e dipendenze host tramite [.dockerignore](.dockerignore).

**Distinguere archivio sorgente e contesto Docker.** La `.dockerignore` corrente **non esclude `dist/`**: la piattaforma Easy-Peasy/Cloud Run compila prima del confezionamento e il container generato deve poter copiare il bundle per avviare `node dist/index.js`. Lo ZIP e Git continuano invece a escludere `dist/` (regole Git/strumenti di export). Il Dockerfile alternativo qui incluso e il Blueprint Render ricostruiscono dai sorgenti anche quando `dist/` non esiste. Non reintrodurre l'esclusione Docker di `dist/` per cercare di ripulire lo ZIP. Riferimento: [rilascio 8802](RILASCIO-8802.md).

Dove Docker è disponibile:

```bash
docker build -t latino-facile .
docker run --rm -p 8080:8080 latino-facile
# In un altro terminale: curl --fail http://localhost:8080/_health
```

Le chiavi vanno passate soltanto al container in esecuzione, non come argomenti di build. La ricostruzione Node e la prova con sole dipendenze di produzione sono verificabili senza Docker; un'immagine Docker va dichiarata collaudata solo dopo un vero `docker build/run`. Vedere [esito del riordino](docs/portabilita/RIORDINO.md).

## 8. Problemi frequenti

| Sintomo | Controllo |
|---|---|
| `package.json` non trovato | Upload annidato o Root Directory sbagliata |
| Vite/esbuild assente | Installazione fatta con sole dipendenze runtime: usare `--prod=false` in build |
| pnpm versione diversa | Usare `corepack pnpm` e mantenere `packageManager`/lock/patch |
| Errore Node o `pdfjs-dist` | Usare `.node-version`/`NODE_VERSION`; Node 20 non è la base prevista |
| Health ok ma asset assente | Il 200 può essere HTML della SPA: controllare contenuto e percorso nel build |
| IA non disponibile | Chiave server, disponibilità del provider, rete e risposta; non serve aggiungere un database |
| Login 503 senza DB | Previsto: il flusso didattico è pubblico, login opzionale |
| Embed apre la vecchia app | Aggiornare `APP_URL` nella sorgente e nella copia pubblica |
| Primo accesso lento | Verificare stato/risorse/cold start della propria istanza, senza promettere tempi fissi |

## Riferimenti ufficiali consultati

Documentazione verificata il 29/10/2026:

- [Blueprint YAML](https://render.com/docs/blueprint-spec): campi e `autoDeployTrigger`.
- [Schema JSON ufficiale](https://render.com/schema/render.yaml.json): validazione strutturale.
- [Express su Render](https://render.com/docs/deploy-node-express-app): build e singolo processo web.

La verifica di schema non crea risorse e non garantisce da sola che un account consenta il piano/nome scelto.
