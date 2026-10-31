import { describe, expect, it } from "vitest";
import { tokenizeText } from "./index";

describe("tokenizeText — numeri di elenco non diventano frasi", () => {
  it("«1. … 2. …» su una riga: solo le frasi, senza i numeri", () => {
    const s = tokenizeText("1. Avia puellis fabulas narrat. 2. Romani dona dant.");
    expect(s).toHaveLength(2);
    expect(s[0][0]).toBe("Avia");
    expect(s[1][0]).toBe("Romani");
  });

  it("elenchi con parentesi e numeri romani", () => {
    const s = tokenizeText("(1) Puella videt. (2) Puer audit. IV. Agricola arat.");
    expect(s.map((t) => t[0])).toEqual(["Puella", "Puer", "Agricola"]);
  });

  it("voci IA separate da riga vuota (foto con frasi numerate)", () => {
    const s = tokenizeText("1. Avia narrat.\n\n2. Romani dant.\n\n3. Incolae aedificant.");
    expect(s).toHaveLength(3);
    expect(s.every((t) => !/^\d/.test(t[0] ?? ""))).toBe(true);
  });

  it("un numero solo («2.») non diventa una frase a parte", () => {
    const s = tokenizeText("Avia narrat. 2.");
    expect(s).toHaveLength(1);
    expect(s[0][0]).toBe("Avia");
  });

  it("caso reale: foto con 5 frasi numerate → 5 blocchi, niente numeri", () => {
    const ia =
      "1. Avia puellis fabulas antiquas narrat. 2. Romani deorum templis dona pulchra dant. " +
      "3. Incolae parvas casas prope silvam aedificant. 4. Pueri magistri verba diligenter audiunt. " +
      "5. Agricolae equos et porcos in agris curant.";
    const s = tokenizeText(ia);
    expect(s).toHaveLength(5);
    expect(s.map((t) => t[0])).toEqual(["Avia", "Romani", "Incolae", "Pueri", "Agricolae"]);
  });

  it("i prenomi abbreviati (M. C.) NON vengono mangiati", () => {
    const s = tokenizeText("M. Tullius Cicero orat. C. Iulius Caesar venit.");
    expect(s).toHaveLength(2);
    expect(s[0][0]).toBe("M.");
    expect(s[1][0]).toBe("C.");
  });
});
