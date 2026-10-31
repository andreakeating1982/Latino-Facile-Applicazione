import { describe, expect, it } from "vitest";
import { cleanOcrText } from "./ocrClean";

describe("cleanOcrText", () => {
  it("collassa spazi e a capo", () => {
    expect(cleanOcrText("  Gallia est\n omnis  ")).toBe("Gallia est omnis");
  });
  it("sostituisce la barra verticale con l (errore OCR frequente)", () => {
    expect(cleanOcrText("be||um")).toBe("bellum");
  });
  it("normalizza virgolette tipografiche", () => {
    expect(cleanOcrText("«arma» “virumque”")).toBe('"arma" "virumque"');
  });
  it("stringa vuota resta vuota", () => {
    expect(cleanOcrText("   \n  ")).toBe("");
  });
});
