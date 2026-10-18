/** @template T @param {T[] | null | undefined} value @returns {T[]} */
const array = value => Array.isArray(value) ? value : [];
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export const SECTIONS = [
  ['overview', 'Tổng quan', 'Overview'], ['architecture', 'Kiến trúc', 'Architecture'],
  ['modules', 'Module', 'Modules'], ['requirements', 'Yêu cầu', 'Requirements'],
  ['use-cases', 'Ca sử dụng', 'Use cases'], ['rules', 'Quy tắc nghiệp vụ', 'Business rules'],
  ['domain', 'Mô hình miền', 'Domain'], ['states', 'Trạng thái', 'States'],
  ['sequences', 'Tương tác', 'Sequences'], ['apis', 'Danh mục API', 'APIs'],
  ['security', 'Bảo mật', 'Security'], ['data-flow', 'Luồng dữ liệu', 'Data flow'],
  ['testing', 'Kiểm thử', 'Testing'], ['traceability', 'Truy vết', 'Traceability'],
  ['gaps', 'Khoảng trống', 'Gaps'], ['evidence', 'Bằng chứng', 'Evidence'],
].map(([id, label, english]) => ({ id, label, english }));

export const itemHref = id => `#item/${encodeURIComponent(id)}`;
/** @param {string} nodeId @param {Record<string, string> | undefined} nodeMap @param {Map<string, import('./registry-types.js').RegistryItem>} byId */
export function diagramNodeTarget(nodeId, nodeMap, byId) {
  if (!nodeMap || typeof nodeMap !== 'object') return null;
  const key = Object.hasOwn(nodeMap, nodeId) ? nodeId : /^(?:atlas-diagram-\d+-)?flowchart-(.+)-\d+$/.exec(nodeId)?.[1];
  if (!key || !Object.hasOwn(nodeMap, key)) return null;
  const id = nodeMap[key];
  return typeof id === 'string' && byId.has(id) ? id : null;
}
export function applyRouteFilters(route, filters) {
  if (route.section === 'browse') return { ...route, section: filters.kind ? 'browse' : 'search', kind: filters.kind || '', filters: { ...filters, kind: '' }, page: 1 };
  return { ...route, filters, page: 1 };
}
export function parseRoute(hash = '') {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(query);
  const filters = Object.fromEntries(['q', 'module', 'status', 'method', 'authentication', 'kind', 'file'].map(key => [key, params.get(key) || '']));
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  try {
    if (path.startsWith('item/')) return { section: 'item', id: decodeURIComponent(path.slice(5)), filters, page };
    if (path.startsWith('browse/')) return { section: 'browse', kind: decodeURIComponent(path.slice(7)), filters, page };
    const section = path || 'overview';
    return { section: [...SECTIONS.map(s => s.id), 'search'].includes(section) ? section : 'not-found', filters, page };
  } catch { return { section: 'not-found', filters, page }; }
}

export function routeHref(route) {
  let path = route.section === 'item' ? `item/${encodeURIComponent(route.id)}` : route.section === 'browse' ? `browse/${encodeURIComponent(route.kind)}` : route.section;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(route.filters || {})) if (value) params.set(key, value);
  if (route.page > 1) params.set('page', route.page);
  return `#${path}${params.size ? `?${params}` : ''}`;
}

export function paginate(items, requested = 1, size = 25) {
  size = Math.max(1, Math.trunc(size) || 25);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(pages, Math.max(1, Math.trunc(requested) || 1));
  return { items: items.slice((page - 1) * size, page * size), page, pages, total: items.length, size };
}

const kindsBySection = {
  modules: ['module'], requirements: ['requirement'], 'use-cases': ['use-case', 'actor'],
  rules: ['rule'], domain: ['entity', 'enum'], apis: ['api'], security: ['security'],
  'data-flow': ['integration', 'migration'], testing: ['test'], gaps: ['finding'],
};
const diagramsBySection = {
  'use-cases': ['use-case'],
  architecture: ['architecture', 'context', 'container', 'dependency'], states: ['state'],
  sequences: ['sequence', 'activity', 'request'], domain: ['erd', 'er', 'entity-relationship', 'domain'],
  'data-flow': ['data-flow', 'dataflow'],
};

export function belongsToSection(item, section) {
  if (['overview', 'search', 'traceability', 'evidence'].includes(section)) return true;
  if (section === 'gaps') return item.kind === 'finding' || ['UNKNOWN', 'CONFLICT'].includes(item.status);
  return (kindsBySection[section] || []).includes(item.kind)
    || (item.kind === 'diagram' && (diagramsBySection[section] || []).includes(String(item.diagramType || '').toLowerCase()));
}

/** @param {Partial<import('./registry-types.js').SystemRegistry>} data */
export function createModel(data = {}) {
  const items = array(data.items).filter(item => item && typeof item.id === 'string');
  const byId = new Map(items.map(item => [item.id, item]));
  const search = new Map(items.map(item => [item.id, normalize(JSON.stringify(item))]));
  const inbound = new Map();
  for (const item of items) for (const id of new Set(array(item.relatedIds))) {
    if (!inbound.has(id)) inbound.set(id, []);
    inbound.get(id).push(item);
  }
  return {
    items, byId, meta: data.meta ?? {}, inventory: array(data.inventory), coverage: array(data.coverage),
    section(section) { return items.filter(item => belongsToSection(item, section)); },
    relationships(id) {
      if (!byId.has(id)) return { inbound: [], outbound: [], missing: [] };
      const ids = [...new Set(array(byId.get(id).relatedIds))];
      return { inbound: inbound.get(id) || [], outbound: ids.filter(key => byId.has(key)).map(key => byId.get(key)), missing: ids.filter(key => !byId.has(key)) };
    },
    evidence(filters = {}) {
      const { q = '', module = '', file = '' } = filters;
      const terms = normalize(q).trim().split(/\s+/).filter(Boolean);
      return {
        items: this.query(filters).filter(item => array(item.evidence).length && (!file || item.evidence.some(source => source.file === file))),
        inventory: array(data.inventory).filter(source => (!module || source.module === module) && (!file || source.file === file)
          && terms.every(term => normalize(JSON.stringify(source)).includes(term))),
      };
    },
    metrics() {
      const coverage = array(data.coverage);
      const validCount = value => Number.isSafeInteger(value) && value >= 0;
      const complete = coverage.length > 0 && coverage.every(row => validCount(row.discoveredFiles) && validCount(row.analyzedFiles) && row.analyzedFiles <= row.discoveredFiles);
      const discovered = complete ? coverage.reduce((sum, row) => sum + row.discoveredFiles, 0) : null;
      const analyzed = complete ? coverage.reduce((sum, row) => sum + row.analyzedFiles, 0) : null;
      const counts = {};
      for (const item of items) counts[item.kind] = (counts[item.kind] || 0) + 1;
      return { counts, total: items.length, discovered, analyzed, structuralPercent: discovered ? Math.round(analyzed / discovered * 100) : null, testExecution: 'NOT_RUN' };
    },
    query({ q = '', kind = '', module = '', status = '', method = '', authentication = '' } = {}) {
      const terms = normalize(q).trim().split(/\s+/).filter(Boolean);
      return items.filter(item => (!kind || item.kind === kind)
        && (!module || (item.module || (item.kind === 'module' ? item.id : '')) === module)
        && (!status || (item.status || 'UNKNOWN') === status)
        && (!method || item.method === method)
        && (!authentication || (item.kind === 'api' && (item.authentication || 'UNKNOWN') === authentication))
        && terms.every(term => search.get(item.id).includes(term)));
    },
  };
}
