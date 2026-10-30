import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as accounting from './cost-accounting-final.js';

test('exact accounting distinguishes the1000x pricing interpretations without floating rounding',()=>{
 assert.equal(typeof accounting.exactReservation,'function');
 assert.equal(accounting.exactReservation(62144,40960,'800','2700'),'160.3072');
 assert.equal(accounting.exactReservation(508013,327680,'800','2700'),'1291.1464');
 assert.equal(accounting.exactReservation(508013,327680,'0.8','2.7'),'1.2911464');
 assert.equal(accounting.exactReservation(1,0,'0.000001','0'),'0.000000000001');
 assert.equal(accounting.exactReservation(650000,327680,'800','2700'),'1404.736');
});
test('ambiguous or noncanonical decimals and invalid counts fail closed',()=>{
 for(const rate of ['1,291.1464','1.291,1464','1e3','NaN','Infinity','-1','+1',' 800','800 ','00.8','0.0000001','.8','1.']) assert.throws(()=>accounting.exactReservation(1,1,rate,'1'),/CANONICAL_DECIMAL/);
 for(const n of [NaN,Infinity,-1,1.5,Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>accounting.exactReservation(n,1,'1','1'),/TOKEN_COUNT/);
});
test('budget comparisons preserve the exact boundary and never round down to permit starts',()=>{
 assert.equal(accounting.withinBudget('1.5','1.5'),true);
 assert.equal(accounting.withinBudget('1.500000000001','1.5'),false);
 assert.equal(accounting.withinBudget('1291.1464','1.5'),false);
});
test('final report separates bytes, reservations, unknown actual tokens and missing external evidence',()=>{
 const report=accounting.buildFinalCostAccounting();
 assert.equal(report.pilot.starts,20);assert.equal(report.full.starts,160);assert.equal(report.anchorRepeats,32);
 assert.equal(report.pilot.reservedInkPoints,'160.3072');assert.equal(report.full.reservedInkPoints,'1291.1464');
 assert.equal(report.pilot.overheadUnits,10240);assert.equal(report.full.overheadUnits,81920);
 assert.equal(report.actualTokens,'NOT_MEASURED');assert.equal(report.estimatedActualUsage,null);
 assert.equal(report.liveStarts,0);assert.equal(report.actualSpendInkPoints,'0');assert.equal(report.livePermitted,false);
 assert.ok(report.blockers.includes('VERIFIED_CURRENT_QUOTA_REQUIRED'));
 assert.ok(report.blockers.includes('EXACT_ENDPOINT_PRIVACY_REQUIRED'));
 assert.equal(report.full.budgetStatus,'BLOCKED');
});
test('even cheaper unverified pricing and adequate quota cannot manufacture live authority',()=>{
 const blockers=accounting.costEvidenceBlockers({pricingVerified:false,conversionVerified:false,quotaVerified:true,privacyVerified:false,oracleFrozen:false,matchingRuntimeApproval:false});
 assert.ok(blockers.includes('VERIFIED_PRICING_REQUIRED'));assert.ok(blockers.includes('VERIFIED_CONVERSION_REQUIRED'));
 assert.ok(blockers.includes('FROZEN_ORACLE_REQUIRED'));assert.ok(blockers.includes('MATCHING_RUNTIME_APPROVAL_REQUIRED'));
});
