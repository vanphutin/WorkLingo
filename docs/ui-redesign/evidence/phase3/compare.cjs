// Arrange existing, unedited browser PNGs. This script does not render mock UI.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('../../../../apps/web/node_modules/@playwright/test');

const pairs = [
  ['public-desktop', 'public', 1440, 900],
  ['learner-desktop', 'learner', 1440, 900],
  ['learner-mobile', 'learner', 390, 844],
  ['admin-desktop', 'admin', 1440, 900],
  ['admin-mobile', 'admin', 390, 844],
  ['focus-mobile', 'focus', 390, 844],
];

(async () => {
  const browser = await chromium.launch();
  const comparisons = [];
  try {
    for (const theme of ['light', 'dark']) for (const [name, kind, width, height] of pairs) {
      const files = [`before-${name}-${theme}.png`, `after-${kind}-${theme}-${width}.png`];
      const page = await browser.newPage({ viewport: { width: width === 390 ? 840 : 1500, height: 1 }, deviceScaleFactor: 1 });
      const articles = files.map((file, index) => `<article><h2>${index === 0 ? 'TRƯỚC PHASE 3 · 429a8d0' : 'SAU PHASE 3 · production'}</h2><img alt="${index ? 'Sau' : 'Trước'}" src="data:image/png;base64,${fs.readFileSync(path.join(__dirname, file)).toString('base64')}"></article>`).join('');
      await page.setContent(`<html lang="vi"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#eceef3;color:#1c1c1e;font:14px system-ui}h1{font-size:20px;margin:0 0 8px}p{margin:0 0 16px}section{display:grid;grid-template-columns:1fr 1fr;gap:20px}article{min-width:0}h2{font-size:12px;margin:0 0 12px}img{display:block;width:100%;height:auto}</style><h1>${name} · ${theme}</h1><p>Route/component thật · VI · Chromium · viewport ${width}×${height} · cùng network fixture</p><section>${articles}</section></html>`);
      await page.locator('img').evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
      const comparison = `compare-${name}-${theme}.png`;
      await page.screenshot({ path: path.join(__dirname, comparison), fullPage: true });
      comparisons.push({ name, theme, width, height, files, comparison });
      await page.close();
    }
  } finally { await browser.close(); }
  const pngs = fs.readdirSync(__dirname).filter((file) => file.endsWith('.png')).map((file) => ({
    file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex'),
  }));
  fs.writeFileSync(path.join(__dirname, 'visual-manifest.json'), JSON.stringify({
    before: '429a8d0a79707e7d6f9677502349cfd0b132e9b3',
    after: '307829b24b402312897e317b9186933b62359cb3',
    source: 'Existing real Next routes, intercepted network contracts; no live authentication/backend',
    method: 'Unedited original full-page PNGs arranged as HTML images; desktop scaled equally to fit comparison sheet. Open-state PNGs are fixed viewport captures.',
    comparisons, pngs,
  }, null, 2) + '\n');
  console.log(`${comparisons.length} comparisons; ${pngs.length} PNGs hashed.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
