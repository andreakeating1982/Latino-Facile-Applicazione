# Ambiente, dipendenze esterne e dati

La configurazione pubblica è [`.env.example`](../.env.example). Il `.env` reale va creato soltanto nella destinazione e non viene esportato. Su Render usare **Environment**. Mai inserire segreti in variabili `VITE_*`, JavaScript client, URL o cornici.

## Variabili effettivamente pertinenti

| Variabile | Ambito | Se non configurata |
|---|---|---|
| `PORT` | Processo Express; piattaforma o locale | Default 3000; in produzione usare la porta fornita dall'hosting |
| `NODE_ENV` | `development` per Vite; `production` per `dist/public` | Impostarla esplicitamente fuori dagli script `dev/start` |
| `EASY_PEASY_API_KEY` | Server: IA foto, verifica/ruoli e traduzione | Percorso IA indisponibile; regole/ripieghi restano possibili |
| `DEEPL_API_KEY` | Provider alternativo di traduzione | Quel percorso non viene usato |
| `DATABASE_URL` | PostgreSQL, solo infrastruttura login | `db=null`, login 503; flusso didattico operativo |
| `BETTER_AUTH_SECRET` | Sessioni con DB e login | Login non inizializzato; generare un nuovo segreto nella destinazione |
| `TRUSTED_ORIGINS` | Origini autorizzate da Better Auth, separate da virgole | Nessuna lista aggiuntiva; non sostituisce CORS `/fonts` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Login sociale opzionale | Provider non configurato |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Login sociale opzionale | Provider non configurato |

**Il database non serve alle funzioni IA.** La scheda studente è un flusso pubblico e non equivale a un account Better Auth.

Sono presenti anche componenti generici dello scaffold (upload/storage/mappe/chat). Il loro codice è preservato per ricostruibilità, ma non per questo richiede S3, mappe, token della piattaforma o tutte le integrazioni per eseguire Latino Facile. Non attivarli senza un'esigenza specifica.

## Che cosa è locale e che cosa usa rete

| Funzione | Risorse |
|---|---|
| UI, font e PDF dinamico | Serviti dalla propria app; i TTF vengono incorporati nel PDF |
| Motore Whitaker | Pacchetto npm con dizionario/morfologia locale nel server |
| Collatinus | Integrazione HTTP esterna prevista dall'analizzatore; non è un servizio contenuto nello ZIP |
| Traduzione | IA configurata, frasi curate/provider alternativi e infine glossario secondo il codice; MyMemory può essere contattato anche senza chiave IA |
| Foto IA | Immagine ritagliata inviata al server e al provider configurato |
| Tesseract ripiego | Riconoscimento nel browser; `lat.traineddata.gz` è locale, worker/core usano le impostazioni di default della libreria e possono richiedere rete/CDN |
| Voce | Web Speech API e voci presenti nel browser/sistema; disponibilità e comportamento dipendono dal dispositivo |

Quindi **«nessuna chiave obbligatoria» non significa «nessuna rete»** e **font auto-ospitati non significano app interamente offline**. Per privacy, uso in classe e trattamento di testi/immagini verificare i servizi realmente attivati, le condizioni applicabili e le autorizzazioni necessarie. Non inserire dati personali nei test o nelle chiavi di esempio.

## Configurare il login solo se richiesto

Il codice include schema e migrazioni PostgreSQL in `drizzle/`. La build/start non applica migrazioni. `db:push` nel `package.json` esegue generazione e migrazione; non è un innocuo controllo di lettura. `db:reset` è distruttivo: non usarlo per un clone o collaudo.

Usare un database della destinazione, fare backup e revisionare l'SQL prima di una modifica. Non copiare il database reale o la stringa di connessione della sorgente. Il pacchetto e la CI non accedono ai dati di produzione.

## Confermare che l'IA funzioni

Dopo una modifica alle variabili riavviare il processo interessato. Una richiesta autorizzata a `latino.translate` con vero latino può riportare `source` e `colorSource` pari a `ai`. Se restano `auto`/`glossario`/`regole`, verificare configurazione, rete e risposta del provider senza stampare la chiave: non basta quel badge per identificare la causa.

Le verifiche automatiche del pacchetto non usano chiavi reali, non attestano l'accuratezza dei provider e non ricreano la loro disponibilità futura.
