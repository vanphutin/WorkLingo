import { itemHref, paginate, routeHref } from './model.js';

// Registry content always becomes text nodes. Only the diagram renderer accepts SVG.
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'class') node.className = value;
    else if (value !== undefined && value !== null && value !== false) node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) if (child !== undefined && child !== null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}

export const link = (text, href, attrs = {}) => el('a', { href, ...attrs }, text);
export const button = (text, action, attrs = {}) => el('button', { type: 'button', onclick: action, ...attrs }, text);
export const empty = (text = 'Không có bản ghi phù hợp. Thử xóa bộ lọc hoặc tìm một từ khóa khác.') => el('div', { class: 'empty-state' }, el('strong', {}, 'Không có kết quả'), el('p', {}, text));
export function chip(status = 'UNKNOWN') {
  const known = ['VERIFIED', 'INFERRED', 'DOCUMENTED_ONLY', 'UNKNOWN', 'CONFLICT'];
  return el('span', { class: `status-chip ${known.includes(status) ? status.toLowerCase() : 'unknown'}` }, status);
}
export const recordLink = item => link(item.name || item.id, itemHref(item.id), { class: 'record-link' });

export function section(title, ...children) {
  return el('section', { class: 'content-section' }, el('h2', {}, title), children);
}

export function table(headers, rows, caption) {
  return el('div', { class: 'table-scroll', role: 'region', tabindex: '0', 'aria-label': caption },
    el('table', {}, el('caption', { class: 'sr-only' }, caption), el('thead', {}, el('tr', {}, headers.map(h => el('th', { scope: 'col' }, h)))),
      el('tbody', {}, rows.map(cells => el('tr', {}, cells.map(cell => el('td', {}, cell)))))));
}

export function pager(page, onPage) {
  if (page.pages <= 1) return null;
  return el('nav', { class: 'pagination', 'aria-label': 'Phân trang' },
    button('Trang trước', () => onPage(page.page - 1), { disabled: page.page <= 1 }),
    el('span', {}, `Trang ${page.page} / ${page.pages} · ${page.total.toLocaleString('vi-VN')} bản ghi`),
    button('Trang sau', () => onPage(page.page + 1), { disabled: page.page >= page.pages }));
}

export function localPaged(items, render, size = 20) {
  const host = el('div');
  function draw(number = 1) {
    const page = paginate(items, number, size);
    host.replaceChildren(render(page.items));
    const controls = pager(page, n => { draw(n); host.scrollIntoView({ block: 'nearest' }); });
    if (controls) host.append(controls);
  }
  draw();
  return host;
}

export function listView(items, ctx) {
  if (!items.length) return empty();
  const page = paginate(items, ctx.route.page, 25);
  const isApi = ctx.route.section === 'apis' || (ctx.route.section === 'browse' && ctx.route.kind === 'api');
  const headers = isApi ? ['Endpoint', 'Module', 'Authentication', 'Bằng chứng', 'Nguồn'] : ['Bản ghi', 'Loại', 'Module', 'Bằng chứng', 'Nguồn'];
  const rows = page.items.map(item => [
    el('div', {}, isApi ? el('div', { class: 'endpoint' }, el('span', { class: 'method' }, item.method || '?'), link(item.path || item.name || item.id, itemHref(item.id))) : recordLink(item),
      el('small', { class: 'record-id' }, item.id), !isApi && item.description ? el('p', { class: 'row-description' }, item.description) : null),
    ...(isApi ? [] : [link(item.kind || 'UNKNOWN', `#browse/${encodeURIComponent(item.kind || '')}`)]),
    moduleLink(item, ctx.model),
    ...(isApi ? [el('span', {}, item.authentication || 'UNKNOWN')] : []),
    chip(item.status),
    button(`${item.evidence?.length || 0} nguồn`, () => ctx.onEvidence(item), { class: 'text-button' }),
  ]);
  const host = el('div', {}, table(headers, rows, 'Danh mục bản ghi'));
  const controls = pager(page, number => ctx.navigate({ ...ctx.route, page: number }));
  if (controls) host.append(controls);
  return host;
}

function moduleLink(item, model) {
  const id = item.module || (item.kind === 'module' ? item.id : '');
  return id ? link(model.byId.get(id)?.name || id, model.byId.has(id) ? itemHref(id) : routeHref({ section: 'search', filters: { module: id } })) : 'Chưa gán module';
}

