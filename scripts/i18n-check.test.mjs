import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCatalogs, inventorySource, sourceUsage } from './i18n-check.mjs';

test('rejects missing translations and mismatched interpolation arguments', () => {
  const result = validateCatalogs({ sample: { en: { title: 'Hello {name}', missing: 'Retry' }, vi: { title: 'Chào {person}' } } }, []);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors.join('\n'), /sample.missing/);
  assert.match(result.errors.join('\n'), /arguments/);
});
test('rejects invalid ICU messages and unknown used keys', () => {
  const result = validateCatalogs({ sample: { en: { title: 'Hello {name' }, vi: { title: 'Chào {name' } } }, [{ namespace: 'sample', key: 'absent', file: 'sample.tsx', line: 3 }]);
  assert.ok(result.errors.some((error) => /ICU/.test(error)));
  assert.ok(result.errors.some((error) => /absent/.test(error)));
});
test('reports unused keys without rejecting valid plural differences between languages', () => {
  const result = validateCatalogs({ sample: { en: { count: '{count, plural, one {# lesson} other {# lessons}}', unused: 'Retry' }, vi: { count: '{count, plural, other {# bài học}}', unused: 'Thử lại' } } }, [{ namespace: 'sample', key: 'count' }]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.unused, ['sample.unused']);
});
test('does not mistake literal words inside plural clauses for interpolation arguments', () => {
  const result = validateCatalogs({ sample: { en: { count: 'Recall {count, number} target {count, plural, one {phrase} other {phrases}}.' }, vi: { count: 'Nhớ lại {count, number} cụm từ.' } } }, [{ namespace: 'sample', key: 'count' }]);
  assert.deepEqual(result.errors, []);
});
test('inventories static UI while distinguishing English education and machine identifiers', () => {
  const result = inventorySource('fixture.tsx', `export function View(){return <><button aria-label="Continue">Continue</button><p lang="en">Read the English passage.</p><code>en-US</code><p>{lesson.title}</p></>}`);
  assert.ok(result.some((row) => row.text === 'Continue' && row.category === 'system-ui'));
  assert.ok(result.some((row) => row.text === 'Read the English passage.' && row.category === 'learning-content'));
  assert.ok(result.some((row) => row.text === 'en-US' && row.category === 'technical-identifier'));
});
test('ignores declared brand names, language autonyms and version notation', () => {
  const rows = inventorySource('fixture.tsx', '<span translate="no">WorkLingo</span><option lang="vi" translate="no">Tiếng Việt</option><code>CEFR</code>');
  assert.equal(rows.filter((row) => row.category === 'system-ui').length, 0);
});
test('tracks semantic keys used through feature hooks and dynamic label descriptors', () => {
  const source = `const {t} = useAdminContent(); const labels = {DRAFT: 'statusDraft'}; const notice = {key: 'saved'}; t('title'); t(labels[state]);`;
  const used = sourceUsage('fixture.tsx', source, { adminContent: { en: { title: 'Title', statusDraft: 'Draft', saved: 'Saved' } } });
  assert.deepEqual(used.map((row) => row.key).sort(), ['saved', 'statusDraft', 'title']);
});
