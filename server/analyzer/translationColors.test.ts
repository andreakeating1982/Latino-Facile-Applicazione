import { describe, it, expect } from "vitest";
import { guessFromEnding } from "./translationColors";

describe("guessFromEnding", () => {
  it("indovina il caso dalle desinenze (PIRATARUM, MINOTAURUM…)", () => {
    expect(guessFromEnding("piratarum")).toEqual({
      caso: "genitivo",
      numero: "plurale",
    });
    expect(guessFromEnding("minotaurum")).toEqual({
      caso: "accusativo",
      numero: "singolare",
    });
    expect(guessFromEnding("nautas")).toEqual({
      caso: "accusativo",
      numero: "plurale",
    });
    expect(guessFromEnding("puellae")).toEqual({
      caso: "genitivo",
      numero: "singolare",
    });
  });

  it("separa l'enclitica e usa la BASE (TOTIDEMQUE = TOTIDEM + que)", () => {
    const g = guessFromEnding("totidemque");
    expect(g).toEqual({
      caso: "accusativo",
      numero: "singolare",
      suffix: "que",
    });
    // cum = enclitica preposizione
    const c = guessFromEnding("ignotocum");
    expect(c?.suffix).toBe("cum");
    // base in -o → ablativo singolare (es. NOBISCUM-style: base + cum)
    expect(c?.caso).toBe("ablativo");
    expect(c?.numero).toBe("singolare");
  });

  it("NON divide le parole intere che finiscono come enclitiche", () => {
    const g = guessFromEnding("atque");
    expect(g?.suffix).toBeUndefined();
    // senza divisione, «atque» viene analizzata come parola intera (-e → ablativo)
    expect(g?.caso).toBe("ablativo");
    expect(g?.numero).toBe("singolare");
  });

  it("restituisce null per parole troppo corte o senza desinenze note", () => {
    expect(guessFromEnding("ab")).toBeNull();
  });
});
