# Latino Facile — riordino ZIP esportabile (29/10/2026)

Il registro precedente è conservato in `docs/storico/pre-riordino-2026-10-29/todo.md.txt`.

## Audit e riordino
- [x] Inventariare sorgenti/asset e individuare incongruenze di documentazione, Docker, CI e ambiente.
- [x] Conservare le guide precedenti senza usarle come istruzioni operative.
- [x] Consolidare README, AGENTS, REBUILD, ADATTARE, RENDER e OCR sul codice reale.
- [x] Aggiungere mappa del repository, configurazione, strumenti di clone/export e verifiche portabili.
- [x] Allineare Node/pnpm, Blueprint, CI, Dockerfile e protezioni sui segreti senza cambiare UI/motore/cropper.
- [x] Verifiche preliminari: 9 test di sicurezza del packaging/clone, 43 check smoke e schema JSON ufficiale Render superati.

## Collaudo
- [x] Estrarre un candidato in una cartella isolata, senza .env o database reali.
- [x] Eseguire installazione frozen con store indipendente, typecheck, 84/84 test, build e 43 check smoke produzione.
- [x] Verificare il runtime con le sole dipendenze di produzione, senza Vite/tsx.
- [x] Provare clone, rifiuto di overwrite, GitHub-ready e nuova esportazione da storia Git indipendente.
- [x] Eseguire 4 suite browser: 424 controlli, 9 scenari crop e 4 drag; verificare 7 PDF con font incorporati e contorno isolato.
- [x] Controllare Blueprint con schema ufficiale, collegamenti, CRC, hash e assenza di file privati; rifiutare 6 archivi alterati.

## Consegna
- [x] Preparare la consegna definitiva da checkpoint pulito con ZIP, rapporto e checksum; identificativi finali nel rapporto esterno.
- [x] Dichiarare limiti nel rapporto: nessun nuovo deploy, nessuna nuova certificazione grammaticale/OCR/BES; nessun Docker build/run eseguito.

Esiti e metodo: [docs/portabilita/VERIFICHE-2026-10-29.md](docs/portabilita/VERIFICHE-2026-10-29.md).

## Legenda e rilascio — 31/10/2026
- [x] Legenda app approvata: etichette su una riga, griglia responsive 1/2/3 colonne.
- [x] Legenda PDF con larghezze misurate sul font; 85/85 test superati.
- [x] Tentativo produzione 8801: fallito in avvio del container; la versione pubblica precedente risponde ancora HTTP 200.
- [x] Ripristinare il solo Dockerfile rimosso dallo strumento e non escludere dist/ dal contesto Cloud Run (build locale presente ma esclusa dalla vecchia .dockerignore).
- [x] Verificare build e avvio su PORT=8080 (health e /app HTTP 200), 43/43 smoke test e sorgenti della legenda identici al checkpoint approvato.
- [x] Condividere nuova anteprima della configurazione corretta.
- [x] Ricevuta nuova conferma esplicita; produzione 8802 pubblicata e attiva su https://latino-facile-app-2.easy-peasy.site (checkpoint codice c9b23f5).
- [x] Health pubblico HTTP 200; JS e CSS pubblici identici byte per byte alla build approvata, incluso il generatore PDF. Pagina /app aperta in Chrome dell’utente: legenda aggiornata visibile.
- [x] Dockerfile locale ripristinato dal checkpoint dopo la rimozione automatica dello strumento di deploy; nessuna modifica al suo contenuto.
- [x] Il controllo DOM aggiuntivo in Chrome non ha restituito risultati affidabili (timeout dell’estensione): non dichiarare una nuova misurazione mobile post-deploy. Restano validi i test precedenti sulle stesse risorse, ora verificate per hash online.


## Aggiornamento pacchetto alla produzione 8802 — 31/10/2026
- [x] Verificare checkout pulito e uguaglianza dei sorgenti/configurazione con il commit pubblicato c9b23f5.
- [x] Riconfermare SHA-256 di JavaScript e CSS della produzione 8802.
- [x] Aggiornare README, AGENTS, REBUILD, ADATTARE, RENDER, ACCESSIBILITA, manifest e guida RILASCIO-8802; preservare baseline crop 8731 e tutti i sorgenti applicativi.
- [x] Eseguire struttura (245 file, 120 link, 885 controlli), 9/9 test strumenti, typecheck, 85/85 test unitari, build e 43/43 smoke.
- [x] Candidato esportato da HEAD pulito (9f2399f): CRC/hash/assenza di file privati verificati; finale con soli aggiornamenti documentali e nuova verifica integrale di archivio.
- [x] Ricostruzione dalla copia estratta senza .env o credenziali reali: 85/85 test, build JS/CSS identica alla 8802 pubblicata, 43/43 smoke anche con sole dipendenze runtime; clone installato/compilato/avviato e riesportazione da storia Git indipendente riusciti.
- [x] Predisporre il pacchetto di consegna ZIP 8802, riepilogo verifiche, rapporto tecnico e checksum; risultati in docs/portabilita/VERIFICHE-8802-2026-10-31.md. Nessun nuovo deploy o upload a GitHub autorizzato o necessario.
