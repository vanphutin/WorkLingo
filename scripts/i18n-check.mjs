import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRequire = createRequire(path.join(root, 'apps/web/package.json'));
const { createTranslator } = webRequire('next-intl');
// Reuse next-intl's ICU parser rather than guessing at nested plural syntax.
const intlRequire = createRequire(webRequire.resolve('next-intl'));
const coreRequire = createRequire(intlRequire.resolve('use-intl'));
const { IntlMessageFormat } = coreRequire('intl-messageformat');
const argumentsOf = (value) => {
  const names = new Set();
  const walk = (elements) => {
    for (const element of elements) {
      if (element.type >= 1 && element.type <= 6) names.add(element.value);
      for (const option of Object.values(element.options ?? {})) walk(option.value);
      if (element.children) walk(element.children);
    }
  };
  try { walk(new IntlMessageFormat(value, 'en').getAst()); } catch { /* ICU diagnostics are produced below. */ }
  return [...names].sort();
};

export function validateCatalogs(catalogs, usages) {
  const errors = [], unused = [];
  for (const [namespace, messages] of Object.entries(catalogs)) {
    const keys = new Set([...Object.keys(messages.en), ...Object.keys(messages.vi)]);
    for (const key of keys) {
      if (!(key in messages.en) || !(key in messages.vi)) { errors.push(`Missing translation: ${namespace}.${key}`); continue; }
      const englishArguments = argumentsOf(messages.en[key]);
      if (JSON.stringify(englishArguments) !== JSON.stringify(argumentsOf(messages.vi[key]))) errors.push(`Interpolation arguments differ: ${namespace}.${key}`);
      for (const locale of ['en', 'vi']) {
        const values = Object.fromEntries(argumentsOf(messages[locale][key]).map((name) => [name, 2]));
        const translator = createTranslator({ locale, messages: { value: messages[locale][key] }, onError: (error) => errors.push(`Invalid ICU ${namespace}.${key} (${locale}): ${error.code}`) });
        translator('value', values);
      }
      if (!usages.some((usage) => usage.namespace === namespace && usage.key === key)) unused.push(`${namespace}.${key}`);
    }
  }
  for (const usage of usages) {
    if (!(usage.key in (catalogs[usage.namespace]?.en ?? {}))) errors.push(`Unknown used key: ${usage.namespace}.${usage.key} at ${usage.file}:${usage.line}`);
  }
  return { errors: [...new Set(errors)], unused };
}

