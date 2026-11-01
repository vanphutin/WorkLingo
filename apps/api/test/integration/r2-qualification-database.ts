/** Test-only guard. It performs no I/O and never reads environment files. */
export function requireR2QualificationDatabase(ownedUrl: string, testUrl: string | undefined) {
  const owned = new URL(ownedUrl);
  const test = new URL(testUrl ?? 'http://invalid');
  if (owned.protocol !== 'postgresql:' || owned.hostname !== '127.0.0.1' || owned.port !== '55447' || owned.pathname !== '/worklingo_r2'
    || test.protocol !== owned.protocol || test.hostname !== owned.hostname
    || test.port !== owned.port || test.pathname !== owned.pathname) throw new Error('Owned disposable R2 endpoint required');
}
