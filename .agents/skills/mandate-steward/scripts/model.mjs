import { readFileSync, realpathSync, existsSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { createHash } from 'node:crypto';

export const schema = JSON.parse(readFileSync(new URL('../references/mandate.schema.json', import.meta.url), 'utf8'));
export const proposalFields = Object.keys(schema.$defs.proposal.properties).filter(key => key !== 'body');
export const transitions = {
  captured: ['triaged'], triaged: ['approved', 'deferred', 'rejected'], deferred: ['triaged', 'rejected'],
  approved: ['implementing'], implementing: ['verified'], verified: ['archived'], rejected: ['archived'], archived: [],
};

export function requireCondition(condition, message) { if (!condition) throw new Error(message); }
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

// Deliberately supports the finite keyword set used by our schema, not arbitrary JSON Schema.
export function validateSchema(value, rule = schema, path = 'mandate') {
  const keywords = new Set(['$schema', '$id', '$defs', 'title', 'description', 'type', 'const', 'enum', 'required',
    'properties', 'additionalProperties', 'items', 'minItems', 'uniqueItems', 'minLength', 'maxLength',
    'minimum', 'maximum', 'pattern', 'format']);
  for (const key of Object.keys(rule)) requireCondition(keywords.has(key), `Unsupported schema keyword ${key}`);
  if (rule.type) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type];
    const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    requireCondition(types.includes(actual) || (types.includes('integer') && Number.isInteger(value)), `${path}: invalid type`);
  }
  if ('const' in rule) requireCondition(value === rule.const, `${path}: expected ${rule.const}`);
  if (rule.enum) requireCondition(rule.enum.includes(value), `${path}: invalid value`);
  if (value === null) return;
  if (typeof value === 'string') {
    if (rule.minLength) requireCondition(value.trim().length >= rule.minLength, `${path}: empty or too short`);
    if (rule.maxLength) requireCondition(value.length <= rule.maxLength, `${path}: too long`);
    if (rule.pattern) requireCondition(new RegExp(rule.pattern).test(value), `${path}: invalid pattern`);
    if (rule.format === 'date') requireCondition(validDate(value), `${path}: invalid date`);
    if (rule.format === 'date-time') requireCondition(/^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)), `${path}: invalid timestamp`);
  }
  if (typeof value === 'number') {
    if ('minimum' in rule) requireCondition(value >= rule.minimum, `${path}: below minimum`);
    if ('maximum' in rule) requireCondition(value <= rule.maximum, `${path}: above maximum`);
  }
  if (Array.isArray(value)) {
    if (rule.minItems) requireCondition(value.length >= rule.minItems, `${path}: missing required items`);
    if (rule.uniqueItems) requireCondition(new Set(value.map(v => JSON.stringify(v))).size === value.length, `${path}: repeated items`);
    value.forEach((item, i) => validateSchema(item, rule.items, `${path}[${i}]`));
  } else if (typeof value === 'object') {
    for (const key of rule.required ?? []) requireCondition(Object.hasOwn(value, key), `${path}.${key}: required`);
    for (const [key, item] of Object.entries(value)) {
      requireCondition(rule.additionalProperties !== false || Object.hasOwn(rule.properties ?? {}, key), `${path}.${key}: unknown field`);
      if (rule.properties?.[key]) validateSchema(item, rule.properties[key], `${path}.${key}`);
    }
  }
}

export function normalize(text) {
  return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
export function slug(title) {
  return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70).replace(/-$/g, '') || 'proposal';
}
export function proposalHash(item, body) {
  const data = Object.fromEntries(proposalFields.map(key => [key, item[key]]));
  function sorted(value) {
    if (Array.isArray(value)) return value.map(sorted);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, sorted(value[k])]));
    return value;
  }
  return createHash('sha256').update(JSON.stringify(sorted({ ...data, body: body.trim() }))).digest('hex');
}

export function localReference(root, reference) {
  requireCondition(!isAbsolute(reference) && !reference.includes('\\'), `Unsafe reference path: ${reference}`);
  const clean = reference.split('#')[0];
  const match = clean.match(/^(.*?)(?::([1-9]\d*))?$/);
  const path = resolve(root, match[1]); const rel = relative(root, path);
  requireCondition(rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel), `Reference path escapes repository: ${reference}`);
  requireCondition(existsSync(path), `Missing reference: ${reference}`);
  requireCondition(realpathSync(path) === path, `Symlink reference path: ${reference}`);
  requireCondition(statSync(path).isFile(), `Reference must be a file: ${reference}`);
  if (match[2]) requireCondition(readFileSync(path, 'utf8').split(/\r?\n/).length >= Number(match[2]), `Reference line does not exist: ${reference}`);
}
export function checkReferences(root, item) {
  for (const e of item.evidence) {
    if (/^https:\/\//.test(e.reference)) {
      requireCondition(e.kind === 'research', 'External evidence must be research; verify source manually');
      const url = new URL(e.reference); requireCondition(!url.username && !url.password, 'Credential-bearing evidence URL');
    } else localReference(root, e.reference);
  }
  localReference(root, item.backlog_reference);
  for (const ref of [item.plan_reference, item.sprint_reference, item.approval?.reference, ...item.verification.map(c => c.reference)]) {
    if (ref !== null && ref !== undefined) localReference(root, ref);
  }
}

export function checkLifecycle(item, body) {
  requireCondition(item.id.slice(4, 12) === item.created.replaceAll('-', '') && !item.id.endsWith('-000'), 'ID/date mismatch');
  let previous = null;
  for (const event of item.history) {
    requireCondition(event.from === previous, 'Broken history chain');
    if (event.event === 'capture') requireCondition(previous === null && event.to === 'captured', 'Invalid capture history');
    else if (event.event === 'update') requireCondition(['captured', 'triaged', 'deferred', 'rejected', 'approved'].includes(previous)
      && event.to === 'captured', 'Invalid update history: frozen scope');
    else requireCondition(transitions[previous]?.includes(event.to), 'Invalid history transition');
    previous = event.to;
  }
  requireCondition(previous === item.status, 'Status/history mismatch');
  const archivedFrom = item.history.at(-1).from;
  const approved = ['approved', 'implementing', 'verified'].includes(item.status) || (item.status === 'archived' && archivedFrom === 'verified');
  if (approved) requireCondition(item.approval && item.approval.proposal_hash === proposalHash(item, body), 'Missing or stale approval hash');
  else requireCondition(item.approval === null, 'Unapproved status carries approval');
  if (['triaged', 'deferred', 'rejected', 'approved', 'implementing', 'verified', 'archived'].includes(item.status)) requireCondition(item.owner?.trim(), 'Missing owner');
  if (['implementing', 'verified'].includes(item.status) || (item.status === 'archived' && archivedFrom === 'verified')) requireCondition(item.plan_reference, 'Missing execution plan');
  if (item.status === 'verified' || (item.status === 'archived' && archivedFrom === 'verified')) requireCondition(item.verification.length > 0, 'Missing verification checks');
  if (item.risk.breaking || item.risk.data_change || item.risk.external_effect) requireCondition(item.risk.level === 'high', 'Breaking/data/external scope must have high risk');
}
