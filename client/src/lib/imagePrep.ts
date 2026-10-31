/**
 * Preparazione delle foto prima del ritaglio e dell'OCR.
 *
 * 1. `normalizePhoto` — corregge l'orientamento EXIF (le foto scattate dal
 *    telefono arrivano spesso ruotate di 90°) e restituisce un JPEG "dritto".
 * 2. `enhanceForOcr` — ridimensiona, passa in scala di grigi e stira il
 *    contrasto (ripiego OCR quando l'IA della foto non risponde), così il
 *    riconoscimento legge meglio testo stampato su libro/quaderno
 *    (luci irregolari, pagina gialla, ombre).
 */

const MAX_EDGE = 2200;
const MIN_EDGE = 720;

export async function bitmapFromBlob(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(blob);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("impossibile generare l'immagine"))), type, quality);
  });
}

/** Foto "dritta" in JPEG, pronta da mostrare nel ritaglio. */
export async function normalizePhoto(file: File): Promise<File> {
  const bmp = await bitmapFromBlob(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas non disponibile");
    ctx.drawImage(bmp, 0, 0);
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  } finally {
    bmp.close();
  }
}

/**
 * Stira il contrasto in scala di grigi (percentili 2–98) per testo scuro su
 * carta chiara. Non usa una soglia dura: conserva l'antialias delle lettere.
 */
function contrastStretchGray(img: ImageData): void {
  const { data } = img;
  const n = data.length / 4;
  if (n === 0) return;
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    hist[y]++;
    data[i] = y;
    data[i + 1] = y;
    data[i + 2] = y;
  }
  const loCount = Math.max(1, Math.floor(n * 0.02));
  const hiCount = Math.max(1, Math.floor(n * 0.02));
  let acc = 0;
  let lo = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= loCount) {
      lo = v;
      break;
    }
  }
  acc = 0;
  let hi = 255;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= hiCount) {
      hi = v;
      break;
    }
  }
  if (hi <= lo) return;
  const scale = 255 / (hi - lo);
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.max(0, Math.min(255, Math.round((data[i] - lo) * scale)));
    data[i] = y;
    data[i + 1] = y;
    data[i + 2] = y;
  }
}

/** Immagine ottimizzata per Tesseract (PNG lossless, grigio, contrasto). */
export async function enhanceForOcr(file: Blob): Promise<Blob> {
  const bmp = await bitmapFromBlob(file);
  try {
    let scale = 1;
    const maxEdge = Math.max(bmp.width, bmp.height);
    const minEdge = Math.min(bmp.width, bmp.height);
    if (maxEdge > MAX_EDGE) scale = MAX_EDGE / maxEdge;
    else if (minEdge < MIN_EDGE) scale = MIN_EDGE / minEdge;
    const cw = Math.max(1, Math.round(bmp.width * scale));
    const ch = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas non disponibile");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, cw, ch);
    const img = ctx.getImageData(0, 0, cw, ch);
    contrastStretchGray(img);
    ctx.putImageData(img, 0, 0);
    return await canvasToBlob(canvas, "image/png");
  } finally {
    bmp.close();
  }
}
