import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { hasIeltsEarlyAccess, changeIeltsEarlyAccess } from './ielts-early-access.js';

type AccessDb = Parameters<typeof hasIeltsEarlyAccess>[0];
describe('account-scoped IELTS early access', () => {
  it.each([
    [null, false],
    [{ ieltsEarlyAccess: false, user: { status: 'ACTIVE', role: 'LEARNER' } }, false],
    [{ ieltsEarlyAccess: true, user: { status: 'ACTIVE', role: 'LEARNER' } }, true],
    [{ ieltsEarlyAccess: true, user: { status: 'DISABLED', role: 'LEARNER' } }, false],
    [{ ieltsEarlyAccess: true, user: { status: 'ACTIVE', role: 'SYSTEM_ADMIN' } }, false],
  ])('requires an explicit grant on an active learner (%j)', async (profile, expected) => {
    const findUnique = vi.fn().mockResolvedValue(profile);
    const db = { learnerProfile: { findUnique } } as unknown as AccessDb;
    expect(await hasIeltsEarlyAccess(db, 'target-learner')).toBe(expected);
    expect(findUnique).toHaveBeenCalledWith({ where: { userId: 'target-learner' }, select: { ieltsEarlyAccess: true, user: { select: { status: true, role: true } } } });
  });

  function fixture(enabled = false, actorRole = 'CONTENT_ADMIN', targetRole = 'LEARNER') {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const audit = vi.fn();
    const db = { $executeRaw: vi.fn(), user: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
      where.id === 'admin' ? { id: 'admin', status: 'ACTIVE', role: actorRole } : { id: 'target', status: 'ACTIVE', role: targetRole, profile: { ieltsEarlyAccess: enabled } }) },
    learnerProfile: { updateMany }, auditLog: { create: audit } } as unknown as Prisma.TransactionClient;
    return { db, updateMany, audit };
  }

  it('changes only the selected access flag and records the administrative decision', async () => {
    const { db, updateMany, audit } = fixture();
    expect(await changeIeltsEarlyAccess(db, 'admin', 'target', true)).toBe('UPDATED');
    expect(updateMany).toHaveBeenCalledWith({ where: { userId: 'target', ieltsEarlyAccess: false }, data: { ieltsEarlyAccess: true } });
    expect(audit).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: 'admin', action: 'GRANT_IELTS_EARLY_ACCESS', resourceId: 'target', oldState: { ieltsEarlyAccess: false }, newState: { ieltsEarlyAccess: true } }) });
  });
  it('revokes without changing completion evidence and skips an unchanged grant', async () => {
    const revoked = fixture(true);
    expect(await changeIeltsEarlyAccess(revoked.db, 'admin', 'target', false)).toBe('UPDATED');
    expect(revoked.updateMany).toHaveBeenCalledWith({ where: { userId: 'target', ieltsEarlyAccess: true }, data: { ieltsEarlyAccess: false } });
    expect(revoked.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'REVOKE_IELTS_EARLY_ACCESS' }) });
    const unchanged = fixture(true);
    expect(await changeIeltsEarlyAccess(unchanged.db, 'admin', 'target', true)).toBe('UNCHANGED');
    expect(unchanged.updateMany).not.toHaveBeenCalled();
    expect(unchanged.audit).not.toHaveBeenCalled();
  });
  it('rejects an unauthorized actor or non-learner target before mutation', async () => {
    for (const current of [fixture(false, 'LEARNER'), fixture(false, 'CONTENT_ADMIN', 'SYSTEM_ADMIN')]) {
      await expect(changeIeltsEarlyAccess(current.db, 'admin', 'target', true)).rejects.toThrow();
      expect(current.updateMany).not.toHaveBeenCalled();
      expect(current.audit).not.toHaveBeenCalled();
    }
  });
});
