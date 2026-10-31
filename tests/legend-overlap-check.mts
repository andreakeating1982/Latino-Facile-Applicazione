import { chromium } from 'playwright';
import superjson from 'superjson';
import { optionColor } from '../server/analyzer/index';
import { CASE_COLORS, type AnalysisOption, type TokenData } from '../shared/types';

const BASE = 'http://127.0.0.1:3100';
const samples: [string, Partial<AnalysisOption>][] = [
  ['Amare', { pos: 'verbo', mood: 'infinito' }],
  ['puellam', { pos: 'nome', case: 'accusativo', number: 'singolare' }],
  ['lege', { pos: 'verbo', mood: 'imperativo' }],
];
const tokens: TokenData[] = samples.map(([word, attributes]) => {
  const option = { lemma: word.toLowerCase(), summary: '', translation: '', form: word.toLowerCase(), freq: 1, desc: attributes.mood ?? attributes.case ?? '', raw: '', ...attributes } as AnalysisOption;
  return { text: word, word: word.toLowerCase(), trailing: '', isPunct: false, analysis: { word: word.toLowerCase(), display: word, options: [option], selected: 0, category: option.pos, color: optionColor(option), label: option.desc, source: 'manuale', number: option.number } };
});
const sentences = [{ tokens }];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
await page.route('**/api/trpc/**', async route => {
  const url = new URL(route.request().url());
  const paths = url.pathname.split('/api/trpc/')[1].split(',');
  const results = paths.map(path => {
    let data: unknown = null;
    if (path === 'latino.analyze') data = { sentences, unknownWords: [], apiUsed: false, colorSource: 'regole' };
    if (path === 'latino.translate') data = { coloredSentences: sentences, lines: ['Esempio.'], source: 'ai', colorSource: 'ai' };
    return { result: { data: superjson.serialize(data) } };
  });
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(url.searchParams.get('batch') === '1' ? results : results[0]) });
});
await page.goto(BASE + '/app');
await page.locator('textarea').fill('Amare puellam lege.');
await page.getByRole('button', { name: /Colora la frase con l.intelligenza artificiale/i }).click();
await page.getByRole('button', { name: 'Cambia colore o sottolineatura di amare', exact: true }).waitFor();

// Sovrapposizioni oggettive tra righe di voci DIVERSE della legenda +
// sforamenti oltre il bordo destro del pannello, a ogni larghezza.
const audit = async () => page.evaluate(() => {
  const righe: { item: number; text: string; r: DOMRect }[] = [];
  document.querySelectorAll('[role=listitem]').forEach((item, i) => {
    item.querySelectorAll('div').forEach(el => {
      if (!el.textContent?.trim() || el.children.length > 0) return;
      righe.push({ item: i, text: el.textContent.trim().slice(0, 40), r: el.getBoundingClientRect() });
    });
  });
  const difetti: string[] = [];
  for (let a = 0; a < righe.length; a++) {
    for (let b = a + 1; b < righe.length; b++) {
      const A = righe[a], B = righe[b];
      if (A.item === B.item) continue;
      const overlapY = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top) > 2;
      const overlapX = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left) > 2;
      if (overlapY && overlapX) difetti.push(`sovrapposizione: «${A.text}» ↔ «${B.text}»`);
    }
    const panel = righe[a].r; // controllo sforamento pannello fatto sotto
    void panel;
  }
  const grid = document.querySelector('[role=list]')!.getBoundingClientRect();
  for (const { text, r } of righe) {
    if (r.right > grid.right + 1) difetti.push(`sfora il pannello: «${text}»`);
  }
  // SINGOLARE sulla stessa riga del nome: stessa bbox = una riga sola
  for (const { text, r } of righe) {
    if (text.includes('SINGOLARE')) {
      const lh = parseFloat(getComputedStyle(document.querySelector('[role=listitem] div')!).lineHeight);
      if (r.height > lh * 1.8) difetti.push(`a capo: «${text}»`);
    }
  }
  return difetti;
});
let totale = 0;
for (const width of [320, 360, 393, 480, 600, 768, 1024, 1100, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  const difetti = await audit();
  totale += difetti.length;
  console.log(`${width}px: ${difetti.length === 0 ? 'OK' : 'DIFETTI ' + JSON.stringify(difetti)}`);
}
await browser.close();
console.log(totale === 0 ? 'TUTTO OK' : `TOTALE DIFETTI: ${totale}`);
