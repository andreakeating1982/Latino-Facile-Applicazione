import { describe, expect, it } from "vitest";
import { normalizeTranscription, validateImageInput } from "./aiTranscribeLatino";

describe("aiTranscribeLatino — validazione immagine", () => {
  it("accetta data URL jpeg/png/webp", () => {
    expect(validateImageInput("data:image/jpeg;base64,/9j/4AA=")).toContain("data:image/jpeg");
    expect(validateImageInput("data:image/png;base64,iVBORw0=")).toContain("data:image/png");
    expect(validateImageInput("data:image/webp;base64,UklGRg==")).toContain("data:image/webp");
  });

  it("rifiuta formati non foto (svg, testo, stringhe vuote)", () => {
    expect(() => validateImageInput("data:image/svg+xml;base64,PHN2Zz4=")).toThrow();
    expect(() => validateImageInput("data:text/plain;base64,aGVsbG8=")).toThrow();
    expect(() => validateImageInput("")).toThrow();
    expect(() => validateImageInput("non-un-data-url")).toThrow();
  });
});

describe("aiTranscribeLatino — pulizia trascrizione", () => {
  it("toglie fence markdown e virgolette esterne", () => {
    expect(normalizeTranscription("```\nPuella videt.\n```")).toBe("Puella videt.");
    expect(normalizeTranscription("«Puella  videt.»")).toBe("Puella videt.");
  });

  it("collassa gli spazi su più righe in un'unica riga", () => {
    expect(normalizeTranscription("Puella rosam\nvidet  fortiter.")).toBe("Puella rosam videt fortiter.");
  });

  it("NESSUN TESTO diventa stringa vuota", () => {
    expect(normalizeTranscription("NESSUN TESTO")).toBe("");
    expect(normalizeTranscription("  nessun testo latino")).toBe("");
  });
});
