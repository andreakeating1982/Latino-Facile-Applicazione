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
for (const [width, height, name] of [[393, 852, 'mobile-393'], [320, 568, 'mobile-320'], [768, 1024, 'tablet-768'], [1100, 900, 'desktop-1100']] as const) {
  await page.setViewportSize({ width, height });
  await page.getByText('NOMINATIVO SINGOLARE', { exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const legend = page.locator('[role=list]');
  await legend.screenshot({ path: `/tmp/legenda-qa/${name}.png` });
}
await browser.close();
console.log('screenshot OK');
