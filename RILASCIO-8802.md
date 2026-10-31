# Latino Facile — versione pubblicata 8802

## Identità della versione

- **Produzione attiva:** 8802, pubblicata il 31 ottobre 2026 dopo conferma esplicita.
- **URL:** https://latino-facile-app-2.easy-peasy.site
- **Commit del codice pubblicato:** `c9b23f54a307927397b664d93caef68975788c50`.
- **Modifica della legenda approvata:** `d90b738b51a0debf2657f706faf6d643b6a24df9`.
- **Cropper:** baseline autonoma 8731, invariata; non rinumerarla per farla coincidere con il rilascio dell'app.

Il pacchetto contiene gli stessi sorgenti applicativi `client/`, `server/`, `shared/`, le stesse dipendenze/patch e la configurazione di avvio della 8802. Le sole guide e i metadati possono avere un commit successivo, identificato nel rapporto esterno dello ZIP. L'aggiornamento del pacchetto **non modifica il sito**, non aggiorna GitHub e non crea un servizio Render.

## Novità rispetto alla base precedente 8754

### Legenda nell'app

`LegendPanel` in `client/src/pages/Home.tsx` dispone le voci in **una colonna mobile, due tablet e tre desktop**, al posto delle precedenti 2/3/4. Etichette, complementi e sottotitoli usano `whitespace-nowrap`; SINGOLARE/PLURALE restano sulla stessa riga del caso. Le dimensioni del testo dipendono dalla larghezza reale del contenitore tramite `cqw`, anche dentro l'iframe Blogger. I paragrafi di nota sotto la griglia restano testo corrente e possono andare a capo.

### Legenda nel PDF dinamico

`client/src/lib/export.ts` conserva la legenda a **due colonne** e usa `fitOneLine` per misurare i testi con il font OpenDyslexic effettivamente incorporato. Le righe sono adattate entro i limiti impostati; SINGOLARE/PLURALE condividono la dimensione nella stessa voce. `client/src/lib/export.test.ts` controlla che le scritte non superino la propria colonna. La modifica riguarda il PDF generato dal pulsante dell'app, non i quaderni PDF storici o file già scaricati.

### Confezionamento Cloud Run e portabilità

La `.dockerignore` non esclude `dist/`: il flusso Cloud Run della piattaforma compila prima di confezionare il container e necessita del bundle per l'avvio. Il precedente tentativo 8801 non si è avviato; il successivo rilascio **8802 è riuscito**. Il Blueprint Render e il Dockerfile multistadio inclusi ricostruiscono comunque dai sorgenti. Lo ZIP **non contiene** `dist/`, `node_modules/`, `.git/`, `.env`, cache, log o database reali.

## Verifiche del rilascio già eseguite

- TypeScript, build e **85/85 test unitari** superati.
- **43/43 controlli smoke** di produzione e avvio locale sulla porta 8080.
- Legenda app: **12 controlli e2e**, inclusa assenza di a-capo a 320, 393, 768 e 1100 px; audit senza sovrapposizioni a nove larghezze (320–1440 px), sulla build poi pubblicata.
- Dopo il deploy: servizio attivo, `/_health` HTTP 200, bundle JavaScript e CSS online identici alla build approvata; **7/7 test PDF** ripetuti sullo stesso codice.
- Un controllo DOM pubblico desktop ha restituito 42 righe senza difetti; un successivo tentativo aggiuntivo ha avuto timeout dell'estensione. Non è stata completata una nuova campagna mobile post-deploy e non viene dichiarata tale.

I controlli di ricostruzione **ripetuti per la consegna ZIP** sono riportati nel riepilogo e nei rapporti esterni consegnati con l'archivio, non attribuiti automaticamente ai risultati storici.

## Hash pubblici verificati della 8802

| Risorsa | SHA-256 |
|---|---|
| `/assets/index-Cz4g2dS8.js` | `92274b635a1ac85beb001c0da9e21a74ac7942f6b5487a5d1c765e09b46db70b` |
| `/assets/index-CNPLDX4z.css` | `6d8fcbb15201973e9fcf532e76c33326e65b909b5e89daab17a139ec225e9de8` |

Gli hash descrivono i file serviti da questo rilascio, **non** il checksum dello ZIP. I nomi/hash potrebbero cambiare dopo interventi funzionali o nuovi rilasci.

## Risorse e regole preservate

- Palette avverbi blu `#0057D9`, preposizioni grigio chiaro `#BDBDBD`, congiunzioni grigio scuro `#4A4A4A`; altri modi `#795548`.
- Enclitiche: nell'app contorno base e testo a contrasto; nel PDF grigio della categoria propria.
- CropDialog `modal={true}`, pagina dietro ferma, scroll interno, drag diretto; `confirm()` e geometria del box invariati. Foglio clonabile con 18 sorgenti e hash.
- Font auto-ospitati, barra di accessibilità, limite corrente 50 parole, traduzione salvata senza download automatico e cornice Blogger invariati.
- Guide per ricostruzione, varianti, accessibilità e GitHub/Render già incluse: [README.md](README.md), [REBUILD.md](REBUILD.md), [ADATTARE.md](ADATTARE.md), [RENDER.md](RENDER.md), [ACCESSIBILITA.md](ACCESSIBILITA.md), [ESPORTAZIONE](docs/ESPORTAZIONE.md).

## Limiti dei controlli

API IA simulate nei test UI e touch emulato non misurano la grammatica, l'OCR reale o l'efficacia per tutti gli studenti BES. Nessuna nuova certificazione WCAG/PDF-UA: i PDF campione non sono taggati. La verifica locale non equivale a un deploy remoto Render o a un vero `docker build/run`. Le credenziali della produzione e i dati degli utenti non sono inclusi. Il riordino precedente resta documentato come storico in [VERIFICHE-2026-10-29.md](docs/portabilita/VERIFICHE-2026-10-29.md).

