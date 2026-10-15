import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { basename, join, resolve, relative } from 'node:path';
import { safeFile, atomicWrite, atomicCreate, contentHash } from './files.mjs';
import { schema, proposalFields, validateSchema, requireCondition, validDate, normalize, slug,
  proposalHash, checkReferences, checkLifecycle, transitions } from './model.mjs';

function paths(root) {
  const repository = realpathSync(resolve(root));
  for (const name of ['mandate', 'mandate/items', 'mandate/archive', 'mandate/reports', 'mandate/templates']) {
    const path = join(repository, name);
    requireCondition(existsSync(path) && lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink()
      && realpathSync(path) === path, `Missing or symlink register path: ${name}`);
  }
  return { root: repository, register: join(repository, 'mandate'), index: join(repository, 'mandate/INDEX.md'),
    pending: join(repository, 'mandate/.pending.json') };
}
function decode(path) {
  safeFile(path);
  const source = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
  return decodeText(source, path);
}
function decodeText(source, path) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  requireCondition(match, `Invalid frontmatter delimiters: ${basename(path)}`);
  let item;
  try { item = JSON.parse(match[1]); } catch { throw new Error(`Frontmatter must be JSON (YAML subset): ${basename(path)}`); }
  validateSchema(item);
  const body = match[2].trim(); requireCondition(body, 'Empty mandate body');
  return { item, body, path };
}
function encode(item, body) { return `---\n${JSON.stringify(item, null, 2)}\n---\n\n${body.trim()}\n`; }
function entries(p, { ignore = new Set(), allowPending = false } = {}) {
  requireCondition(allowPending || !existsSync(p.pending), 'Pending register relocation; inspect .pending.json and run recover.');
  const all = [];
  for (const directory of ['items', 'archive']) {
    for (const name of readdirSync(join(p.register, directory)).sort()) {
      if (!name.endsWith('.md')) continue;
      if (ignore.has(join(p.register, directory, name))) continue;
      const entry = decode(join(p.register, directory, name)); const { item, body } = entry;
      requireCondition(new RegExp(`^${item.id}-${item.type}-[a-z0-9]+(?:-[a-z0-9]+)*\\.md$`).test(name), `Filename mismatch: ${name}`);
      requireCondition((directory === 'archive') === (item.status === 'archived'), `Archive/status mismatch: ${name}`);
      checkLifecycle(item, body); checkReferences(p.root, item);
      all.push({ ...entry, directory });
    }
  }
  const ids = new Set(); const keys = new Set(); const titles = new Set();
  for (const { item } of all) {
    requireCondition(!ids.has(item.id), `Duplicate ID: ${item.id}`); ids.add(item.id);
    const key = normalize(item.dedupe_key); const title = normalize(item.title);
    requireCondition(!keys.has(key) && !titles.has(title), `Duplicate mandate: ${item.id}`);
    keys.add(key); titles.add(title);
  }
  return all;
}
export function indexText(all) {
  const rows = all.sort((a, b) => a.item.priority.localeCompare(b.item.priority) || a.item.id.localeCompare(b.item.id));
  const cell = value => String(value ?? 'unassigned').replaceAll('|', '\\|').replace(/[\r\n]/g, ' ');
  return '# Mandate Register\n\nGenerated view; edit items through the CLI. Policy: [README](README.md).\n'
    + 'Canonical backlog: [Implementation roadmap](../docs/IMPLEMENTATION_ROADMAP.md).\n\n'
    + '| ID | Proposal | Type | Status | Priority | Owner |\n| --- | --- | --- | --- | --- | --- |\n'
    + rows.map(({ item, directory, path }) => `| [${item.id}](${directory}/${basename(path)}) | ${cell(item.title)} | ${item.type} | ${item.status} | ${item.priority} | ${cell(item.owner)} |\n`).join('')
    + `\nTotal: ${all.length}; active: ${all.filter(e => e.directory === 'items').length}; archived: ${all.filter(e => e.directory === 'archive').length}.\n`;
}
function consistent(p, all) {
  safeFile(p.index);
  requireCondition(existsSync(p.index) && readFileSync(p.index, 'utf8').replaceAll('\r\n', '\n') === indexText(all), 'INDEX is stale/missing. Inspect items, then run reindex.');
}
function locked(root, operation) {
  const p = paths(root); const lock = join(p.register, '.lock');
  try { mkdirSync(lock); } catch (error) {
    if (error.code === 'EEXIST') throw new Error('Register lock exists; another writer or interrupted run. Inspect before removing it.');
    throw error;
  }
  try { return operation(p); } finally { rmSync(lock, { recursive: true }); }
}
function validateEntry(p, item, body) { validateSchema(item); checkLifecycle(item, body); checkReferences(p.root, item); }
function persist(p, all, entry, oldPath = null) {
  validateEntry(p, entry.item, entry.body);
  if (oldPath === null) {
    // Exclusive create: serialized IDs must never overwrite an existing item.
    atomicCreate(entry.path, encode(entry.item, entry.body));
  } else if (entry.path === oldPath) atomicWrite(entry.path, encode(entry.item, entry.body));
  else {
    requireCondition(!existsSync(entry.path), 'Destination mandate already exists');
    const journal = {
      source: relative(p.register, oldPath).replaceAll('\\', '/'),
      target: relative(p.register, entry.path).replaceAll('\\', '/'),
      previous_hash: contentHash(readFileSync(oldPath, 'utf8')),
      next_text: encode(entry.item, entry.body),
    };
    atomicCreate(p.pending, `${JSON.stringify(journal, null, 2)}\n`);
    atomicCreate(entry.path, journal.next_text);
    rmSync(oldPath);
    rmSync(p.pending);
  }
  // A crash between item and INDEX leaves a detectable, recoverable derived-view mismatch.
  atomicWrite(p.index, indexText([...all.filter(e => e.path !== oldPath), entry]));
  return { id: entry.item.id, status: entry.item.status, path: `${entry.directory}/${basename(entry.path)}` };
}
function getEntry(all, id) {
  requireCondition(/^MND-\d{8}-\d{3}$/.test(id ?? ''), 'Invalid mandate ID');
  const entry = all.find(e => e.item.id === id); requireCondition(entry, `Unknown mandate ${id}`); return entry;
}
function deduplicate(all, proposal, exceptId = null) {
  const duplicate = all.find(e => e.item.id !== exceptId &&
    (normalize(e.item.dedupe_key) === normalize(proposal.dedupe_key) || normalize(e.item.title) === normalize(proposal.title)));
  requireCondition(!duplicate, `Duplicate mandate: ${duplicate?.item.id}. Add evidence to the existing proposal or report.`);
}

