import { createModel, SECTIONS, belongsToSection, parseRoute, routeHref, paginate, applyRouteFilters } from './model.js';
import { el, link, button, empty, section, overviewView, listView, detailView, traceView, evidenceView, evidenceContent, diagramCard, pager } from './views.js';

const $ = selector => document.querySelector(selector);
let model;
let route = parseRoute(location.hash);
let diagrams;
let diagramQueue = Promise.resolve();
const content = $('#content');

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('#theme-toggle').textContent = theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối';
  $('#theme-toggle').setAttribute('aria-pressed', String(theme === 'dark'));
  $('#theme-toggle').setAttribute('aria-label', theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
}
try { applyTheme(localStorage.getItem('worklingo-atlas-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')); }
catch { applyTheme('light'); }

$('#theme-toggle').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try { localStorage.setItem('worklingo-atlas-theme', theme); } catch { /* Storage may be disabled. */ }
  if (model && content.querySelector('.diagram-host')) render(false);
});

const mobileSidebar = matchMedia('(max-width: 900px)');
function setMenu(open, focus = false) {
  document.body.classList.toggle('menu-open', open);
  $('#sidebar').inert = mobileSidebar.matches && !open;
  $('#menu-toggle').setAttribute('aria-expanded', String(open));
  $('#sidebar-scrim').hidden = !open;
  if (focus) (open ? $('#primary-nav a') : $('#menu-toggle'))?.focus();
}
setMenu(false);
mobileSidebar.addEventListener('change', () => setMenu(false));
$('#menu-toggle').addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open'), true));
$('#sidebar-scrim').addEventListener('click', () => setMenu(false, true));
$('#sidebar').addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false, true);
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#global-search').focus(); }
  if (event.key === 'Tab' && document.body.classList.contains('menu-open') && matchMedia('(max-width: 900px)').matches) {
    const links = [...$('#sidebar').querySelectorAll('a')];
    if (event.shiftKey && document.activeElement === links[0]) { event.preventDefault(); links.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === links.at(-1)) { event.preventDefault(); links[0].focus(); }
  }
});
document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); $('#main').focus(); });

for (const entry of SECTIONS) $('#primary-nav').append(link(el('span', {}, entry.label, el('small', {}, entry.english)), `#${entry.id}`, { 'data-section': entry.id }));
$('#primary-nav').append(link('Toàn bộ registry', '#search', { class: 'all-records', 'data-section': 'search' }));

function navigate(next) { const hash = routeHref(next); if (location.hash === hash) render(); else location.hash = hash; }
window.addEventListener('hashchange', () => { route = parseRoute(location.hash); render(); });
$('#search-form').addEventListener('submit', event => {
  event.preventDefault();
  navigate({ section: 'search', filters: { ...route.filters, q: $('#global-search').value.trim(), kind: '', method: '', authentication: '' }, page: 1 });
});
$('#filters').addEventListener('submit', event => event.preventDefault());
$('#filters').addEventListener('change', () => {
  const filters = { ...route.filters, ...Object.fromEntries(new FormData($('#filters'))) };
  navigate(applyRouteFilters(route, filters));
});
$('#reset-filters').addEventListener('click', () => navigate({ ...route, filters: {}, page: 1 }));

const dialog = $('#evidence-dialog');
$('#close-evidence').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

function onEvidence(item) {
  $('#evidence-title').textContent = `Bằng chứng: ${item.name || item.id}`;
  $('#evidence-content').replaceChildren(evidenceContent(item.evidence, model));
  dialog.showModal();
}

function onDiagram(host, item) {
  // Mermaid has shared renderer state; serialize graphs, and discard detached views.
  diagramQueue = diagramQueue.then(async () => {
    if (!host.isConnected) return;
    try {
      diagrams ||= import('./diagrams.js');
      const renderer = await diagrams;
      await renderer.renderDiagram(host, item, model);
    } catch (error) {
      if (host.isConnected) host.replaceChildren(el('div', { class: 'notice danger', role: 'status' }, el('strong', {}, 'Sơ đồ chưa hiển thị được'),
        el('p', {}, String(error.message || error)), el('p', {}, 'Kiểm tra bundle vendor/mermaid.js hoặc mã sơ đồ. Danh sách bản ghi liên quan vẫn sử dụng được.')));
    }
  });
}

function options(select, values, label = value => value) {
  const first = select.options[0];
  select.replaceChildren(first, ...values.map(value => el('option', { value }, label(value))));
}