const labels = {
  method: 'HTTP method', path: 'Đường dẫn', controller: 'Controller', handler: 'Handler', guards: 'Guards được ghi nhận', globalGuards: 'Global guards', roles: 'Roles được khai báo', authentication: 'Authentication',
  parameters: 'Tham số', declaredResponse: 'Response được khai báo', errors: 'Lỗi được ghi nhận', calls: 'Lời gọi', dtoIds: 'DTO liên quan', fields: 'Các trường',
  primaryKey: 'Khóa chính', uniqueFields: 'Trường duy nhất', uniqueIndexes: 'Ràng buộc duy nhất', indexes: 'Chỉ mục', relations: 'Quan hệ / FK phía sở hữu', tableName: 'Tên bảng',
  dependencies: 'Phụ thuộc', classes: 'Lớp', sourceFiles: 'Tệp nguồn', actor: 'Tác nhân', actors: 'Tác nhân', goal: 'Mục tiêu', trigger: 'Kích hoạt',
  preconditions: 'Tiền điều kiện', mainFlow: 'Luồng chính', alternativeFlows: 'Luồng thay thế', exceptionFlows: 'Luồng ngoại lệ', postconditions: 'Hậu điều kiện',
  businessRules: 'Quy tắc nghiệp vụ', acceptanceCriteria: 'Tiêu chí chấp nhận', relatedApis: 'API liên quan', relatedEntities: 'Entity liên quan',
  relatedRequirements: 'Yêu cầu liên quan', relatedTests: 'Test liên quan', execution: 'Thực thi test', diagramType: 'Loại sơ đồ',
};

// Structured values are browsable at any depth without rendering HTML or guessing URLs.
export function structured(value, model, depth = 0) {
  if (value === null || value === undefined) return el('span', { class: 'muted' }, 'Không có dữ liệu');
  if (typeof value === 'string' && model?.byId.has(value)) return recordLink(model.byId.get(value));
  if (typeof value !== 'object') return el('span', { class: 'value' }, String(value));
  if (depth > 12) return el('pre', {}, JSON.stringify(value, null, 2));
  if (Array.isArray(value)) {
    if (!value.length) return el('span', { class: 'muted' }, 'Không được ghi nhận');
    const objects = value.every(v => v && typeof v === 'object' && !Array.isArray(v));
    if (objects) {
      const columns = [...new Set(value.flatMap(v => Object.keys(v)))];
      return localPaged(value, rows => table(columns, rows.map(row => columns.map(key => structured(row[key], model, depth + 1))), 'Thuộc tính có cấu trúc'));
    }
    return localPaged(value, rows => el('ol', { class: 'structured-list' }, rows.map(v => el('li', {}, structured(v, model, depth + 1)))));
  }
  return el('dl', { class: 'attributes' }, Object.entries(value).map(([key, val]) => el('div', {}, el('dt', {}, labels[key] || key), el('dd', {}, structured(val, model, depth + 1)))));
}

export function evidenceContent(evidence, model) {
  if (!evidence?.length) return empty('Bản ghi chưa cung cấp tham chiếu nguồn. Không có excerpt để hiển thị.');
  return localPaged(evidence, rows => el('div', { class: 'evidence-list' }, rows.map(source => {
    const location = source.lineStart ? `:${source.lineStart}${source.lineEnd ? `–${source.lineEnd}` : ''}` : '';
    return el('article', { class: 'source-entry' }, el('h3', {}, el('code', {}, `${source.file || 'Đường dẫn chưa biết'}${location}`)),
      source.symbol ? el('p', {}, 'Symbol: ', el('code', {}, source.symbol)) : null,
      source.sha256 ? el('p', { class: 'hash' }, 'SHA-256: ', el('code', {}, source.sha256)) : el('p', { class: 'muted' }, 'Chưa có hash nguồn.'),
      source.excerpt !== undefined ? el('pre', { class: 'source-excerpt' }, typeof source.excerpt === 'string' ? source.excerpt : JSON.stringify(source.excerpt, null, 2)) : el('p', { class: 'muted' }, 'Snapshot chỉ chứa vị trí nguồn; không cung cấp đoạn trích.'),
      structured(Object.fromEntries(Object.entries(source).filter(([k]) => !['file', 'symbol', 'lineStart', 'lineEnd', 'sha256', 'excerpt'].includes(k))), model));
  })));
}

export function diagramCard(item, ctx) {
  const host = el('div', { class: 'diagram-host', 'data-diagram-id': item.id }, el('p', {}, 'Đang tải Mermaid cục bộ…'));
  const card = el('article', { class: 'diagram-card' }, el('header', {}, el('h3', {}, recordLink(item)), chip(item.status)), host,
    el('details', {}, el('summary', {}, 'Mã sơ đồ'), el('pre', {}, item.code || 'Chưa có mã sơ đồ.')));
  const rel = ctx.model.relationships(item.id);
  const nodes = [...new Set([...rel.outbound.map(record => record.id), ...Object.values(item.nodeMap || {})])].filter(id => ctx.model.byId.has(id)).map(id => ctx.model.byId.get(id));
  if (nodes.length) card.append(el('details', { open: true }, el('summary', {}, 'Các nút / bản ghi liên quan'),
    localPaged(nodes, rows => el('ul', { class: 'node-links' }, rows.map(record => el('li', {}, recordLink(record)))))));
  queueMicrotask(() => ctx.onDiagram(host, item));
  return card;
}

