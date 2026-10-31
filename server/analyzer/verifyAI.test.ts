import { describe, it, expect } from "vitest";
import { parseVerification, parseRoles } from "./verifyAI";

const words = new Set([
  "tutamque",
  "nobiscum",
  "incolae",
  "insulae",
  "procellas",
  "timent",
  "roma",
  "in",
  "italia",
  "est",
  "puellae",
  "rosas",
  "amat",
  "nuntiatur",
]);

describe("parseVerification", () => {
  it("estrae traduzioni e ruoli validi dal JSON dell'IA", () => {
    const raw = JSON.stringify({
      traduzioni: ["Gli abitanti dell'isola temono le tempeste."],
      ruoli: {
        incolae: "nominativo",
        insulae: "genitivo",
        procellas: "accusativo",
        timent: "verbo",
      },
    });
    const res = parseVerification(raw, 1, words);
    expect(res).not.toBeNull();
    expect(res!.lines).toEqual(["Gli abitanti dell'isola temono le tempeste."]);
    expect(res!.roles["insulae"]).toBe("genitivo");
  });

  it("scarta ruoli non validi e parole fuori dalla frase", () => {
    const raw = JSON.stringify({
      traduzioni: ["Roma è in Italia."],
      ruoli: {
        roma: "nominativo",
        in: "funzione",
        italia: "ablativo",
        est: "verbo",
        caesar: "nominativo", // parola assente → scartata
      },
    });
    const res = parseVerification(raw, 1, words);
    expect(res).not.toBeNull();
    expect(res!.roles["caesar"]).toBeUndefined();
    expect(res!.roles["roma"]).toBe("nominativo");
  });

  it("26/10u: con meno traduzioni del previsto tiene le valide e le altre sono null", () => {
    const raw = JSON.stringify({
      traduzioni: ["una sola"],
      ruoli: { roma: "nominativo" },
    });
    const res = parseVerification(raw, 2, words);
    expect(res).not.toBeNull();
    // l'array può essere più corto del previsto: il chiamante copre con
    // `r.lines[k] ?? null`
    expect(res!.lines).toEqual(["una sola"]);
  });

  it("estrae anche i numeri (singolare/plurale) e scarta i valori non validi", () => {
    const raw = JSON.stringify({
      traduzioni: ["Gli abitanti dell'isola temono le tempeste."],
      ruoli: { incolae: "nominativo", insulae: "genitivo", timent: "verbo" },
      numeri: {
        incolae: "plurale",
        insulae: "singolare",
        timent: "plurale",
        roma: "doppio", // valore non valido → scartato
        caesar: "plurale", // parola assente → scartata
      },
    });
    const res = parseVerification(raw, 1, words);
    expect(res).not.toBeNull();
    expect(res!.numbers["incolae"]).toBe("plurale");
    expect(res!.numbers["insulae"]).toBe("singolare");
    expect(res!.numbers["timent"]).toBe("plurale");
    expect(res!.numbers["roma"]).toBeUndefined();
    expect(res!.numbers["caesar"]).toBeUndefined();
  });

  it("funziona anche senza l'oggetto «numeri» (mappa vuota)", () => {
    const raw = JSON.stringify({
      traduzioni: ["Roma è in Italia."],
      ruoli: { roma: "nominativo", est: "verbo" },
    });
    const res = parseVerification(raw, 1, words);
    expect(res).not.toBeNull();
    expect(res!.numbers).toEqual({});
  });
});

describe("enclitiche", () => {
  it("estrare le enclitiche valide (base + tipo) dal JSON dell'IA", () => {
    const raw = JSON.stringify({
      traduzioni: ["..."],
      ruoli: { tutamque: "accusativo", nobiscum: "ablativo" },
      enclitiche: {
        tutamque: { base: "accusativo", enclitica: "congiunzione" },
        nobiscum: { base: "ablativo", enclitica: "preposizione" },
      },
    });
    const res = parseVerification(raw, 1, words);
    expect(res).not.toBeNull();
    expect(res!.enclitics["tutamque"]).toEqual({
      base: "accusativo",
      enclitica: "congiunzione",
    });
    expect(res!.enclitics["nobiscum"]).toEqual({
      base: "ablativo",
      enclitica: "preposizione",
    });
  });

  it("scarta enclitiche con base o tipo non validi e parole fuori frase", () => {
    const raw = JSON.stringify({
      traduzioni: ["..."],
      ruoli: { tutamque: "accusativo" },
      enclitiche: {
        tutamque: { base: "caso-inesistente", enclitica: "congiunzione" },
        caesar: { base: "nominativo", enclitica: "congiunzione" }, // fuori frase
        nobiscum: { base: "ablativo", enclitica: "tipo-inesistente" },
      },
    });
    const res = parseVerification(raw, 1, words);
    expect(res).not.toBeNull();
    expect(Object.keys(res!.enclitics)).toHaveLength(0);
  });

  it("funziona anche senza l'oggetto «enclitiche» (mappa vuota)", () => {
    const raw = JSON.stringify({
      traduzioni: ["..."],
      ruoli: { tutamque: "accusativo" },
    });
    const res = parseVerification(raw, 1, words);
    expect(res).not.toBeNull();
    expect(res!.enclitics).toEqual({});
  });
});

describe("parseRoles", () => {
  it("estrae la mappa dei ruoli dalla risposta IA (anche con testo attorno)", () => {
    const raw =
      'Ecco il risultato: {"ruoli": {"incolae": "nominativo", "insulae": "genitivo", "timent": "verbo"}}';
    const roles = parseRoles(raw, words);
    expect(roles).not.toBeNull();
    expect(roles!["incolae"]).toBe("nominativo");
    expect(roles!["insulae"]).toBe("genitivo");
    expect(roles!["timent"]).toBe("verbo");
  });

  it("normalizza maiuscole e ruoli", () => {
    const raw = '{"ruoli": {"Incolae": "NOMINATIVO", "Procellas": "Accusativo"}}';
    const roles = parseRoles(raw, words);
    expect(roles).not.toBeNull();
    expect(roles!["incolae"]).toBe("nominativo");
    expect(roles!["procellas"]).toBe("accusativo");
  });

  it("restituisce null su JSON malformato o senza ruoli validi", () => {
    expect(parseRoles("niente json qui", words)).toBeNull();
    expect(parseRoles('{"ruoli": {"incolae": "fuori"}}', words)).toBeNull();
    expect(parseRoles('{"altro": 1}', words)).toBeNull();
  });
});
