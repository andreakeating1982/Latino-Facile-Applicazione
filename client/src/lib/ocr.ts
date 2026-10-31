/**
 * Riconoscimento del testo latino (OCR) da foto e PDF.
 * - Foto (JPG/PNG/WEBP): Tesseract.js con la lingua «lat», dopo un
 *   pretrattamento (scala, grigio, contrasto) pensato per libri/quaderni.
 * - PDF: ogni pagina viene resa su canvas (pdfjs-dist) e poi riconosciuta.
 * Il testo viene restituito grezzo; `cleanOcrText` lo normalizza.
 */
import * as pdfjsLib from "pdfjs-dist";
import { createWorker, PSM } from "tesseract.js";
import { enhanceForOcr } from "@/lib/imagePrep";
export { cleanOcrText } from "@/lib/ocrClean";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<OcrWorker> | null = null;
let progressCb: ((p: number) => void) | null = null;

function getWorker(onProgress?: (p: number) => void): Promise<OcrWorker> {
  progressCb = onProgress ?? null;
  if (!workerPromise) {
    workerPromise = createWorker("lat", 1, {
      langPath: "/tessdata",
      logger: (m) => {
        if (m.status === "recognizing text" && progressCb) progressCb(m.progress);
      },
    }).then(async (w) => {
      await w.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      return w;
    });
  }
  return workerPromise;
}

export async function ocrImage(
  file: File | Blob,
  onProgress?: (p: number) => void
): Promise<string> {
  onProgress?.(0.05);
  let prepared: Blob = file;
  try {
    prepared = await enhanceForOcr(file);
  } catch {
    prepared = file;
  }
  onProgress?.(0.12);
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(prepared);
  return data.text ?? "";
}

export async function ocrPdf(file: File, onProgress?: (p: number) => void): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const maxPages = Math.min(pdf.numPages, 5);
  let out = "";
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.4 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) continue;
    const pageProgress = (p: number) => {
      const base = (i - 1) / maxPages;
      onProgress?.(base + p / maxPages);
    };
    out += (await ocrImage(blob, pageProgress)) + "\n";
  }
  return out;
}

