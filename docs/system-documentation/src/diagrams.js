import mermaid from '../vendor/mermaid.js';
import { el, button } from './views.js';
import { diagramNodeTarget, itemHref } from './model.js';

let sequence = 0;
// Render only local generated registry records. Never accept Mermaid from hash/search/input.
export async function renderDiagram(host, item, model) {
  if (!host.isConnected) return;
  const code = item.code;
  if (typeof code !== 'string' || !code.trim()) throw new Error('Snapshot chưa có mã Mermaid cho bản ghi này.');
  // Do not let diagram directives override the strict renderer or introduce resources.
  if (/%%\s*\{|^\s*---|(?:https?:|javascript:|data:|@import|url\s*\()/im.test(code)) {
    throw new Error('Sơ đồ chứa cấu hình hoặc tài nguyên ngoài không được hỗ trợ. Hãy xem mã sơ đồ.');
  }
  const dark = document.documentElement.dataset.theme === 'dark';
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true, htmlLabels: false,
    theme: dark ? 'dark' : 'default', maxTextSize: 100000,
    flowchart: { htmlLabels: false, useMaxWidth: false }, er: { useMaxWidth: false },
    sequence: { useMaxWidth: false }, fontFamily: 'Segoe UI, sans-serif',
  });
  const id = `atlas-diagram-${++sequence}`;
  let rendered;
  try { rendered = await mermaid.render(id, code); }
  catch (error) {
    document.getElementById(`d${id}`)?.remove();
    throw new Error(`Không thể vẽ Mermaid: ${error.message || error}`);
  }
  if (!host.isConnected) return;
  const parsed = new DOMParser().parseFromString(rendered.svg, 'image/svg+xml');
  const svg = parsed.documentElement;
  if (svg.localName !== 'svg' || parsed.querySelector('parsererror')) throw new Error('Mermaid trả về SVG không hợp lệ.');
  // Defense in depth; navigation is attached from the registry nodeMap after sanitizing.
  svg.querySelectorAll('script, foreignObject, iframe, image, animate, set').forEach(node => node.remove());
  for (const node of [svg, ...svg.querySelectorAll('*')]) for (const attr of [...node.attributes]) {
    if (/^on/i.test(attr.name) || /href$/i.test(attr.name) || /(?:https?:|javascript:|data:)/i.test(attr.value)) node.removeAttribute(attr.name);
  }
  const base = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
  const original = base?.length === 4 && base.every(Number.isFinite) && base[2] > 0 && base[3] > 0 ? base : [0, 0, 1000, 600];
  let view = [...original];
  svg.removeAttribute('height');
  svg.removeAttribute('width');
  svg.style.maxWidth = 'none';
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', item.name || item.id);
  const viewport = el('div', { class: 'diagram-viewport', tabindex: '0', 'aria-label': 'Sơ đồ. Dùng phím mũi tên để di chuyển, cộng/trừ để zoom, 0 để vừa khung.' });
  viewport.append(document.importNode(svg, true));
  const mounted = viewport.querySelector('svg');
  let linkedNodes = 0;
  for (const node of mounted.querySelectorAll('g.node, g[id]')) {
    const target = diagramNodeTarget(node.id, item.nodeMap, model.byId);
    if (!target) continue;
    node.dataset.atlasItem = target;
    node.setAttribute('role', 'link');
    node.setAttribute('tabindex', '0');
    node.setAttribute('aria-label', `Mở đặc tả: ${model.byId.get(target).name || target}`);
    const open = () => { location.hash = itemHref(target); };
    node.addEventListener('click', event => { event.stopPropagation(); open(); });
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); open(); }
    });
    linkedNodes++;
  }
  if (linkedNodes) mounted.setAttribute('role', 'group');
  const label = el('output', { 'aria-label': 'Mức thu phóng' }, '100%');
  function update() {
    mounted.setAttribute('viewBox', view.join(' '));
    label.textContent = `${Math.round(original[2] / view[2] * 100)}%`;
  }
  function zoom(factor) {
    const nextWidth = view[2] * factor;
    if (nextWidth < original[2] / 8 || nextWidth > original[2] * 5) return;
    view = [view[0] + (view[2] - nextWidth) / 2, view[1] + (view[3] - view[3] * factor) / 2, nextWidth, view[3] * factor];
    update();
  }
  function pan(x, y) { view[0] += view[2] * x; view[1] += view[3] * y; update(); }
  const fit = () => { view = [...original]; update(); };
  const controls = el('div', { class: 'diagram-controls', role: 'group', 'aria-label': 'Điều khiển sơ đồ' },
    button('−', () => zoom(1.25), { 'aria-label': 'Thu nhỏ' }), label,
    button('+', () => zoom(0.8), { 'aria-label': 'Phóng to' }), button('Vừa khung', fit),
    button('←', () => pan(-0.15, 0), { 'aria-label': 'Dịch trái' }), button('↑', () => pan(0, -0.15), { 'aria-label': 'Dịch lên' }),
    button('↓', () => pan(0, 0.15), { 'aria-label': 'Dịch xuống' }), button('→', () => pan(0.15, 0), { 'aria-label': 'Dịch phải' }));
  viewport.addEventListener('keydown', event => {
    if (event.target.closest('[data-atlas-item]')) return;
    const actions = { ArrowLeft: () => pan(-0.1, 0), ArrowRight: () => pan(0.1, 0), ArrowUp: () => pan(0, -0.1), ArrowDown: () => pan(0, 0.1), '+': () => zoom(0.8), '=': () => zoom(0.8), '-': () => zoom(1.25), '0': fit };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  });
  let drag;
  viewport.addEventListener('pointerdown', event => {
    if (event.target.closest('[data-atlas-item]')) return;
    if (event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, view: [...view] };
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag) return;
    const bounds = mounted.getBoundingClientRect();
    const scale = Math.max(view[2] / bounds.width, view[3] / bounds.height);
    view[0] = drag.view[0] - (event.clientX - drag.x) * scale;
    view[1] = drag.view[1] - (event.clientY - drag.y) * scale;
    update();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) viewport.addEventListener(name, () => { drag = null; });
  host.replaceChildren(controls, viewport, el('p', { class: 'diagram-hint' }, 'Kéo nền để di chuyển; dùng các nút hoặc bàn phím để thu phóng. Click nút sơ đồ hoặc nhấn Enter khi focus để mở đặc tả. Danh sách bản ghi bên dưới là cách truy cập thay thế.'));
  update();
}