function setupFilters() {
  const moduleIds = [...new Set([...model.items.map(item => item.module || (item.kind === 'module' ? item.id : '')), ...model.coverage.map(row => row.module)])].filter(Boolean).sort();
  options($('#module-filter'), moduleIds, id => model.byId.get(id)?.name ? `${model.byId.get(id).name} (${id})` : id);
  options($('#status-filter'), [...new Set(['VERIFIED', 'INFERRED', 'DOCUMENTED_ONLY', 'UNKNOWN', 'CONFLICT', ...model.items.map(item => item.status).filter(Boolean)])]);
  options($('#kind-filter'), [...new Set(model.items.map(item => item.kind).filter(Boolean))].sort());
  options($('#method-filter'), [...new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', ...model.items.filter(item => item.kind === 'api').map(item => item.method).filter(Boolean)])].sort());
  options($('#auth-filter'), [...new Set(['PUBLIC', 'SESSION_COOKIE', 'GUARD_PRESENT', 'NO_LOCAL_GUARD', 'UNKNOWN', ...model.items.filter(item => item.kind === 'api').map(item => item.authentication).filter(Boolean)])]);
}

const descriptions = {
  overview: 'Khám phá snapshot, phạm vi phân tích và nguồn chứng minh.',
  architecture: 'Ngữ cảnh, container và phụ thuộc được ghi nhận trong repository.',
  modules: 'Ranh giới module, lớp, phụ thuộc và tệp nguồn.',
  requirements: 'Yêu cầu có liên kết đến hành vi và mã nguồn.',
  'use-cases': 'Tác nhân, mục tiêu, điều kiện và luồng thực thi được phân tích.',
  rules: 'Điều kiện, ràng buộc và quy tắc có bằng chứng.',
  domain: 'Entity, enum, trường dữ liệu, chỉ mục và quan hệ FK.',
  states: 'Trạng thái và chuyển tiếp đã được ghi nhận.',
  sequences: 'Sequence, activity và request flow có thể truy vết.',
  apis: 'Khám phá endpoint, guards, tham số và response khai báo.',
  security: 'Kiểm soát truy cập và ranh giới tin cậy được phân tích.',
  'data-flow': 'Luồng dữ liệu, tích hợp và thay đổi schema được ghi nhận.',
  testing: 'Danh mục test được tìm thấy. Execution: NOT_RUN. Không phải kết quả chạy test hay runtime coverage.',
  traceability: 'Theo dõi liên kết đi và tham chiếu ngược giữa các loại bản ghi.',
  gaps: 'Findings, bằng chứng mâu thuẫn và phần chưa đủ thông tin.',
  evidence: 'Inventory tệp nguồn, vị trí symbol, dòng và hash snapshot.',
  search: 'Tìm xuyên toàn bộ registry, bao gồm các loại ngoài điều hướng chính.',
  browse: 'Danh mục theo loại bản ghi trong registry.',
};

function render(focus = true) {
  if (!model) return;
  if (dialog.open) dialog.close();
  content.setAttribute('aria-busy', 'true');
  const current = SECTIONS.find(entry => entry.id === route.section);
  const item = route.section === 'item' ? model.byId.get(route.id) : null;
  const title = item?.name || (route.section === 'item' ? 'Không tìm thấy bản ghi' : current?.label || ({ browse: `Danh mục: ${route.kind}`, search: 'Tìm kiếm toàn hệ thống', 'not-found': 'Không tìm thấy trang' }[route.section]));
  document.title = `${title} · WorkLingo System Atlas`;
  $('#breadcrumbs').replaceChildren(link('Atlas', '#overview'), el('span', { 'aria-hidden': 'true' }, '/'));
  if (item) $('#breadcrumbs').append(link(item.kind, `#browse/${encodeURIComponent(item.kind)}`), el('span', { 'aria-hidden': 'true' }, '/'));
  $('#breadcrumbs').append(el('span', { 'aria-current': 'page' }, item?.id || title));
  $('#page-heading').replaceChildren(el('h1', {}, title), el('p', { class: 'page-description' }, descriptions[route.section] || (item ? `${item.kind} · ${item.id}` : 'Địa chỉ không có trong snapshot này.')));
  for (const anchor of $('#primary-nav').querySelectorAll('a')) {
    if (anchor.dataset.section === route.section) anchor.setAttribute('aria-current', 'page'); else anchor.removeAttribute('aria-current');
  }
  $('#global-search').value = route.filters.q || '';
  const showFilters = !['item', 'not-found', 'overview'].includes(route.section);
  $('#filters').hidden = !showFilters;
  for (const control of $('#filters').querySelectorAll('select')) {
    // Preserve filters from a deep link even when its value is not present in this snapshot.
    const value = (route.section === 'browse' && control.name === 'kind' ? route.kind : route.filters[control.name]) || '';
    if (value && ![...control.options].some(option => option.value === value)) control.append(el('option', { value }, value));
    control.value = value;
  }
  const isApi = ['apis', 'search'].includes(route.section) || route.kind === 'api' || route.filters.kind === 'api';
  document.querySelectorAll('.api-filter').forEach(label => { label.hidden = !isApi; });
  const ctx = { model, route, navigate, onEvidence, onDiagram };
  let items = model.query({ ...route.filters, kind: route.section === 'browse' ? route.kind : route.filters.kind });
  if (!['search', 'browse'].includes(route.section)) items = items.filter(item => belongsToSection(item, route.section));
  $('#results-status').textContent = showFilters ? `${items.length.toLocaleString('vi-VN')} bản ghi phù hợp${route.filters.q ? ` với “${route.filters.q}”` : ''}` : '';
  if (route.section === 'evidence') {
    const evidence = model.evidence(route.filters);
    $('#results-status').textContent = `${evidence.items.length.toLocaleString('vi-VN')} bản ghi có bằng chứng · ${evidence.inventory.length.toLocaleString('vi-VN')} tệp nguồn (inventory lọc theo từ khóa, module và tệp)`;
  }
  if (route.section === 'overview') content.replaceChildren(overviewView(ctx));
  else if (route.section === 'item') content.replaceChildren(item ? detailView(item, ctx) : el('div', {}, empty(`ID “${route.id}” không có trong snapshot. Liên kết có thể đã cũ.`), link('Tìm trong registry', '#search')));
  else if (route.section === 'not-found') content.replaceChildren(empty('Đường dẫn không hợp lệ. Chọn một phần trong sidebar hoặc trở về Tổng quan.'), link('Về tổng quan', '#overview'));
  else if (route.section === 'evidence') content.replaceChildren(evidenceView(items, ctx));
  else if (route.section === 'traceability') content.replaceChildren(traceView(items, ctx));
  else {
    const graphs = items.filter(item => item.kind === 'diagram');
    const records = items.filter(item => item.kind !== 'diagram');
    if (['search', 'browse'].includes(route.section)) content.replaceChildren(listView(items, ctx));
    else {
      content.replaceChildren();
      if (graphs.length) {
        const page = paginate(graphs, route.page, 4);
        const graphSection = section('Sơ đồ có bằng chứng', page.items.map(graph => diagramCard(graph, ctx)));
        const controls = pager(page, page => navigate({ ...route, page }));
        if (controls) graphSection.append(controls);
        content.append(graphSection);
      }
      if (records.length) content.append(section('Danh mục', listView(records, ctx)));
      if (!items.length) content.append(empty());
      if (route.section === 'security') content.append(section('Đối chiếu quyền truy cập API', link('Mở API explorer với bộ lọc authentication', '#apis'), el('p', { class: 'muted' }, 'Guard cục bộ không mô tả toàn bộ cơ chế bảo mật của endpoint.')));
    }
  }
  buildToc();
  content.setAttribute('aria-busy', 'false');
  if (focus) { $('#main').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
}

function buildToc() {
  $('#toc').replaceChildren();
  const headings = [...content.querySelectorAll('h2, .attribute-section > h3')];
  for (const [index, heading] of headings.entries()) {
    heading.id = `atlas-heading-${index}`;
    heading.tabIndex = -1;
    $('#toc').append(button(heading.textContent, () => { heading.scrollIntoView({ block: 'start' }); heading.focus({ preventScroll: true }); }));
  }
  if (!headings.length) $('#toc').append(el('p', { class: 'muted' }, 'Chọn bản ghi để đọc đặc tả và nguồn.'));
}

async function load() {
  content.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('./data/system.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || !Array.isArray(data.items)) throw new Error('Snapshot thiếu mảng items.');
    model = createModel(data);
    $('#snapshot-label').textContent = `${String(model.meta.commit || 'UNKNOWN').slice(0, 12)}${model.meta.dirty === true ? ' · working tree có thay đổi' : model.meta.dirty === false ? ' · snapshot sạch' : ' · dirty: UNKNOWN'}`;
    setupFilters();
    render(false);
  } catch (error) {
    $('#page-heading').replaceChildren(el('h1', {}, 'Chưa tải được snapshot'));
    content.replaceChildren(el('div', { class: 'notice danger', role: 'alert' }, el('p', {}, `Không đọc được data/system.json: ${error.message}`),
      el('p', {}, 'Phục vụ thư mục này bằng HTTP và kiểm tra snapshot đã được tạo. Không mở trực tiếp bằng file://.'), button('Thử tải lại', load)));
    content.setAttribute('aria-busy', 'false');
    $('#snapshot-label').textContent = 'Snapshot chưa sẵn sàng';
  }
}
load();
