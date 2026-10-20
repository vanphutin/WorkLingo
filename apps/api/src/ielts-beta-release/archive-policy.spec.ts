import { expect, it } from 'vitest';
import { assertArchivePolicy } from './release-state.js';

it('permits the specifically authorized Orientation restoration but fails closed for newly archived Band/Mock content', () => {
  expect(() => assertArchivePolicy({ orientation: { status: 'ARCHIVED' }, band: { status: 'DRAFT' }, mock: { status: 'VALIDATED' } })).not.toThrow();
  expect(() => assertArchivePolicy({ orientation: { status: 'ARCHIVED' }, band: { status: 'ARCHIVED' }, mock: { status: 'VALIDATED' } })).toThrow('archived');
  expect(() => assertArchivePolicy({ orientation: { status: 'ARCHIVED' }, band: { status: 'DRAFT' }, mock: { status: 'ARCHIVED' } })).toThrow('archived');
});