function sourceFile(file, source) { return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); }
function educationalAncestor(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    const opening = ts.isJsxElement(parent) ? parent.openingElement : ts.isJsxSelfClosingElement(parent) ? parent : null;
    if (!opening) continue;
    if (opening.tagName.getText() === 'code') return 'technical-identifier';
    if (opening.attributes.properties.some((attr) => ts.isJsxAttribute(attr) && attr.name.getText() === 'translate' && attr.initializer?.getText() === '"no"')) return 'technical-identifier';
    if (opening.attributes.properties.some((attr) => ts.isJsxAttribute(attr) && attr.name.getText() === 'lang' && attr.initializer?.getText() === '"en"')) return 'learning-content';
  }
  return null;
}
export function inventorySource(file, source) {
  const tree = sourceFile(file, source), rows = [];
  const visit = (node) => {
    if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.text.replace(/\s+/gu, ' ').trim();
      if (text && /[\p{L}]/u.test(text)) {
        const attr = ts.isJsxAttribute(node.parent) ? node.parent.name.getText() : null;
        const isVisible = ts.isJsxText(node) || ['aria-label', 'title', 'placeholder', 'alt', 'label'].includes(attr);
        const ancestor = educationalAncestor(node);
        let category = ancestor ?? (isVisible ? 'system-ui' : 'technical-identifier');
        if (ts.isNewExpression(node.parent) && node.parent.expression.getText() === 'Error') category = 'system-error-identifier';
        rows.push({ file, line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1, text, category, visible: isVisible });
      }
    }
    // Dynamic values are an explicit boundary: do not rewrite user or curriculum data.
    if (ts.isJsxExpression(node) && node.expression && /\b(?:lesson|activity|content|transcript|question|option|block|profile|user)\b/u.test(node.expression.getText()) && !node.expression.getText().startsWith('t(')) {
      rows.push({ file, line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1, text: node.expression.getText(), category: /\b(?:profile|user)\b/u.test(node.expression.getText()) ? 'user-generated-content' : 'learning-content', dynamic: true });
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return rows;
}
export function sourceUsage(file, source, catalogs = {}) {
  const tree = sourceFile(file, source), namespaces = new Map(), calls = [];
  const featureHookNamespaces = { useAdminContent: 'adminContent', useAdminCurriculum: 'adminCurriculum', useAdminAudit: 'adminAudit', useAdminObservability: 'adminObservability' };
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText() === 'useT' && ts.isStringLiteral(node.initializer.arguments[0])) {
      const name = node.name.getText();
      const list = namespaces.get(name) ?? new Set(); list.add(node.initializer.arguments[0].text); namespaces.set(name, list);
    }
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer) && featureHookNamespaces[node.initializer.expression.getText()]) {
      const namespace = featureHookNamespaces[node.initializer.expression.getText()];
      if (ts.isObjectBindingPattern(node.name)) for (const element of node.name.elements) {
        if ((element.propertyName?.getText() ?? element.name.getText()) === 't') {
          const list = namespaces.get(element.name.getText()) ?? new Set(); list.add(namespace); namespaces.set(element.name.getText(), list);
        }
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && /^t\w*$/u.test(node.expression.text) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) calls.push({ variable: node.expression.text, key: node.arguments[0].text, line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
    ts.forEachChild(node, visit);
  };
  visit(tree);
  // The nearest function's translator wins when one file uses more than one namespace.
  const usages = [];
  for (const call of calls) {
    const spaces = namespaces.get(call.variable);
    if (spaces?.size === 1) usages.push({ namespace: [...spaces][0], key: call.key, file, line: call.line });
  }
  // Literal enum maps and state message descriptors are candidate runtime usages.
  const activeSpaces = new Set([...namespaces.values()].flatMap((value) => [...value]));
  const dynamicVisit = (node) => {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.initializer)) {
      for (const namespace of activeSpaces) {
        if (node.initializer.text in (catalogs[namespace]?.en ?? {}) && !usages.some((usage) => usage.namespace === namespace && usage.key === node.initializer.text)) usages.push({ namespace, key: node.initializer.text, file, line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1, dynamic: true });
      }
    }
    ts.forEachChild(node, dynamicVisit);
  };
  dynamicVisit(tree);
  return usages;
}
async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? filesUnder(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
export async function checkRepository() {
  const catalogs = {};
  for (const file of await filesUnder(path.join(root, 'apps/web/src/i18n/messages'))) {
    if (!file.endsWith('.ts')) continue;
    const source = await readFile(file, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    const module = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
    const messages = Object.values(module).find((value) => value?.en && value?.vi);
    if (!messages) throw new Error(`Catalog has no paired dictionaries: ${file}`);
    const namespace = path.basename(file, '.ts');
    catalogs[namespace] = messages;
  }
  const usages = [], inventory = [];
  for (const file of await filesUnder(path.join(root, 'apps/web/src'))) {
    if (!/\.(?:ts|tsx)$/u.test(file) || /\.(?:test|spec)\./u.test(file) || /[\\/]i18n[\\/]/u.test(file) || /test-fixtures/u.test(file)) continue;
    const source = await readFile(file, 'utf8'), relative = path.relative(root, file).replaceAll('\\', '/');
    usages.push(...sourceUsage(relative, source, catalogs));
    inventory.push(...inventorySource(relative, source));
  }
  const results = validateCatalogs(catalogs, usages);
  return { ...results, namespaces: Object.keys(catalogs).length, keys: Object.values(catalogs).reduce((sum, value) => sum + Object.keys(value.en).length, 0), usages: usages.length, inventory };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await checkRepository();
  if (process.argv.includes('--inventory')) await writeFile(path.join(root, 'docs/I18N_STRING_INVENTORY.json'), `${JSON.stringify({ generated: '2026-10-14', ...result }, null, 2)}\n`);
  console.log(`i18n: ${result.namespaces} namespaces, ${result.keys} paired keys, ${result.usages} static usages; ${result.errors.length} errors, ${result.unused.length} candidate unused keys.`);
  for (const error of result.errors) console.error(error);
  if (result.errors.length) process.exitCode = 1;
}
