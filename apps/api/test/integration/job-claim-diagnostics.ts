import type { PrismaService } from '../../src/common/database/prisma.service.js';

export interface ClaimLock {
  pid: number;
  locktype: string;
  mode: string;
  granted: boolean;
}

// Test-only queue observation. Never log payloads, SQL text or credentials.
export async function inspectJobClaim(database: PrismaService, now: Date) {
  const jobs = await database.$queryRaw<Array<{
    id: string; status: string; dueAtCapturedNow: boolean; waitingLocks: number;
  }>>`
    SELECT "id", "type", "status", "attemptCount", "maxAttempts",
      to_char("availableAt", 'YYYY-MM-DD HH24:MI:SS.US') AS "availableAt",
      to_char(clock_timestamp(), 'YYYY-MM-DD HH24:MI:SS.US') AS "databaseNow",
      "availableAt" <= ${now} AS "dueAtCapturedNow", "leaseOwner", "leaseExpiresAt",
      (SELECT count(*)::int FROM pg_locks WHERE relation = '"Job"'::regclass AND NOT granted) AS "waitingLocks"
    FROM "Job" ORDER BY "createdAt", "id"
  `;
  // SKIP LOCKED does not wait, so an ungranted-lock count cannot identify
  // contention. Include granted relation/transaction locks and owner activity.
  const locks = await database.$queryRaw<ClaimLock[]>`
    SELECT l.pid, l.locktype, l.mode, l.granted,
      l.virtualtransaction, l.transactionid::text AS "transactionId",
      l.relation::regclass::text AS relation, a.state,
      a.wait_event_type AS "waitEventType", a.wait_event AS "waitEvent",
      a.xact_start::text AS "transactionStartedAt",
      a.backend_xid::text AS "backendTransactionId",
      clock_timestamp()::text AS "observedAt"
    FROM pg_locks l LEFT JOIN pg_stat_activity a ON a.pid = l.pid
    WHERE l.pid IN (
      SELECT pid FROM pg_locks
      WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
        AND relation IN ('"Job"'::regclass, '"JobAttempt"'::regclass)
    ) AND (l.relation IN ('"Job"'::regclass, '"JobAttempt"'::regclass)
      OR l.locktype IN ('transactionid', 'virtualxid', 'tuple'))
    ORDER BY l.pid, l.locktype, l.mode
  `;
  return { jobs, locks };
}
