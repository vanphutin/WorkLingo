import { untrustedInput } from '../../src/ai-gateway/infrastructure/openai-language-evaluation.adapter.js';
import { buildGoldens, offlineAdapterProbe, digest, MODEL, ENDPOINT } from './provider-calibration.js';

const cost = (input: number, output: number) => Number(((input * 800 + output * 2700) / 1e6).toFixed(7));
interface Row { observationId: string; caseId: string; phase: string; repeatOf: string | null; beforeBytes: number; afterBytes: number; }
function summarize(rows: Row[], field: 'beforeBytes' | 'afterBytes') {
 const bodyBytes = rows.reduce((sum,row)=>sum+row[field],0);
 const inputReservation = bodyBytes + rows.length * 512;
 const outputReservation = rows.length * 2048;
 const reservationInkPoints = cost(inputReservation,outputReservation);
 return {starts:rows.length,bodyBytes,framingReservation:rows.length*512,inputReservation,outputReservation,reservationInkPoints,failedStartReservationInkPoints:reservationInkPoints,minRequestBytes:Math.min(...rows.map(r=>r[field])),maxRequestBytes:Math.max(...rows.map(r=>r[field])),minStartReservationInkPoints:Math.min(...rows.map(r=>cost(r[field]+512,2048))),maxStartReservationInkPoints:Math.max(...rows.map(r=>cost(r[field]+512,2048)))};
}
export async function buildCostBenchmark() {
 const goldens=buildGoldens(); const rows:Row[]=[];
 for(const observation of goldens.schedule){
  const result=await offlineAdapterProbe(goldens.cases.find(c=>c.id===observation.caseId)!);
  const after=result.bodies[0]!; const before=JSON.parse(after);
  before.messages[1].content=untrustedInput(result.input);
  rows.push({...observation,beforeBytes:Buffer.byteLength(JSON.stringify(before)),afterBytes:Buffer.byteLength(after)});
 }
 const groups=(field:'beforeBytes'|'afterBytes')=>({pilot:summarize(rows.filter(r=>r.phase==='pilot'),field),remainder:summarize(rows.filter(r=>r.phase==='remainder'),field),full:summarize(rows,field)});
 return {schemaVersion:'beginner-r12b-cost-benchmark/1',mandate:'MND-20261030-003',provenance:'OFFLINE_REAL_ADAPTER_MOCK_HTTP_ONLY',status:'BLOCKED_BY_BUDGET',model:MODEL,endpoint:ENDPOINT,oracleSha256:goldens.oracleSha256,scheduleSha256:digest(goldens.schedule),actualTokens:'NOT_MEASURED',liveStarts:0,actualSpendInkPoints:0,additionalUSD:0,cacheDiscount:0,anchorRepeats:rows.filter(r=>r.repeatOf).length,pricing:{unit:'INKPOINTS_PER_MILLION_TOKENS',input:800,output:2700,provenance:'OWNER_REPORTED_NOT_LIVE_VERIFIED'},reservationMethod:'UTF8_HTTP_BODY_BYTES_PLUS_512_PER_START; NOT_AN_AUTHENTICATED_TOKENIZER_BOUND',budgetInkPoints:1.5,outputOnlyFloorInkPoints:cost(0,160*2048),worstCaseReservationInkPoints:cost(650000,327680),before:groups('beforeBytes'),after:groups('afterBytes'),rows};
}