export function detailView(item, ctx) {
  const host = el('div');
  host.append(section('Thông tin bản ghi', el('div', { class: 'record-meta' }, chip(item.status), el('code', {}, item.id), link(item.kind, `#browse/${encodeURIComponent(item.kind)}`), moduleLink(item, ctx.model)),
    el('p', { class: 'prose' }, item.description || 'Chưa có mô tả được ghi nhận.')));
  if (item.kind === 'api') host.append(el('p', { class: 'notice' }, 'Authentication và guards phản ánh kết quả phân tích của snapshot, bao gồm global guards nếu được cung cấp. GUARD_PRESENT / NO_LOCAL_GUARD chỉ là thông tin guard cục bộ; không tự suy ra quyền truy cập công khai. Response là khai báo tĩnh, chưa xác nhận serialization runtime.'));
  if (item.kind === 'module') host.append(el('p', { class: 'notice' }, 'Inventory và metadata cấu trúc không xác nhận toàn bộ hành vi của module. Phạm vi hành vi đã review được ghi riêng trong bảng coverage.'));
  if (item.kind === 'entity') host.append(el('p', { class: 'notice' }, 'Quan hệ FK chỉ hiển thị phía thực sự sở hữu khóa ngoại. Trường quan hệ dạng danh sách không tự tạo FK.'));
  if (item.kind === 'test') host.append(el('p', { class: 'notice' }, `Thực thi: ${item.execution || 'NOT_RUN'}. Có tệp test không đồng nghĩa test đã chạy thành công.`));
  if (item.kind === 'diagram') host.append(section('Sơ đồ', diagramCard(item, ctx)));
  const attributes = Object.entries(item).filter(([key]) => !['id', 'kind', 'name', 'module', 'status', 'description', 'evidence', 'relatedIds', 'code'].includes(key));
  if (attributes.length) host.append(section('Đặc tả chi tiết', el('div', { class: 'detail-fields' }, attributes.map(([key, value]) =>
    el('section', { class: 'attribute-section' }, el('h3', {}, labels[key] || key), structured(value, ctx.model))))));
  const rel = ctx.model.relationships(item.id);
  host.append(section('Quan hệ truy vết', el('div', { class: 'relationship-columns' },
    relationshipList('Liên kết đi', rel.outbound), relationshipList('Được tham chiếu bởi', rel.inbound)),
    rel.missing.length ? el('p', { class: 'notice danger' }, `ID chưa được resolve: ${rel.missing.join(', ')}`) : null));
  host.append(section('Bằng chứng nguồn', button('Mở bảng bằng chứng', () => ctx.onEvidence(item)), evidenceContent(item.evidence, ctx.model)));
  return host;
}

function relationshipList(title, records) {
  return el('div', {}, el('h3', {}, `${title} (${records.length})`), records.length
    ? localPaged(records, rows => el('ul', { class: 'relationship-list' }, rows.map(item => el('li', {}, recordLink(item), el('small', {}, `${item.kind} · ${item.id}`)))))
    : el('p', { class: 'muted' }, 'Chưa ghi nhận liên kết.'));
}

