import type { Locator, Page } from '@playwright/test';

export function contrastRatio(a: number[], b: number[]) {
  const luminance = (rgb: number[]) => rgb.slice(0, 3).map(n => {
    const c = n / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i]!, 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

export async function measureGlassText(page: Page, surface: Locator) {
  const candidates = surface.locator('.workspace-nav-group-label:visible,.brand-logo:visible,.public-brand-link:visible,p:visible,small:visible');
  const target = await candidates.count() ? candidates.first() : surface;
  await target.scrollIntoViewIfNeeded();
  const ink = await target.evaluate(el => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent || node.textContent.trim().length < 2) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      const rectangles = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0);
      if (!rectangles.length) continue;
      const owner = node.parentElement!;
      const style = getComputedStyle(owner);
      let ancestorOpacity = 1;
      for (let parent: Element | null = owner; parent; parent = parent.parentElement) ancestorOpacity *= Number(getComputedStyle(parent).opacity);
      return { text: node.textContent.trim(), foreground: style.color.match(/[\d.]+/g)!.map(Number), ancestorOpacity, rectangles: rectangles.map(r => ({ left: r.left, top: r.top, width: r.width, height: r.height })), points: rectangles.flatMap(r => [.15, .5, .85].map(f => ({ x: r.left + r.width * f, y: r.top + r.height / 2 }))).filter(p => p.x >= 0 && p.y >= 0 && p.x < innerWidth && p.y < innerHeight) };
    }
    throw new Error('No rendered text range in glass sample');
  });
  if (!ink.points.length) throw new Error('Text sample is outside viewport');
  // Group opacity requires an additional offscreen compositing model; never silently certify it.
  if (ink.ancestorOpacity !== 1) throw new Error(`Unsupported group opacity ${ink.ancestorOpacity}`);
  const original = await target.getAttribute('style');
  try {
    // Suppress only glyph paint. Backgrounds, blur, layout and DOM identity stay in place.
    await target.evaluate(el => { (el as HTMLElement).style.setProperty('-webkit-text-fill-color', 'transparent', 'important'); (el as HTMLElement).style.setProperty('text-shadow', 'none', 'important'); });
    const png = await page.screenshot({ animations: 'disabled' });
    const backgrounds = await page.evaluate(async ({ data, points }) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
      return points.map(p => [...ctx.getImageData(Math.floor(p.x * img.width / innerWidth), Math.floor(p.y * img.height / innerHeight), 1, 1).data].slice(0, 3));
    }, { data: png.toString('base64'), points: ink.points });
    const samples = backgrounds.map((background, index) => {
      const alpha = ink.foreground[3] ?? 1;
      const foreground = background.map((value, channel) => ink.foreground[channel]! * alpha + value * (1 - alpha));
      return { point: ink.points[index], background, effectiveForeground: foreground, ratio: contrastRatio(foreground, background) };
    });
    return { ...ink, samples, ratio: Math.min(...samples.map(sample => sample.ratio)), ...await surface.evaluate(el => ({ class: el.className, variant: el.getAttribute('data-glass-variant'), filter: getComputedStyle(el).backdropFilter })) };
  } finally {
    await target.evaluate((el, saved) => { if (saved === null) el.removeAttribute('style'); else el.setAttribute('style', saved); }, original);
  }
}
