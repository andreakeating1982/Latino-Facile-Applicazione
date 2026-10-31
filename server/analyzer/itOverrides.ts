/**
 * Traduzioni curate a mano per le frasi latine più celebri (testi scolastici,
 * Cesare, libro di grammatica) o per i casi in cui la traduzione automatica
 * fallisce in modo evidente. La chiave è la frase normalizzata: minuscole,
 * senza punteggiatura, spazi singoli.
 *
 * Gli overrides hanno la precedenza su MyMemory e sul glossario: garantiscono
 * una traduzione corretta e naturale per le frasi che si incontrano a scuola.
 */
import { normalizeWord } from "./normalize";

export const TRANSLATION_OVERRIDES: Record<string, string> = {
  // Cesare — De Bello Gallico (incipit)
  "gallia est omnis divisa in partes tres": "Tutta la Gallia è divisa in tre parti.",
  "hi omnes lingua institutis legibus inter se differunt":
    "Tutti questi popoli differiscono tra loro per lingua, istituzioni e leggi.",

  // Cesare — De Bello Gallico I (la marcia su Vesontio)
  "caesar vesontionem contendit": "Cesare si diresse in fretta verso Vesontio.",

  // Frasi celebri di esercizio (vinco/alo/celo)
  "vici": "Ho vinto!",
  "vici alui et celavi": "Ho vinto! Ho nutrito e ho nascosto.",
  "alui et celavi": "Ho nutrito e ho nascosto.",

  // Frasi tipiche del libro di grammatica
  "terentia in splendida villa cum caris amicis lautas epulas convivis praebet":
    "Terentia offre sontuosi banchetti ai suoi cari amici in una splendida villa.",
  "roma in italia est": "Roma è in Italia.",
  "puella a matre amatur": "La ragazza è amata dalla madre.",
  "agricola in agro laborat": "Il contadino lavora nel campo.",
  "parva alauda alba aurora nuntiatur":
    "L'alba è annunciata da una piccola allodola bianca.",
  "incolae insulae procellas timent": "Gli abitanti dell'isola temono le tempeste.",
  "incolae insularum procellas timent": "Gli abitanti delle isole temono le tempeste.",
  "urbes italiae pulchrae sunt": "Le città d'Italia sono belle.",
  "pueri in horto ludunt": "I bambini giocano nell'orto.",
  "romani multas urbes expugnaverunt": "I Romani espugnarono molte città.",
  "summus amicus est": "È un grandissimo amico.",

  // Aforismi e motti celebri (traduzione canonica)
  "alea iacta est": "Il dado è tratto.",
  "cogito ergo sum": "Penso, dunque sono.",
  "arma virumque cano": "Canto le armi e l'uomo.",
  "o tempora o mores": "O tempi, o costumi!",
  "veni vidi vici": "Venni, vidi, vinsi.",
  "errare humanum est": "Errare è umano.",
  "fortes fortuna adiuvat": "La fortuna aiuta gli audaci.",
  "audentes fortuna iuvat": "La fortuna aiuta gli audaci.",
  "in vino veritas": "Nel vino sta la verità.",
  "per aspera ad astra": "Attraverso le difficoltà fino alle stelle.",
  "dulce et decorum est pro patria mori": "È dolce e nobile morire per la patria.",
  "ave caesar morituri te salutant": "Salve, Cesare, noi che stiamo per morire ti salutiamo.",
  "hannibal ad portas": "Annibale alle porte!",
  "omnia vincit amor": "L'amore vince tutto.",
  "faber est suae quisque fortunae": "Ciascuno è artefice della propria fortuna.",
  "gallia est omnis divisa in partes tres quarum unam incolunt belgae":
    "Tutta la Gallia è divisa in tre parti, di cui una è abitata dai Belgi.",

  // Altre frasi tipiche del libro di grammatica (correzioni manuali:
  // MyMemory sbaglia genere, tempo oppure traduce parole in inglese)
  "servus in horto laborat": "Lo schiavo lavora nell'orto.",
  "mater filiam amat": "La madre ama la figlia.",
  "nauta navigat": "Il marinaio naviga.",
  "si venis gaudeo": "Se vieni, sono felice.",
  "caesar copias in belgas duxit": "Cesare condusse le truppe contro i Belgi.",
  "caesar cum suis copiis profectus est": "Cesare partì con le sue truppe.",
  "cives in foro conveniunt": "I cittadini si riuniscono nel foro.",
  "dominus servum liberat": "Il padrone libera lo schiavo.",
  "urbs a militibus defenditur": "La città è difesa dai soldati.",
  "galli a romanis superati sunt": "I Galli furono sconfitti dai Romani.",
  "horum omnium fortissimi sunt belgae": "I più forti di tutti questi sono i Belgi.",
  "belgae ab aquitanis garumna flumen dividit":
    "Il fiume Garonna separa i Belgi dagli Aquitani.",
  "apud helvetios longe nobilissimus et ditissimus fuit orgetorix":
    "Presso gli Elvezi, di gran lunga il più nobile e il più ricco fu Orgetorige.",
  "omnes homines natura cupiditate ducuntur":
    "Tutti gli uomini sono condotti per natura dal desiderio.",

  // Altri motti e frasi celebri
  "tempora mutantur nos et mutamur in illis": "I tempi cambiano, e noi cambiamo con essi.",
  "mens sana in corpore sano": "Una mente sana in un corpo sano.",
  "sic transit gloria mundi": "Così passa la gloria del mondo.",
  "carpe diem": "Cogli l'attimo.",
  "periculum in mora": "Il pericolo sta nell'indugio.",
  "panem et circenses": "Pane e giochi circensi.",
  "iacta alea est": "Il dado è tratto.",
};

/** Normalizza una frase per l'uso come chiave negli overrides. */
export function normalizeSentenceKey(s: string): string {
  // toglie anche i diacritici: «Rōma est» deve combaciare con la chiave «roma est»
  return normalizeWord(s)
    .replace(/[.,;:!?«»"'“”()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