export function overviewView(ctx) {
  const { model } = ctx;
  const metrics = model.metrics();
  const host = el('div');
  host.append(section('Snapshot repository', el('p', { class: 'prose' }, 'Bản đồ cấu trúc và hành vi được ghi nhận từ mã nguồn WorkLingo. Mỗi nhận định giữ trạng thái bằng chứng và liên kết về vị trí nguồn.'),
    structured({ commit: model.meta.commit || 'UNKNOWN', generatedAt: model.meta.generatedAt || 'UNKNOWN', dirty: model.meta.dirty ?? 'UNKNOWN', scope: model.meta.scope ?? 'Chưa khai báo' }, model)));
  host.append(section('Danh mục hệ thống', el('div', { class: 'registry-index' }, Object.entries(metrics.counts).sort(([a], [b]) => a.localeCompare(b)).map(([kind, count]) =>
    link(el('span', {}, el('strong', {}, kind), el('span', { class: 'count' }, count.toLocaleString('vi-VN'))), `#browse/${encodeURIComponent(kind)}`))),
    metrics.total ? null : empty('Registry hiện chưa có items. Không có dữ liệu mẫu thay thế.')));
  host.append(section('Mức phân tích cấu trúc', el('p', { class: 'notice' }, `Đã phân tích ${metrics.analyzed ?? 'UNKNOWN'}/${metrics.discovered ?? 'UNKNOWN'} tệp${metrics.structuralPercent === null ? ' · chưa đủ số liệu hợp lệ để tính tỷ lệ' : ` · ${metrics.structuralPercent}%`}. Đây là tỷ lệ phân tích cấu trúc, không phải runtime/test coverage. Test execution: NOT_RUN.`),
    el('p', { class: 'notice' }, 'Hành vi chưa được phân tích đầy đủ. Tệp đã phân tích và VERIFIED items chỉ phản ánh phạm vi nhận định có bằng chứng; phần không được extractor hỗ trợ hoặc chưa review vẫn chưa xác minh. Xem analysisStatus và behaviorReviewed của từng module bên dưới.'),
    model.coverage.length ? localPaged(model.coverage, rows => table(['Module', 'Phát hiện', 'Phân tích', 'Verified items', 'Trạng thái phân tích', 'Hành vi đã review'], rows.map(row => [
      moduleLink({ module: row.module }, model), row.discoveredFiles ?? 'UNKNOWN', row.analyzedFiles ?? 'UNKNOWN', row.verifiedItems ?? 'UNKNOWN', row.analysisStatus || 'UNKNOWN', String(row.behaviorReviewed ?? 'UNKNOWN'),
    ]), 'Phân tích cấu trúc theo module')) : empty('Snapshot chưa cung cấp coverage theo module.')));
  host.append(section('Cách đọc bằng chứng', el('dl', { class: 'status-glossary' }, [
    ['VERIFIED', 'Nhận định có bằng chứng nguồn; không phải kết quả chạy hệ thống.'], ['INFERRED', 'Suy luận có cơ sở, cần xác nhận.'],
    ['DOCUMENTED_ONLY', 'Được mô tả trong tài liệu, chưa xác nhận implementation.'], ['UNKNOWN', 'Chưa đủ dữ liệu hoặc chưa phân tích.'], ['CONFLICT', 'Có bằng chứng mâu thuẫn cần xem xét.'],
  ].map(([status, meaning]) => el('div', {}, el('dt', {}, chip(status)), el('dd', {}, meaning))))));
  host.append(section('Giới hạn snapshot', structured(model.meta.limitations ?? ['Snapshot chưa khai báo giới hạn.'], model)));
  return host;
}

export function traceView(items, ctx) {
  if (!items.length) return empty();
  const page = paginate(items, ctx.route.page, 20);
  const host = el('div', {}, table(['Bản ghi', 'Liên kết đi', 'Được tham chiếu bởi', 'Nguồn'], page.items.map(item => {
    const rel = ctx.model.relationships(item.id);
    const links = records => records.length ? localPaged(records, rows => el('ul', { class: 'compact-links' }, rows.map(record => el('li', {}, recordLink(record)))), 8) : 'Không ghi nhận';
    return [el('div', {}, recordLink(item), el('small', { class: 'record-id' }, `${item.kind} · ${item.id}`)),
      el('div', {}, links(rel.outbound), rel.missing.length ? el('p', { class: 'danger' }, `Chưa resolve: ${rel.missing.join(', ')}`) : null), links(rel.inbound), button(`${item.evidence?.length || 0} nguồn`, () => ctx.onEvidence(item))];
  }), 'Ma trận truy vết hai chiều'));
  const controls = pager(page, page => ctx.navigate({ ...ctx.route, page }));
  if (controls) host.append(controls);
  return host;
}

export function evidenceView(_items, ctx) {
  const { inventory: files, items: withEvidence } = ctx.model.evidence(ctx.route.filters);
  const host = el('div');
  host.append(section('Tệp nguồn trong inventory', files.length ? localPaged(files, rows => table(['Tệp', 'Module', 'Loại', 'Phân tích', 'Hash'], rows.map(file => [
    button(file.file, () => ctx.onEvidence({ name: file.file, evidence: [{ ...file }], id: file.file }), { class: 'text-button source-path' }),
    moduleLink(file, ctx.model), file.kind || 'UNKNOWN', structured(file.analysis ?? 'UNKNOWN', ctx.model), el('code', { class: 'hash' }, file.sha256 || 'Chưa có hash'),
  ]), 'Inventory tệp nguồn')) : empty('Không có tệp nguồn phù hợp trong inventory.')));
  host.append(section('Bản ghi có bằng chứng', listView(withEvidence, ctx)));
  return host;
}