export function create(root, proposal, date = new Date().toISOString().slice(0, 10)) {
  return locked(root, p => {
    const all = entries(p); consistent(p, all); validateSchema(proposal, schema.$defs.proposal, 'proposal');
    requireCondition(validDate(date), 'Invalid date; use a real YYYY-MM-DD calendar date'); deduplicate(all, proposal);
    const prefix = `MND-${date.replaceAll('-', '')}-`;
    const sequence = Math.max(0, ...all.filter(e => e.item.id.startsWith(prefix)).map(e => Number(e.item.id.slice(-3)))) + 1;
    requireCondition(sequence <= 999, 'Daily ID sequence exhausted');
    const id = `${prefix}${String(sequence).padStart(3, '0')}`; const at = new Date().toISOString();
    const item = { schema_version: 1, id, status: 'captured', created: date, updated: at,
      ...Object.fromEntries(proposalFields.map(key => [key, proposal[key]])), approval: null, verification: [],
      history: [{ at, actor: 'mandate-steward', from: null, to: 'captured', reason: 'Evidence-backed proposal captured; no implementation approval.', event: 'capture', reference: null }] };
    const path = join(p.register, 'items', `${id}-${item.type}-${slug(item.title)}.md`);
    return persist(p, all, { item, body: proposal.body, path, directory: 'items' });
  });
}
export function update(root, id, proposal) {
  return locked(root, p => {
    const all = entries(p); consistent(p, all); const existing = getEntry(all, id);
    requireCondition(!['implementing', 'verified', 'archived'].includes(existing.item.status), 'Implementation/verified/archive scope is frozen; capture a separately approved follow-up');
    validateSchema(proposal, schema.$defs.proposal, 'proposal'); deduplicate(all, proposal, id);
    const at = new Date().toISOString(); const item = { ...existing.item,
      ...Object.fromEntries(proposalFields.map(key => [key, proposal[key]])), status: 'captured', updated: at, approval: null, verification: [],
      history: [...existing.item.history, { at, actor: 'mandate-steward', from: existing.item.status, to: 'captured',
        reason: 'Proposal revised; prior approval revoked; requires new triage.', event: 'update', reference: null }] };
    const path = join(p.register, 'items', `${id}-${item.type}-${slug(item.title)}.md`);
    return persist(p, all, { item, body: proposal.body, path, directory: 'items' }, existing.path);
  });
}
export function transition(root, id, status, details) {
  return locked(root, p => {
    const all = entries(p); consistent(p, all); const existing = getEntry(all, id);
    requireCondition(transitions[existing.item.status]?.includes(status), `Invalid transition ${existing.item.status} → ${status}`);
    requireCondition(details && typeof details.actor === 'string' && details.actor.trim() && typeof details.reason === 'string' && details.reason.trim(), 'Transition actor and reason required');
    for (const key of Object.keys(details)) requireCondition(['actor', 'reason', 'owner', 'reference', 'checks'].includes(key), `Unknown transition field ${key}`);
    const at = new Date().toISOString(); const item = { ...existing.item, status, updated: at };
    if (status === 'triaged') item.owner = details.owner ?? item.owner;
    if (status === 'approved') {
      requireCondition(details.reference, 'Human authorization reference required; audit permission is not implementation approval');
      item.approval = { actor: details.actor, reference: details.reference, at, proposal_hash: proposalHash(item, existing.body) };
    }
    if (status === 'verified') { requireCondition(details.checks?.length, 'Passing verification checks required'); item.verification = details.checks; }
    item.history = [...item.history, { at, actor: details.actor, from: existing.item.status, to: status,
      reason: details.reason, event: 'transition', reference: details.reference ?? null }];
    const directory = status === 'archived' ? 'archive' : 'items';
    return persist(p, all, { item, body: existing.body, path: join(p.register, directory, basename(existing.path)), directory }, existing.path);
  });
}
export function find(root, query) {
  const p = paths(root); const all = entries(p); consistent(p, all);
  requireCondition(typeof query === 'string' && normalize(query), 'Search query required');
  const tokens = new Set(normalize(query).split(' '));
  const candidates = all.map(({ item }) => {
    const text = new Set(normalize(`${item.title} ${item.dedupe_key} ${item.scope.join(' ')} ${item.problem}`).split(' '));
    const score = [...tokens].filter(t => text.has(t)).length / tokens.size;
    return { id: item.id, title: item.title, status: item.status, dedupe_key: item.dedupe_key, score };
  }).filter(e => e.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { candidates };
}
export function validate(root) { const p = paths(root); const all = entries(p); consistent(p, all); return { valid: true, count: all.length }; }
export function reindex(root) {
  return locked(root, p => { const all = entries(p); atomicWrite(p.index, indexText(all)); return { indexed: all.length }; });
}

export function recover(root) {
  return locked(root, p => {
    if (!existsSync(p.pending)) {
      const all = entries(p); consistent(p, all); return { recovered: null };
    }
    safeFile(p.pending);
    const journal = JSON.parse(readFileSync(p.pending, 'utf8'));
    requireCondition(journal && typeof journal === 'object' && !Array.isArray(journal)
      && Object.keys(journal).sort().join(',') === 'next_text,previous_hash,source,target', 'Invalid recovery journal');
    const itemPath = value => {
      requireCondition(typeof value === 'string' && /^(items|archive)\/MND-\d{8}-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(value), 'Unsafe recovery journal path');
      return join(p.register, value);
    };
    const source = itemPath(journal.source); const target = itemPath(journal.target);
    requireCondition(source !== target && typeof journal.next_text === 'string'
      && /^[a-f0-9]{64}$/.test(journal.previous_hash), 'Invalid recovery journal values');
    const next = decodeText(journal.next_text, target); validateEntry(p, next.item, next.body);
    const directory = journal.target.split('/')[0];
    requireCondition(journal.source.startsWith('items/') && basename(source).startsWith(`${next.item.id}-`)
      && (directory === 'archive') === (next.item.status === 'archived')
      && basename(target) === `${next.item.id}-${next.item.type}-${slug(next.item.title)}.md`, 'Recovery item/path mismatch');
    const all = entries(p, { ignore: new Set([source, target]), allowPending: true });
    deduplicate(all, next.item);
    requireCondition(!all.some(e => e.item.id === next.item.id), 'Recovery duplicate ID');
    if (existsSync(source)) {
      safeFile(source);
      requireCondition(contentHash(readFileSync(source, 'utf8')) === journal.previous_hash, 'Recovery source changed; manual inspection required');
      const old = decode(source); validateEntry(p, old.item, old.body);
      requireCondition(old.item.id === next.item.id, 'Recovery source ID mismatch');
    } else requireCondition(existsSync(target), 'Recovery source and destination both missing; manual inspection required');
    if (existsSync(target)) {
      safeFile(target);
      requireCondition(readFileSync(target, 'utf8') === journal.next_text, 'Recovery destination changed; manual inspection required');
    } else atomicCreate(target, journal.next_text);
    if (existsSync(source)) rmSync(source);
    // Leave the journal until the derived view has been repaired; rerunning recovery is safe.
    atomicWrite(p.index, indexText([...all, { ...next, directory }]));
    rmSync(p.pending);
    return { recovered: next.item.id };
  });
}
