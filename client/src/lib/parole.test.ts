import { describe, expect, it } from "vitest";
import { contaParole, troncaParole } from "./parole";

describe("limite in parole", () => {
  it("conta le parole anche con spazi e a capo multipli", () => {
    expect(contaParole("Puella rosam videt.")).toBe(3);
    expect(contaParole("  Puella   rosam\nvidet.  ")).toBe(3);
    expect(contaParole("")).toBe(0);
    expect(contaParole("   ")).toBe(0);
  });

  it("tronca sul confine di parola", () => {
    expect(troncaParole("Puella rosam videt fortiter.", 3)).toBe("Puella rosam videt");
    expect(troncaParole("Puella videt.", 10)).toBe("Puella videt.");
    expect(contaParole(troncaParole("a b c d e f", 4))).toBe(4);
  });
});
