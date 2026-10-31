/**
 * Esportazione della frase colorata in PDF.
 * - Ogni parola è disegnata ingrandita, in grassetto e con le LETTERE colorate
 *   (nessun riquadro di sfondo), come richiesto.
 * - Ogni frase parte da una nuova riga, con a capo automatico.
 * - Font OpenDyslexic (ad alta leggibilità, per dislessia e ipovedenti).
 */
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument, rgb, pushGraphicsState, popGraphicsState,
  setStrokingColor, setLineWidth, beginText, endText,
  setTextRenderingMode, TextRenderingMode,
  type PDFFont,
} from "pdf-lib";
import {
  DECLINABILI,
  colorForEnclitic,
  LEGEND_VOICE_NOTE,
  legendExplanationColor,
  isLightServiceColor,
  SERVICE_LIGHT_OUTLINE_COLOR,
  shadeForNumber,
  UNKNOWN_TEXT_COLOR,
  type PosCategory,
} from "../../../shared/types";

export interface ExportToken {
  word: string; // parola (es. «Puella»)
  trailing: string; // punteggiatura attaccata alla parola (es. «,»)
  color: string; // colore della parola (es. «#E53935»)
  voice?: "attivo" | "passivo"; // voce verbale: i passivi sono SOTTOLINEATI
  /** Numero grammaticale della parola: sulle parole declinabili (DECLINABILI)
   *  determina la SFUMATURA del colore (chiaro = singolare, scuro = plurale). */
  number?: "singolare" | "plurale";
  /** Categoria grammaticale della parola (TokenAnalysis.category): la
   *  sfumatura chiaro/scuro compare sulle parole declinabili (nome,
   *  aggettivo, pronome, numerale). */
  pos?: PosCategory;
  /** true quando il colore è stato scelto a mano dall'utente: è FINALE e
   *  NON riceve la sfumatura del numero (la palette propone già le voci
   *  SINGOLARE/PLURALE della legenda). */
  coloreFinale?: boolean;
  /** Enclitica attaccata (es. TUTAMQUE = TUTAM + QUE): la parola è disegnata
   *  in DUE segmenti — base col colore del caso, ultime lettere col colore
   *  della categoria dell'enclitica (come in legenda), sempre attaccate. */
  suffisso?: { testo: string; colore: string };
}

export interface ExportLegendItem {
  label: string; // etichetta (es. «NOMINATIVO»)
  compl?: string; // complemento italiano del caso (es. «SOGGETTO»)
  sub?: string; // sottotitolo (es. «chi? che cosa?»)
  color: string; // colore del quadratino
  /** true per i casi: l'etichetta diventa due voci, «... SINGOLARE» con la
   *  sfumatura chiara e «... PLURALE» con quella scura (come i chip). */
  numero?: boolean;
}

export interface ExportStudent {
  cognome?: string;
  nome?: string;
  data?: string;
  classe?: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

function toColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return rgb(r / 255, g / 255, b / 255);
}

/** Dimensione del testo che entra su UNA SOLA RIGA nella larghezza data:
 *  parte da maxSize e restringe di 0,25 pt finché la larghezza misurata col
 *  font reale entra nel limite. pdf-lib NON va mai a capo da sé: senza questo
 *  controllo una scritta lunga sforerebbe silenziosamente nella colonna
 *  accanto. Garantisce che NESSUNA scritta della legenda (etichette
 *  «... SINGOLARE»/«... PLURALE», complementi, sottotitoli) esca dalla
 *  propria colonna. */
function fitOneLine(
  text: string,
  f: PDFFont,
  maxSize: number,
  minSize: number,
  maxWidth: number
): number {
  let s = maxSize;
  while (s > minSize && f.widthOfTextAtSize(text, s) > maxWidth) s -= 0.25;
  return s;
}

