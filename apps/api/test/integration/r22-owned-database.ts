// Guard the tests themselves as well as their config, including direct file runs.
const value = process.env.WL_R22_TEST_DATABASE_URL;
if (!value) throw new Error('EXPLICIT_R22_TEST_DATABASE_REQUIRED');
const target = new URL(value);
if (
  `${target.hostname}:${target.port}${target.pathname}` !==
    '127.0.0.1:55452/worklingo_r22' ||
  (target.searchParams.get('schema') ?? 'public') !== 'public'
) {
  throw new Error('OWNED_DISPOSABLE_R22_DATABASE_REQUIRED');
}
export const r22OwnedDatabaseUrl = value;
