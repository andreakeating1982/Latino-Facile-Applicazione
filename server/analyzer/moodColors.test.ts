import { describe, expect, it } from "vitest";
import {
  CASE_COLORS, LEGEND_ITEMS, MOOD_COLORS, OTHER_MOODS_COLOR, shadeForNumber,
  type AnalysisOption, type MoodName, type SentenceGroup,
} from "../../shared/types";
import { optionColor } from "./index";
import { applyRoleOverrides } from "./translationColors";

const OTHERS: MoodName[] = ["imperativo", "infinito", "participio", "gerundio", "gerundivo", "supino"];
const option = (mood: MoodName): AnalysisOption => ({
  lemma: "amo", summary: "", translation: "amare", form: "amare", pos: "verbo",
  mood, freq: 1, desc: mood, raw: "", voice: "attivo",
});

describe("Altri modi verbali — fonte unica marrone, non verde accusativo", () => {
  it.each(OTHERS)("%s usa il nuovo colore anche nel motore grammaticale", mood => {
    expect(MOOD_COLORS[mood]).toBe("#795548");
    expect(optionColor(option(mood))).toBe(OTHER_MOODS_COLOR);
  });
  it("non cambia il verde accusativo, l’indicativo e il congiuntivo", () => {
    expect(CASE_COLORS.accusativo).toBe("#43A047");
    expect(MOOD_COLORS.indicativo).toBe("#EF6C00");
    expect(MOOD_COLORS.congiuntivo).toBe("#AD1457");
  });
  it("la voce condivisa da legenda app, palette ed export usa lo stesso colore, diverso da ogni altra voce/sfumatura", () => {
    const others = LEGEND_ITEMS.find(item => item.key === "altri modi")!;
    expect(others.color).toBe(OTHER_MOODS_COLOR);
    const rest = LEGEND_ITEMS.filter(item => item !== others).flatMap(item =>
      item.numero ? [item.color, shadeForNumber(item.color, "singolare"), shadeForNumber(item.color, "plurale")] : [item.color]);
    expect(rest.map(hex => hex.toLowerCase())).not.toContain(OTHER_MOODS_COLOR.toLowerCase());
    expect(OTHERS.every(mood => MOOD_COLORS[mood] === others.color)).toBe(true);
  });
  it.each(["infinito", "imperativo"])("il percorso ruoli IA/ricolorazione %s propaga il nuovo colore senza chiamate esterne", role => {
    const form = role === "infinito" ? "amare" : "ama";
    const initial = option("indicativo");
    const data: SentenceGroup[] = [{ tokens: [{
      text: form, word: form, trailing: "", isPunct: false,
      analysis: { word: form, display: form, options: [initial], selected: 0, category: "verbo", color: MOOD_COLORS.indicativo, label: "indicativo", source: "manuale" },
    }] }];
    applyRoleOverrides(data, { [form]: role });
    const a = data[0].tokens[0].analysis!;
    expect(a.color).toBe(OTHER_MOODS_COLOR);
    expect(a.options[a.selected].mood).toBe(role);
  });
});

