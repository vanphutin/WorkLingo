const { firefox } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await firefox.launch();
  try {
    const page = await browser.newPage();
    const css = fs.readFileSync(path.resolve(__dirname, '../../src/styles/glass.css'), 'utf8');
    await page.setContent('<style>:root{--surface-elevated:white;--glass-blur:20px;--glass-bg:#ffffffaa;--glass-saturation:1.8;--glass-tint:transparent}</style><style>' + css + '</style><div class="glass-surface" data-glass-variant="regular">Glass</div>');
    const inspect = () => page.evaluate(() => ({ single: matchMedia('(prefers-contrast: more)').matches, combined: matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)').matches, filter: getComputedStyle(document.querySelector('.glass-surface')).backdropFilter, rules: [...document.styleSheets].flatMap(sheet => [...sheet.cssRules]).filter(rule => rule.type === CSSRule.MEDIA_RULE).map(rule => ({ condition: rule.conditionText, matches: matchMedia(rule.conditionText).matches })) }));
    const before = await inspect(); await page.emulateMedia({ contrast: 'more' }); const after = await inspect();
    await page.addStyleTag({ content: '/* force stylesheet invalidation only */' }); const emptyStyle = await inspect();
    await page.setContent('<style>:root{--surface-elevated:white;--glass-blur:20px;--glass-bg:#ffffffaa;--glass-saturation:1.8;--glass-tint:transparent}</style><style>' + css + '</style><div class="glass-surface" data-glass-variant="regular">Glass</div>');
    const activeAtParse = await inspect();
    await page.setContent('<style>:root{--surface-elevated:white;--glass-blur:20px;--glass-bg:#ffffffaa;--glass-saturation:1.8;--glass-tint:transparent}</style><style>' + css.replace('(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)', '(prefers-contrast: more), (forced-colors: active), (prefers-reduced-transparency: reduce)') + '</style><div class="glass-surface" data-glass-variant="regular">Glass</div>');
    const reordered = await inspect();
    await page.emulateMedia({ contrast: 'no-preference' }); const reorderedNormal = await inspect();
    await page.emulateMedia({ contrast: 'more' }); const reorderedDynamic = await inspect();
    await page.addStyleTag({ content: '@media(prefers-contrast:more){.glass-surface.glass-surface{backdrop-filter:none;outline:10px solid red}}' });
    const addedRule = await inspect();
    const outline = await page.locator('.glass-surface').evaluate(el => getComputedStyle(el).outlineWidth);
    await page.emulateMedia({ contrast: 'no-preference' }); await page.emulateMedia({ contrast: 'more' });
    const toggled = await inspect();
    const variants = [];
    for (const condition of ['(prefers-contrast: more)', '(prefers-contrast: more), (forced-colors: active)', '(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)']) {
      const probe = await browser.newPage();
      await probe.setContent('<style>.probe{color:rgb(0,0,0)}@media ' + condition + '{.probe{color:rgb(255,0,0)}}</style><div class="probe">Test</div>');
      const read = () => probe.locator('.probe').evaluate(el => getComputedStyle(el).color);
      const normal = await read(); await probe.emulateMedia({ contrast: 'more' }); const more = await read(); await probe.emulateMedia({ contrast: 'no-preference' }); const restored = await read();
      variants.push({ condition, normal, more, restored }); await probe.close();
    }
    console.log(JSON.stringify({ before, after, emptyStyle, activeAtParse, reordered, reorderedNormal, reorderedDynamic, addedRule, outline, toggled, variants, browser: browser.version() }, null, 2));
  } finally { await browser.close(); }
})();
