// Preserve new curriculum controls with existing Liquid Glass style ownership.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const nextRequire = require('node:module').createRequire(require.resolve('next/package.json', { paths: [path.join(root, 'apps/web')] }));
const postcss = nextRequire('postcss');
const privateFiles = 'D:/Projects/WorkLingo-Integration-Backup/files';
const source = 'apps/web/src/features/admin-curriculum/curriculum-workspace.tsx';
const merged = path.join(root, '.superpowers/sdd/plan/curriculum-reconciled.tsx');
let text = fs.readFileSync(merged, 'utf8');
const decisions = [
  'Combine LG authoring CSS import and original locale-aware functional state.',
  'Keep original collapse/search/status/issues/overview/copy state and local helpers; no API mutation added.',
  'Keep original derived filters before load-state branch; retain authoring root class.',
  'Keep original header tools; retain LG authoring owner.',
  'Keep original tree/tab/search/compact/expand/outline controls and existing mutations.',
  'Keep level form associated controls from preserved dirty rendering; existing API handler unchanged.',
  'Keep remaining associated level form controls from preserved dirty rendering.',
  'Keep contextual form headings/controls from preserved dirty rendering.',
  'Keep filtered/program-grouped path/level/mission rendering and modals; no API contract changed.',
];
let index = 0;
text = text.replace(/^<<<<<<< .*\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>> .*\n/gm, (_match, current, dirty) => {
  if (index >= decisions.length) throw new Error('Unexpected curriculum hunk');
  let combined = dirty;
  if (index === 0) combined = "import '../admin-content/authoring-experience.css';\n" + dirty;
  index++; return combined;
});
if (index !== decisions.length || text.includes('<<<<<<<')) throw new Error('Unreconciled curriculum source');
text = text.replaceAll('className="curriculum-container"', 'className="curriculum-container authoring-experience"');
fs.writeFileSync(path.join(root, source), text);
const messages = fs.readFileSync(path.join(root, '.superpowers/sdd/plan/merged-adminCurriculum.ts'), 'utf8').replace(/^<<<<<<< .*\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>> .*\n/gm, (_match, _current, dirty) => dirty);
if (messages.includes('<<<<<<<')) throw new Error('Unreconciled messages');
fs.writeFileSync(path.join(root, 'apps/web/src/i18n/messages/adminCurriculum.ts'), messages);
const style = 'apps/web/src/features/admin-curriculum/curriculum.css';
const baseline = postcss.parse(cp.execFileSync('git', ['show', '7a5e383:' + style], { cwd: root, encoding: 'utf8' }));
const existing = new Set(); baseline.walkRules(rule => existing.add(rule.selector));
const dirty = postcss.parse(fs.readFileSync(path.join(privateFiles, style), 'utf8'));
const extension = postcss.root(); const selectors = [];
dirty.walkRules(rule => {
  if (existing.has(rule.selector) || /(?:data-theme|prefers-color-scheme)/u.test(rule.selector)) return;
  // Import only new control/layout selectors, scoped to this feature, not old branding.
  const cloned = rule.clone();
  cloned.selector = rule.selector.split(',').map(selector => selector.includes('.curriculum-container') ? selector.trim() : '.curriculum-container ' + selector.trim()).join(', ');
  cloned.walkDecls(decl => {
    if (decl.prop.startsWith('--')) { decl.remove(); return; }
    if (/overflow(?:-x)?/u.test(decl.prop) && decl.value === 'hidden') { decl.remove(); return; }
    if (/#[a-f\d]{3,8}\b|rgba?\(/iu.test(decl.value)) {
      const danger = /danger|warning|error|blocked/iu.test(rule.selector);
      if (/shadow/u.test(decl.prop)) decl.value = 'none';
      else if (decl.prop === 'color') decl.value = danger ? 'var(--danger)' : 'var(--foreground)';
      else if (/background/u.test(decl.prop)) decl.value = danger ? 'var(--danger-soft)' : 'var(--surface-soft)';
      else if (/border/u.test(decl.prop)) decl.value = decl.prop === 'border' ? '1px solid var(--control-border)' : 'var(--control-border)';
    }
    if (decl.prop === 'transition' && /\ball\b/u.test(decl.value)) decl.value = 'background-color var(--duration-fast, 150ms), border-color var(--duration-fast, 150ms)';
  });
  selectors.push(rule.selector);
  if (rule.parent.type === 'atrule') { const group = rule.parent.clone({ nodes: [] }); group.append(cloned); extension.append(group); }
  else extension.append(cloned);
});
fs.appendFileSync(path.join(root, style), '\n/* Preserved curriculum controls: scoped layout; Liquid Glass colors remain canonical. */\n' + extension.toString() + '\n.curriculum-container.authoring-experience { min-width: 0; overflow-x: visible; }\n');
fs.writeFileSync(path.join(__dirname, 'curriculum-resolutions.json'), JSON.stringify({ source, decisions, functionalStyleSelectors: selectors, preservedFromPrivateBackup: true, originalBackupUnchanged: true, oldBrandingAndClippingNotImported: true }, null, 2) + '\n');
console.log(JSON.stringify({ curriculumHunks: index, newScopedSelectors: selectors.length, APIHandlers: 'Original dirty source unchanged; current-vs-base product had only authoring import/root classes.' }));
