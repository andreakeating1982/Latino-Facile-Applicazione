import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import superjson from 'superjson';
import { optionColor } from '../server/analyzer/index';
import { CASE_COLORS, OTHER_MOODS_COLOR, shadeForNumber, type AnalysisOption, type TokenData } from '../shared/types';

// Controllo UI e PDF, non accuratezza linguistica. Nessuna chiamata IA reale.
const BASE = process.env.COLOR_QA_BASE_URL ?? 'http://127.0.0.1:3000';
const OUT = process.env.COLOR_QA_OUTPUT ?? '/tmp/latino-color-qa';
await fs.mkdir(OUT, { recursive: true });
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
const checks: { name: string; ok: boolean; detail?: unknown }[] = [];
function check(name: string, ok: boolean, detail?: unknown) { checks.push({ name, ok, detail }); if (!ok) throw new Error(name); }
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
const errors: string[] = [];
page.on('pageerror', e => errors.push(e.message));
await page.route('**/api/trpc/**', async route => {
  const url = new URL(route.request().url());
  const paths = url.pathname.split('/api/trpc/')[1].split(',');
  const results = paths.map(path => {
    let data: unknown = null;
    if (path === 'latino.analyze') data = { sentences, unknownWords: [], apiUsed: false, colorSource: 'regole' };
    if (path === 'latino.translate') data = { coloredSentences: sentences, lines: ['Esempio di collaudo.'], source: 'ai', colorSource: 'ai' };
    return { result: { data: superjson.serialize(data) } };
  });
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(url.searchParams.get('batch') === '1' ? results : results[0]) });
});
try {
  await page.goto(BASE + '/app?nome=QA&cognome=Test&classe=2A&data=28%2F10%2F2026');
  await page.locator('textarea').fill('Amare puellam lege.');
  await page.getByRole('button', { name: 'Colora la frase con l’intelligenza artificiale', exact: false }).count().then(async count => {
    if (count) await page.getByRole('button', { name: 'Colora la frase con l’intelligenza artificiale', exact: false }).click();
    else await page.getByRole('button', { name: /Colora la frase con l.intelligenza artificiale/i }).click();
  });
  const chip = page.getByRole('button', { name: 'Cambia colore o sottolineatura di amare', exact: true });
  await chip.waitFor();
  const brown = 'rgb(121, 85, 72)';
  check('infinito e imperativo marroni', await chip.evaluate(el => getComputedStyle(el).backgroundColor) === brown && await page.getByRole('button', { name: 'Cambia colore o sottolineatura di lege', exact: true }).evaluate(el => getComputedStyle(el).backgroundColor) === brown);
  const green = shadeForNumber(CASE_COLORS.accusativo, 'singolare');
  const greenRGB = `rgb(${[1, 3, 5].map(i => parseInt(green.slice(i, i + 2), 16)).join(', ')})`;
  check('accusativo conserva il verde singolare', await page.getByRole('button', { name: /Cambia colore o sottolineatura di puellam/ }).evaluate(el => getComputedStyle(el).backgroundColor) === greenRGB);
  const legendColor = await page.getByText('ALTRI MODI VERBALI', { exact: true }).evaluate(el => getComputedStyle(el.closest('[role=listitem]')!.querySelector('.legend-dot')!).backgroundColor);
  check('legenda con nuovo marrone', legendColor === brown, legendColor);
  // NESSUNA scritta della legenda va a capo o sfora la colonna, a qualunque
  // larghezza (anche mobile e iframe stretti): SINGOLARE resta sempre sulla
  // stessa riga del nome che accompagna.
  const scritteFuoriRiga = async () => page.evaluate(() => {
    const difetti: string[] = [];
    for (const item of document.querySelectorAll('[role=listitem]')) {
      for (const el of item.querySelectorAll('div')) {
        // solo le RIGHE di testo (foglie): i contenitori padre hanno per
        // natura più righe (etichetta + complemento + sottotitolo)
        if (!el.textContent?.trim() || el.children.length > 0) continue;
        if (el.scrollWidth > el.clientWidth + 1) difetti.push('sfora: ' + el.textContent.trim());
        const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize);
        if (el.getBoundingClientRect().height > lh * 1.8) difetti.push('a capo: ' + el.textContent.trim());
      }
    }
    return difetti;
  });
  const larghezzeMobile = process.env.COLOR_QA_LEGEND_WIDTHS ? JSON.parse(process.env.COLOR_QA_LEGEND_WIDTHS) as number[] : [320, 393, 768, 1100];
  for (const width of larghezzeMobile) {
    await page.setViewportSize({ width, height: 900 });
    const difetti = await scritteFuoriRiga();
    check(`legenda su una riga a ${width}px`, difetti.length === 0, difetti);
  }
  await page.setViewportSize({ width: 1100, height: 1000 });
  await chip.click();
  const palette = page.getByRole('button', { name: 'Colore Altri modi verbali', exact: true });
  await palette.waitFor();
  check('palette manuale ha lo stesso marrone', await palette.locator('span').first().evaluate(el => getComputedStyle(el).backgroundColor) === brown);
  await palette.click();
  check('scelta manuale mantiene il colore esatto', await chip.evaluate(el => getComputedStyle(el).backgroundColor) === brown);
  await page.screenshot({ path: OUT + '/legenda-parole.png', fullPage: true });
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: /SCARICA IL PDF/i }).click();
  const download = await downloaded;
  await download.saveAs(OUT + '/legenda-parole-export.pdf');
  check('PDF prodotto dal pulsante reale', (await fs.stat(OUT + '/legenda-parole-export.pdf')).size > 5000);
  check('nessun errore JavaScript', errors.length === 0, errors);
  check('fonte condivisa corretta', OTHER_MOODS_COLOR === '#795548');
} finally {
  await fs.writeFile(OUT + '/results.json', JSON.stringify(checks, null, 2));
  await browser.close();
}
console.log(JSON.stringify(checks, null, 2));

