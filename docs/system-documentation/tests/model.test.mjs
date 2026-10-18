import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, itemHref, parseRoute, routeHref, paginate, applyRouteFilters, diagramNodeTarget } from '../src/model.js';

const fixture = {
  meta: { commit: 'abc123', dirty: true },
  inventory: [{ file: 'apps/api/auth.ts', module: 'MOD-auth', analysis: 'ANALYZED' }],
  items: [
    { id: 'MOD-auth', kind: 'module', name: 'Xác thực', status: 'VERIFIED' },
    { id: 'API-login', kind: 'api', name: 'Login', module: 'MOD-auth', status: 'VERIFIED', method: 'POST', path: '/auth/login', authentication: 'NO_LOCAL_GUARD', parameters: [{ name: 'email', type: 'LoginDto' }], relatedIds: ['UC-login'], evidence: [{ file: 'apps/api/auth.ts', symbol: 'Auth.login', lineStart: 8, lineEnd: 15 }] },
    { id: 'UC-login', kind: 'use-case', name: 'Đăng nhập', module: 'MOD-auth', status: 'INFERRED', relatedIds: ['API-login'] },
    { id: 'ENUM-role', kind: 'enum', name: 'Role', status: 'VERIFIED', values: ['ADMIN', 'LEARNER'] },
    { id: 'API-profile', kind: 'api', name: 'Profile', method: 'GET', module: 'MOD-user', status: 'UNKNOWN', authentication: 'GUARD_PRESENT' },
  ],
};

test('global search reaches non-navigation kinds, nested attributes, evidence and Vietnamese names', () => {
  const model = createModel(fixture);
  assert.deepEqual(model.query({ q: 'dang nhap' }).map(x => x.id), ['UC-login']);
  assert.deepEqual(model.query({ q: 'LEARNER' }).map(x => x.id), ['ENUM-role']);
  assert.deepEqual(model.query({ q: 'LoginDto' }).map(x => x.id), ['API-login']);
  assert.deepEqual(model.query({ q: 'auth.ts Auth.login' }).map(x => x.id), ['API-login']);
  assert.deepEqual(model.query({ q: 'no-such-symbol' }), []);
});

test('composes kind/module/status/API filters and never treats missing guards as public access', () => {
  const model = createModel(fixture);
  assert.deepEqual(model.query({ kind: 'api', module: 'MOD-auth', status: 'VERIFIED', method: 'POST', authentication: 'NO_LOCAL_GUARD' }).map(x => x.id), ['API-login']);
  assert.deepEqual(model.query({ kind: 'api', method: 'GET', authentication: 'NO_LOCAL_GUARD' }), []);
  assert.deepEqual(model.query({ module: 'MOD-auth' }).map(x => x.id), ['MOD-auth', 'API-login', 'UC-login']);
  assert.deepEqual(model.query({ kind: 'enum' }).map(x => x.id), ['ENUM-role']);
});

test('hash navigation round-trips IDs and filters on nested static hosting and handles malformed input', () => {
  assert.equal(itemHref('UC-a/b tiếng Việt'), '#item/UC-a%2Fb%20ti%E1%BA%BFng%20Vi%E1%BB%87t');
  assert.equal(parseRoute(itemHref('UC-a/b tiếng Việt')).id, 'UC-a/b tiếng Việt');
  const route = parseRoute('#browse/enum?q=role&module=MOD-auth&page=2');
  assert.equal(route.kind, 'enum');
  assert.equal(route.filters.q, 'role');
  assert.equal(route.page, 2);
  assert.equal(parseRoute(routeHref(route)).filters.module, 'MOD-auth');
  assert.equal(parseRoute('#item/%E0%A4%A').section, 'not-found');
  assert.equal(parseRoute('#unknown').section, 'not-found');
  assert.equal(parseRoute('').section, 'overview');
  assert.equal(parseRoute('#apis?page=-4').page, 1);
});

test('pagination clamps out-of-range pages and preserves an actually empty list', () => {
  assert.deepEqual(paginate(['a', 'b', 'c'], 9, 2), { items: ['c'], page: 2, pages: 2, total: 3, size: 2 });
  assert.deepEqual(paginate([], 1, 25), { items: [], page: 1, pages: 1, total: 0, size: 25 });
});

