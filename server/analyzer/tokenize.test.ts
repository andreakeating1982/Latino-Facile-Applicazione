import { describe, expect, it } from "vitest";
import { tokenizeText } from "./index";

describe("tokenizeText — spezzatura delle frasi", () => {
  it("un ritorno a capo interno NON spezza la frase (testo incollato da PDF/foto)", () => {
    const s = tokenizeText("Nautarum perseverantiam atque industriam\nlaudamus.");
    expect(s).toHaveLength(1);
    expect(s[0]).toHaveLength(5);
    expect(s[0][4]).toContain("laudamus");
  });

  it("la punteggiatura . ! ? ; : spezza come sempre", () => {
    const s = tokenizeText("Puella videt. Vir venit! Quo vadis? Cave; scribe: vale.");
    expect(s).toHaveLength(6);
  });

  it("punto + ritorno a capo = nuova frase", () => {
    const s = tokenizeText("Discipulae narrant.\nAgricolae lunam amant.");
    expect(s).toHaveLength(2);
    expect(s[1][0]).toBe("Agricolae");
  });

  it("riga vuota di paragrafo spezza anche senza punteggiatura", () => {
    const s = tokenizeText("arma virumque\n\ncano");
    expect(s).toHaveLength(2);
  });

  it("a capo con spazi intermedi conta come riga vuota", () => {
    const s = tokenizeText("arma virumque\n \ncano");
    expect(s).toHaveLength(2);
  });

  it("testo reale a 3 frasi incollato con a capo di pagina → 3 frasi intere", () => {
    const testo =
      "Discipulae et magistra Romae gloriam narrant.\n" +
      "Nautarum perseverantiam atque industriam\n" +
      "laudamus.\n" +
      "Agricolae lunam amant sed umbras timent.";
    const s = tokenizeText(testo);
    expect(s).toHaveLength(3);
    expect(s[1][0]).toBe("Nautarum");
    expect(s[1].some((t) => t.includes("laudamus"))).toBe(true);
    expect(s[2][0]).toBe("Agricolae");
  });
});
