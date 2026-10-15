// Subprocess-only fault injection: production modules never inspect test flags.
const fs = require('node:fs');
const { syncBuiltinESMExports } = require('node:module');
const mode = process.env.MANDATE_TEST_FAULT;
const write = fs.writeFileSync;
const remove = fs.rmSync;
const link = fs.linkSync;
fs.writeFileSync = function (path, contents, options) {
  const name = String(path).replaceAll('\\', '/');
  if ((mode === 'partial-create' && /\/items\/MND.*\.md(?:\..*\.tmp)?$/.test(name))
    || (mode === 'partial-archive' && /\/archive\/MND.*\.md(?:\..*\.tmp)?$/.test(name))) {
    write.call(fs, path, String(contents).slice(0, 20), options);
    throw Object.assign(new Error('Injected ENOSPC partial item write'), { code: 'ENOSPC' });
  }
  return write.apply(fs, arguments);
};
fs.linkSync = function (source, target) {
  const result = link.apply(fs, arguments);
  if (mode === 'exit-after-publish' && String(target).replaceAll('\\', '/').includes('/archive/MND')) process.exit(87);
  return result;
};
fs.rmSync = function (path) {
  const result = remove.apply(fs, arguments);
  if (mode === 'exit-after-source-remove' && /\/items\/MND.*\.md$/.test(String(path).replaceAll('\\', '/'))) process.exit(88);
  return result;
};
syncBuiltinESMExports();
