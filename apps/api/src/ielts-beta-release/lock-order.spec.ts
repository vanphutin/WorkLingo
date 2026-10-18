import { expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import { lockSources } from './release.js';
import type { ReleaseState } from './release-state.js';

it('takes each publisher advisory lock before parent row locks to avoid inversion with concurrent authoring', async () => {
  const events: string[] = [];
  const tx = {
    $executeRaw: async (_query: TemplateStringsArray, ...values: unknown[]) => { events.push(`advisory:${values.join(',')}`); },
    $queryRaw: async () => { events.push('row'); },
  };
  const state = { program: { id: 'program' }, orientation: { id: 'orientation' }, bridges: [{ id: 'bridge' }], profiles: [{ id: 'profile' }], band: { id: 'band' }, mock: { id: 'mock' } };
  await lockSources(tx as unknown as Prisma.TransactionClient, state as unknown as ReleaseState);
  const firstRow = events.indexOf('row');
  expect(events.slice(0, firstRow)).toEqual(expect.arrayContaining([
    'advisory:worklingo:ielts-orientation', 'advisory:worklingo:ielts-bridge:bridge',
    'advisory:ielts-band-curriculum', 'advisory:ielts-mock:mock',
  ]));
  expect(events.slice(firstRow).every((event) => event === 'row')).toBe(true);
});