test('relationships expose both directions and preserve unresolved IDs without inventing records', () => {
  const model = createModel({ items: [...fixture.items, { id: 'REQ-one', kind: 'requirement', relatedIds: ['API-login', 'missing'] }] });
  assert.deepEqual(model.relationships('API-login').outbound.map(x => x.id), ['UC-login']);
  assert.deepEqual(model.relationships('API-login').inbound.map(x => x.id), ['UC-login', 'REQ-one']);
  assert.deepEqual(model.relationships('REQ-one').missing, ['missing']);
  assert.deepEqual(model.relationships('not-found'), { inbound: [], outbound: [], missing: [] });
});

test('section selection places only matching diagram types and reports structural coverage honestly', () => {
  const diagrams = ['architecture', 'context', 'container', 'dependency', 'state', 'sequence', 'activity', 'request', 'erd'].map(type => ({ id: type, kind: 'diagram', diagramType: type }));
  const model = createModel({ ...fixture, items: [...fixture.items, ...diagrams], coverage: [{ module: 'MOD-auth', discoveredFiles: 10, analyzedFiles: 4, verifiedItems: 20, behaviorReviewed: false }] });
  assert.deepEqual(model.section('architecture').map(x => x.id), ['architecture', 'context', 'container', 'dependency']);
  assert.deepEqual(model.section('states').map(x => x.id), ['state']);
  assert.deepEqual(model.section('sequences').map(x => x.id), ['sequence', 'activity', 'request']);
  assert.deepEqual(model.section('domain').map(x => x.id), ['ENUM-role', 'erd']);
  assert.equal(model.metrics().structuralPercent, 40);
  assert.equal(model.metrics().testExecution, 'NOT_RUN');
  assert.equal(createModel({}).metrics().structuralPercent, null);
});

test('changing kind on a browse route changes the fixed route instead of ignoring the selection', () => {
  const route = parseRoute('#browse/enum?module=MOD-auth&page=3');
  assert.equal(routeHref(applyRouteFilters(route, { ...route.filters, kind: 'api' })), '#browse/api?module=MOD-auth');
  assert.equal(applyRouteFilters(route, { kind: '' }).section, 'search');
  assert.equal(applyRouteFilters(parseRoute('#apis'), { method: 'POST' }).section, 'apis');
});

test('incomplete or inconsistent structural coverage stays unknown instead of reporting false percentages', () => {
  for (const coverage of [
    [{ discoveredFiles: 10 }],
    [{ discoveredFiles: 10, analyzedFiles: 4 }, { analyzedFiles: 8 }],
    [{ discoveredFiles: 10, analyzedFiles: 12 }],
    [{ discoveredFiles: -1, analyzedFiles: 0 }],
  ]) assert.equal(createModel({ coverage }).metrics().structuralPercent, null);
  assert.equal(createModel({ coverage: [{ discoveredFiles: 0, analyzedFiles: 0 }] }).metrics().structuralPercent, null);
});

test('evidence selection counts only evidence-bearing records, with separate inventory and source-file scope', () => {
  const model = createModel(fixture);
  assert.deepEqual(model.evidence().items.map(x => x.id), ['API-login']);
  assert.equal(model.evidence().inventory.length, 1);
  assert.deepEqual(model.evidence({ file: 'other.ts' }), { items: [], inventory: [] });
  assert.equal(model.evidence({ module: 'MOD-user' }).items.length, 0);
  assert.equal(model.evidence({ q: 'Auth.login' }).items.length, 1);
  assert.equal(model.evidence({ status: 'UNKNOWN' }).items.length, 0);
});

test('diagram node mapping resolves exact generated node IDs without ambiguous prefixes or dangling targets', () => {
  const model = createModel(fixture);
  const nodeMap = { auth: 'MOD-auth', 'auth-login': 'API-login', absent: 'MISSING' };
  assert.equal(diagramNodeTarget('flowchart-auth-0', nodeMap, model.byId), 'MOD-auth');
  assert.equal(diagramNodeTarget('flowchart-auth-login-12', nodeMap, model.byId), 'API-login');
  assert.equal(diagramNodeTarget('atlas-diagram-1-flowchart-auth-login-12', nodeMap, model.byId), 'API-login');
  assert.equal(diagramNodeTarget('auth', nodeMap, model.byId), 'MOD-auth');
  assert.equal(diagramNodeTarget('flowchart-auth-other-0', nodeMap, model.byId), null);
  assert.equal(diagramNodeTarget('flowchart-absent-1', nodeMap, model.byId), null);
  assert.equal(diagramNodeTarget('flowchart-toString-1', nodeMap, model.byId), null);
  assert.equal(diagramNodeTarget('flowchart-auth-0', undefined, model.byId), null);
});