/* ------------------------------------------------------------------ */
/* PDF                                                                */
/* ------------------------------------------------------------------ */
export async function buildPdfBlob(
  sentences: ExportToken[][],
  legend?: ExportLegendItem[],
  student?: ExportStudent,
  translations?: (string | undefined)[],
  pageNumbers?: boolean
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const [regularBytes, boldBytes] = await Promise.all([
    fetch("/fonts/OpenDyslexic-Regular.ttf").then((r) => r.arrayBuffer()),
    fetch("/fonts/OpenDyslexic-Bold.ttf").then((r) => r.arrayBuffer()),
  ]);
  const font = await pdf.embedFont(regularBytes);
  const bold = await pdf.embedFont(boldBytes);

  const pageW = 595.28; // A4
  const pageH = 841.89;
  const margin = 64;
  const usableW = pageW - margin * 2;

  // Parole ingrandite, in grassetto
  const size = 18;
  const lineGap = Math.round(size * 1.6); // interlinea
  const sentenceGap = 20; // spazio tra una frase e l'altra (compattato per
  // favorire la stesura su UNA sola pagina quando possibile, 26/10)
  const spaceW = font.widthOfTextAtSize(" ", size);
  const PUNCT_COLOR = "#5a4a38"; // punteggiatura in grigio scuro, non colorata

  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;

  // Grigio chiaro leggibile anche su bianco: stesso riempimento della
  // legenda + contorno sottile scuro. Nessun riquadro né testo duplicato.
  // q/Q isolano lo stato: le altre parole e pagine NON ereditano il bordo.
  const drawColoredWord = (text: string, x: number, y: number, color: string) => {
    const outlined = isLightServiceColor(color);
    if (outlined) page.pushOperators(
      pushGraphicsState(), setStrokingColor(toColor(SERVICE_LIGHT_OUTLINE_COLOR)),
      setLineWidth(0.35), beginText(),
      setTextRenderingMode(TextRenderingMode.FillAndOutline), endText(),
    );
    page.drawText(text, { x, y, size, font: bold, color: toColor(color) });
    if (outlined) page.pushOperators(popGraphicsState());
  };

  /* Intestazione dello studente (dalla prima pagina): SEMPRE tutti i campi,
     anche se qualche campo è vuoto (in tal caso mostra «—») */
  const studentLabels: ReadonlyArray<[keyof ExportStudent, string]> = [
    ["cognome", "Cognome"],
    ["nome", "Nome"],
    ["classe", "Classe"],
    ["data", "Data"],
  ];
  const studentParts: string[] = studentLabels.map(([key, label]) => {
    const value = (student?.[key] ?? "").trim();
    return `${label}: ${value || "—"}`;
  });
  if (studentParts.length > 0) {
    // sezione dati studente centrata
    const studentLine = studentParts.join(" · ");
    const studentLineW = bold.widthOfTextAtSize(studentLine, 11);
    page.drawText(studentLine, {
      x: margin + (usableW - studentLineW) / 2,
      y,
      size: 11,
      font: bold,
      color: toColor("#5a4a38"),
    });
    // spazio maggiore tra i dati dello studente e le frasi colorate
    y -= 48;
  }

  for (let si = 0; si < sentences.length; si++) {
    const sentence = sentences[si];
    let x = margin;
    for (const t of sentence) {
      const wordW = t.word ? bold.widthOfTextAtSize(t.word, size) : 0;
      // sfumatura del numero (come nell'app): sulle parole declinabili
      // (nome, aggettivo, pronome, numerale) che prendono il colore del CASO;
      // singolare = più CHIARA, plurale = più SCURA dello stesso colore.
      // I colori scelti a mano (coloreFinale) restano ESATTI, senza risfumare.
      const wordColor =
        !t.coloreFinale && t.number && t.pos && DECLINABILI.includes(t.pos)
          ? shadeForNumber(t.color, t.number)
          : t.color;
      /* Parola NON riconosciuta (chip nero nell'app, 26/10g): nel PDF le
         lettere sono colorate senza sfondo, quindi si disegnano con la
         SCRIITTA NERA (UNKNOWN_TEXT_COLOR), coerente con la legenda
         «colore nero». */
      const drawColor =
        wordColor.toUpperCase() === "#000000" ? UNKNOWN_TEXT_COLOR : wordColor;
      /* Enclitica (es. TUTAMQUE): base col colore del caso + ultime lettere
         col colore della categoria dell'enclitica (come in legenda) */
      const enclMatch =
        t.suffisso && t.word.toLowerCase().endsWith(t.suffisso.testo.toLowerCase())
          ? t.suffisso
          : null;
      // Nel PDF la desinenza segue SEMPRE la legenda corrente, anche con
      // dati precedenti: -cum grigio chiaro, -que/-ve/-ne grigio scuro.
      // Nell'app resta l'inversione nero/bianco.
      const enclDrawColor = colorForEnclitic(enclMatch?.testo ?? "que");
      const baseLen = enclMatch ? t.word.length - enclMatch.testo.length : t.word.length;
      const baseText = t.word.slice(0, baseLen);
      const suffixText = enclMatch ? t.word.slice(baseLen) : "";
      const baseW = baseText ? bold.widthOfTextAtSize(baseText, size) : 0;
      const suffixW = suffixText ? bold.widthOfTextAtSize(suffixText, size) : 0;
      const punctW = t.trailing ? font.widthOfTextAtSize(t.trailing, size) : 0;
      const need = wordW + punctW + spaceW;

      // a capo automatico: la parola non ci sta più sulla riga
      if (x + need > margin + usableW) {
        x = margin;
        y -= lineGap;
        if (y < margin + 30) {
          page = pdf.addPage([pageW, pageH]);
          y = pageH - margin;
        }
      }

      if (t.word) {
        if (enclMatch) {
          // base col colore del caso + enclitica col PROPRIO colore
          if (baseText) {
            drawColoredWord(baseText, x, y, drawColor);
            x += baseW;
          }
          if (suffixText) {
            drawColoredWord(suffixText, x, y, enclDrawColor);
            x += suffixW;
          }
        } else {
          drawColoredWord(t.word, x, y, drawColor);
          x += wordW;
        }
        // verbo passivo: sottolineatura sull'INTERA parola (base + enclitica)
        if (t.voice === "passivo") {
          page.drawLine({
            start: { x: x - wordW, y: y - 3.5 },
            end: { x, y: y - 3.5 },
            thickness: 1.6,
            color: toColor(isLightServiceColor(drawColor) ? SERVICE_LIGHT_OUTLINE_COLOR : drawColor),
          });
        }
      }
      if (t.trailing) {
        page.drawText(t.trailing, { x, y, size, font, color: toColor(PUNCT_COLOR) });
        x += punctW;
      }
      x += spaceW;
    }

    /* Traduzione scritta dallo studente: sempre sotto la frase colorata a cui
       si riferisce (giusta o sbagliata che sia, così com'è stata scritta) */
    const translation = translations?.[si]?.trim();
    if (translation) {
      y -= 14;
      if (y < margin + 40) {
        page = pdf.addPage([pageW, pageH]);
        y = pageH - margin;
      }
      const tLabel = "Traduzione: ";
      const tLabelW = bold.widthOfTextAtSize(tLabel, 11);
      const tSize = 12;
      const tMaxW = usableW - tLabelW;
      const tWords = translation.split(/\s+/).filter(Boolean);
      const tLineHeight = 18;
      const tLabelColor = toColor("#00695c");
      const tColor = toColor("#2e2018");
      let tLine = "";
      let tLineW = 0;
      let tFirst = true;
      for (const w of tWords) {
        const addW = font.widthOfTextAtSize((tLine ? " " : "") + w, tSize);
        if (tLineW + addW > tMaxW && tLine) {
          // disegna la riga corrente (etichetta solo sulla prima riga)
          if (tFirst) {
            page.drawText(tLabel, { x: margin, y, size: 11, font: bold, color: tLabelColor });
            page.drawText(tLine, { x: margin + tLabelW, y, size: tSize, font, color: tColor });
            tFirst = false;
          } else {
            page.drawText(tLine, { x: margin + tLabelW, y, size: tSize, font, color: tColor });
          }
          y -= tLineHeight;
          if (y < margin + 30) {
            page = pdf.addPage([pageW, pageH]);
            y = pageH - margin;
          }
          tLine = w;
          tLineW = font.widthOfTextAtSize(w, tSize);
        } else {
          tLine = tLine ? tLine + " " + w : w;
          tLineW += addW;
        }
      }
      // ultima riga della traduzione
      if (tLine) {
        if (tFirst) {
          page.drawText(tLabel, { x: margin, y, size: 11, font: bold, color: tLabelColor });
          page.drawText(tLine, { x: margin + tLabelW, y, size: tSize, font, color: tColor });
        } else {
          page.drawText(tLine, { x: margin + tLabelW, y, size: tSize, font, color: tColor });
        }
        y -= tLineHeight;
        if (y < margin + 30) {
          page = pdf.addPage([pageW, pageH]);
          y = pageH - margin;
        }
      }
    }

    // ogni frase inizia su una nuova riga
    y -= sentenceGap;
    if (y < margin + 30) {
      page = pdf.addPage([pageW, pageH]);
      y = pageH - margin;
    }
  }

  /* Legenda dei colori del quaderno (in fondo, come richiesto) */
  if (legend && legend.length > 0) {
    // spazio tra le frasi colorate e la legenda (compattato 26/10)
    y -= 24;
    const rows = Math.ceil(legend.length / 2);
    // altezza di ogni riga: 52pt per i casi (due voci «... SINGOLARE» e
    // «... PLURALE» con le due sfumature), 38pt per le altre voci
    const rowH = (row: number) => {
      const a = legend[row * 2];
      const b = legend[row * 2 + 1];
      return a?.numero || b?.numero ? 52 : 38;
    };
    const rowsTotalH = Array.from({ length: rows }, (_, r) => rowH(r)).reduce(
      (acc, h) => acc + h,
      0
    );
    // titolo (con respiro sopra/sotto) + righe (etichetta + complemento
    // + domanda) + spaziature + nota voce (ATTIVO/PASSIVO) + nota parole
    // nere sotto la griglia
    const needed = 70 + rowsTotalH + 24 + 20;
    if (y - needed < margin) {
      page = pdf.addPage([pageW, pageH]);
      y = pageH - margin;
    }
    // linea separatrice
    page.drawLine({
      start: { x: margin, y: y },
      end: { x: pageW - margin, y: y },
      thickness: 1,
      color: toColor("#c9b18a"),
    });
    let ly = y - 34;
    // titolo della legenda centrato (più distanziato dalla linea e dalla griglia)
    const legendTitle = "I COLORI DELLE FRASI";
    const legendTitleW = bold.widthOfTextAtSize(legendTitle, 13);
    page.drawText(legendTitle, {
      x: margin + (usableW - legendTitleW) / 2,
      y: ly,
      size: 13,
      font: bold,
      color: toColor("#2e2018"),
    });
    ly -= 38;
    const colW = usableW / 2;
    legend.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ix = margin + col * colW;
      let iy = ly;
      for (let r = 0; r < row; r++) iy -= rowH(r);
      let subY: number;
      // Etichette e testi SEMPRE su una riga dentro la colonna: la dimensione
      // si adatta al font reale (fitOneLine), nessun a capo né sforamento.
      // SINGOLARE resta sulla stessa riga del nome che accompagna.
      const labelMaxW = colW - 18;
      if (item.numero) {
        // i casi mostrano DUE voci: «... SINGOLARE» con la sfumatura chiara e
        // «... PLURALE» con quella scura dello stesso colore (come i chip).
        // Stessa dimensione per entrambe (la più lunga comanda): allineamento
        // uniforme dentro la voce.
        const labelSize = fitOneLine(`${item.label} SINGOLARE`, bold, 10, 6.5, labelMaxW);
        page.drawRectangle({
          x: ix,
          y: iy - 6,
          width: 10,
          height: 10,
          color: toColor(shadeForNumber(item.color, "singolare")),
        });
        page.drawText(`${item.label} SINGOLARE`, {
          x: ix + 16,
          y: iy - 4,
          size: labelSize,
          font: bold,
          color: toColor("#2e2018"),
        });
        page.drawRectangle({
          x: ix,
          y: iy - 23,
          width: 10,
          height: 10,
          color: toColor(shadeForNumber(item.color, "plurale")),
        });
        page.drawText(`${item.label} PLURALE`, {
          x: ix + 16,
          y: iy - 21,
          size: labelSize,
          font: bold,
          color: toColor("#2e2018"),
        });
        subY = iy - 33;
      } else {
        const labelSize = fitOneLine(item.label, bold, 10, 6.5, labelMaxW);
        page.drawRectangle({
          x: ix,
          y: iy - 8,
          width: 10,
          height: 10,
          color: toColor(item.color),
          ...(isLightServiceColor(item.color)
            ? { borderColor: toColor(SERVICE_LIGHT_OUTLINE_COLOR), borderWidth: 0.4 }
            : {}),
        });
        page.drawText(item.label, { x: ix + 16, y: iy, size: labelSize, font: bold, color: toColor("#2e2018") });
        subY = iy - 12;
      }
      if (item.compl) {
        // Versione chiara per casi/modi; i due nuovi grigi usano invece
        // inchiostro leggibile, senza schiarire la didascalia fino al bianco.
        page.drawText(item.compl, {
          x: ix + 16,
          y: subY,
          size: fitOneLine(item.compl, bold, 8.5, 6, colW - 20),
          font: bold,
          color: toColor(legendExplanationColor(item.color)),
        });
        subY -= 10;
      }
      if (item.sub) {
        page.drawText(item.sub, {
          x: ix + 16,
          y: subY,
          size: fitOneLine(item.sub, font, 8, 6, colW - 20),
          font,
          color: toColor("#7a6650"),
        });
      }
    });

    // nota sulla voce verbale (ATTIVO/PASSIVO) centrata sotto la griglia;
    // le parti «underline» sono disegnate davvero sottolineate. La nota è
    // lunga: il font si restringe finché la riga entra nei margini.
    const noteText = LEGEND_VOICE_NOTE.map((p) => p.text).join("");
    let noteSize = 9;
    while (noteSize > 6.5 && bold.widthOfTextAtSize(noteText, noteSize) > usableW) {
      noteSize -= 0.25;
    }
    const noteW = bold.widthOfTextAtSize(noteText, noteSize);
    let nx = margin + (usableW - noteW) / 2;
    // Distanza tra la casistica colorata (legenda) e le scritte sotto di
    // essa: ridotta a 16 pt SOLO nel PDF su richiesta dell'utente 26/10h
    // (l'app resta con i margini più ampi del 26/10e)
    const ny = ly - rowsTotalH - 16;
    for (const part of LEGEND_VOICE_NOTE) {
      const pw = bold.widthOfTextAtSize(part.text, noteSize);
      page.drawText(part.text, { x: nx, y: ny, size: noteSize, font: bold, color: toColor(part.color ?? "#2e2018") });
      if (part.underline) {
        page.drawLine({
          start: { x: nx, y: ny - 2.5 },
          end: { x: nx + pw, y: ny - 2.5 },
          thickness: 1.1,
          color: toColor(part.color ?? "#2e2018"),
        });
      }
      nx += pw;
    }

    /* Nota sulle parole non riconosciute (richiesta utente 26/10g) sotto la
       nota sulla voce verbale: quadratino NERO + scritta. */
    const unkText =
      "Le parole non riconosciute dall'IA sono contrassegnate dal colore nero.";
    let unkSize = 9;
    while (
      unkSize > 6.5 &&
      font.widthOfTextAtSize(unkText, unkSize) > usableW - 18
    ) {
      unkSize -= 0.25;
    }
    const unkTextW = font.widthOfTextAtSize(unkText, unkSize);
    const swatchS = 7;
    const swatchGap = 5;
    const totalW = swatchS + swatchGap + unkTextW;
    const uy = ny - 16;
    const ux = margin + (usableW - totalW) / 2;
    page.drawRectangle({
      x: ux,
      y: uy - 1,
      width: swatchS,
      height: swatchS,
      color: toColor("#000000"),
      borderColor: toColor("#2e2018"),
      borderWidth: 1,
    });
    page.drawText(unkText, {
      x: ux + swatchS + swatchGap,
      y: uy,
      size: unkSize,
      font,
      color: toColor("#2e2018"),
    });
  }

  /* Numeri di pagina: SOLO il numero, centrato in basso, e SOLO quando il
     documento ha più di una pagina (frasi + traduzioni + legenda finale). */
  if (pageNumbers && pdf.getPageCount() > 1) {
    const count = pdf.getPageCount();
    for (let i = 0; i < count; i++) {
      const p = pdf.getPage(i);
      const label = `${i + 1}`;
      const labelW = bold.widthOfTextAtSize(label, 10);
      p.drawText(label, {
        x: (pageW - labelW) / 2,
        y: 30,
        size: 10,
        font: bold,
        color: toColor("#5a4a38"),
      });
    }
  }

  const saved = await pdf.save();
  const copy = Uint8Array.from(saved);
  return new Blob([copy], { type: "application/pdf" });
}

/* ------------------------------------------------------------------ */
/* Download                                                            */
/* ------------------------------------------------------------------ */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
