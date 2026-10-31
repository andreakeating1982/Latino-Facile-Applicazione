# Licenze e risorse incluse

Questa nota documenta la situazione tecnica del pacchetto, non è un parere legale o una certificazione di tutti i diritti di riuso.

## Codice e dipendenze

`package.json` dichiara **MIT** per il progetto. Il pacchetto non assegna una nuova titolarità e non estende automaticamente quella licenza a file di terzi, immagini, font, modelli o quaderni PDF. Per una pubblicazione pubblica/derivata verificare la titolarità dei contributi e le eventuali attribuzioni richieste.

Le dipendenze npm sono risolte da `pnpm-lock.yaml` e mantengono le rispettive licenze e avvisi nei pacchetti installati. Non includere `node_modules` nello ZIP; non eliminare gli avvisi dai pacchetti distribuiti. La patch Wouter è fornita in `patches/` per rendere riproducibile l'installazione.

## Font OpenDyslexic effettivamente presenti

Gli otto file di `client/public/fonts/` sono preservati senza modifiche. I loro metadati incorporati sono stati letti e conservati in [font-license-metadata.json](portabilita/font-license-metadata.json).

Quei file riportano attribuzione ad **Abelardo Gonzalez** per le modifiche OpenDyslexic e a **Bitstream** per i font originali, con riferimenti a **Creative Commons Attribution 3.0 Unported** e alla licenza Bitstream. Non è corretto sostituire questi avvisi con l'etichetta generica «OFL» soltanto perché un'altra versione del font usa condizioni differenti. Le due copie WOFF2 della cornice conservano le risorse originali.

Conservare gli avvisi originali nei binari, verificare le condizioni applicabili alla versione precisa e le attribuzioni prima di una redistribuzione pubblica o di una modifica. Il file di metadati è una prova di ciò che dichiarano i binari, non sostituisce i testi legali completi.

## Modelli OCR e dati linguistici

`client/public/tessdata/lat.traineddata.gz` è il modello già incluso nella sorgente. La verifica del pacchetto controlla integrità gzip e hash, non ricostruisce la catena di provenienza originaria. Prima di sostituirlo o distribuirne una nuova versione verificare fonte, licenza e compatibilità del modello effettivo.

Whitaker e gli altri pacchetti linguistici restano dipendenze con le proprie condizioni; le API esterne (IA, Collatinus, provider di traduzione) hanno condizioni separate. Una chiave o un accesso a un servizio non sono trasferiti dallo ZIP.

## PDF e immagine di riferimento

I nove quaderni statici `quaderno-unico-v*.pdf` e `docs/photo-crop-mobile.png` sono risorse preesistenti preservate, non nuovo materiale con licenza automaticamente MIT. Non presentarli come quaderni adattati a un'altra lingua senza un intervento e una verifica espliciti. Non sono dati studenti esportati.

Per le dipendenze di rete e il trattamento di testi/foto vedere [CONFIGURAZIONE.md](CONFIGURAZIONE.md). La possibilità tecnica di una repository GitHub pubblica non sostituisce la verifica dei diritti dei contenuti.
