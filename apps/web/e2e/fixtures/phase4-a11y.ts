import { expect, type Page } from '@playwright/test';

/** Effective opaque background checks. Translucent surfaces require separate pixel sampling. */
export async function opaqueTextContrast(page: Page, selector: string) {
  const samples = await page.locator(selector).evaluateAll((elements) => elements.map((el) => {
    const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    const style = getComputedStyle(el);
    let ancestor: Element | null = el;
    let background = rgb(style.backgroundColor);
    while ((background[3] ?? 1) === 0 && ancestor?.parentElement) { ancestor = ancestor.parentElement; background = rgb(getComputedStyle(ancestor).backgroundColor); }
    return { text: el.textContent?.slice(0, 80), foreground: rgb(style.color), background };
  }).filter((sample) => (sample.background[3] ?? 1) === 1));
  const luminance = (rgb: number[]) => rgb.slice(0, 3).map((n) => { const c = n / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i]!, 0);
  return samples.map((sample) => {
    const a = luminance(sample.foreground), b = luminance(sample.background);
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    expect(ratio, sample.text).toBeGreaterThanOrEqual(4.5);
    return { kind: 'opaque-text-contrast', ...sample, ratio };
  });
}
