import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as benchmark from './cost-benchmark.js';

test('measures all frozen starts without cache discounts and blocks the 1.5 cap',async()=>{
 assert.equal(typeof benchmark.buildCostBenchmark,'function');
 const report=await benchmark.buildCostBenchmark();
 assert.equal(report.actualTokens,'NOT_MEASURED');assert.equal(report.liveStarts,0);assert.equal(report.actualSpendInkPoints,0);
 assert.equal(report.after.full.starts,160);assert.equal(report.after.pilot.starts,20);assert.equal(report.anchorRepeats,32);
 assert.equal(report.after.full.outputReservation,327680);assert.equal(report.after.full.bodyBytes,426093);
 assert.equal(report.before.full.bodyBytes,471133);assert.equal(report.after.full.reservationInkPoints,1291.1464);
 assert.equal(report.after.pilot.reservationInkPoints,160.3072);assert.equal(report.after.full.failedStartReservationInkPoints,report.after.full.reservationInkPoints);
 assert.equal(report.status,'BLOCKED_BY_BUDGET');assert.equal(report.worstCaseReservationInkPoints,1404.736);
 assert.equal(report.cacheDiscount,0);assert.equal(report.outputOnlyFloorInkPoints,884.736);
});
