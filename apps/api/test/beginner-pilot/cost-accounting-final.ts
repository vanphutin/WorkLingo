/** Read-only accounting reconciliation. No transport, credentials, environment or database access. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const ROOT=resolve(__dirname,'../../../..');
function decimal(value:string,precision:number):bigint {
 if(typeof value!=='string'||value.length>40||!new RegExp(`^(?:0|[1-9][0-9]*)(?:\\.[0-9]{1,${precision}})?$`,'u').test(value))throw Error('CANONICAL_DECIMAL_REQUIRED');
 const [whole,fraction='']=value.split('.');return BigInt(whole!)*10n**BigInt(precision)+BigInt(fraction.padEnd(precision,'0'));
}
function format(value:bigint,precision:number):string {
 const padded=value.toString().padStart(precision+1,'0');const fraction=padded.slice(-precision).replace(/0+$/u,'');return padded.slice(0,-precision)+(fraction?'.'+fraction:'');
}
/** Rates are InkPoints per million tokens, at most six decimal places. Counts are reservations, not measured usage. */
export function exactReservation(input:number,output:number,inputRate:string,outputRate:string):string {
 if(![input,output].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('TOKEN_COUNT_REQUIRED');
 return format(BigInt(input)*decimal(inputRate,6)+BigInt(output)*decimal(outputRate,6),12);
}
export function withinBudget(reservation:string,budget:string):boolean{return decimal(reservation,12)<=decimal(budget,12);}
interface Evidence {pricingVerified?:boolean;conversionVerified?:boolean;quotaVerified?:boolean;privacyVerified?:boolean;oracleFrozen?:boolean;matchingRuntimeApproval?:boolean;}
/** Missing evidence remains blocked; this checklist is never executable live authority. */
export function costEvidenceBlockers(evidence:Evidence={}):string[]{
 const requirements: [keyof Evidence,string][]=[['pricingVerified','VERIFIED_PRICING_REQUIRED'],['conversionVerified','VERIFIED_CONVERSION_REQUIRED'],['quotaVerified','VERIFIED_CURRENT_QUOTA_REQUIRED'],['privacyVerified','EXACT_ENDPOINT_PRIVACY_REQUIRED'],['oracleFrozen','FROZEN_ORACLE_REQUIRED'],['matchingRuntimeApproval','MATCHING_RUNTIME_APPROVAL_REQUIRED']];
 return requirements.filter(([key])=>evidence[key]!==true).map(([,reason])=>reason);
}
interface Group {starts:number;bodyBytes:number;framingReservation:number;inputReservation:number;outputReservation:number;reservationInkPoints:number;}
interface Benchmark {anchorRepeats:number;oracleSha256:string;scheduleSha256:string;after:{pilot:Group;full:Group};rows:{phase:string;repeatOf:string|null;afterBytes:number}[];}
export function buildFinalCostAccounting(){
 const path='docs/qualification/beginner-r12b-cost-benchmark.json';const raw=readFileSync(resolve(ROOT,path));const benchmark=JSON.parse(raw.toString('utf8')) as Benchmark;
 if(benchmark.rows.length!==160||benchmark.anchorRepeats!==32||benchmark.rows.filter(row=>row.repeatOf).length!==32)throw Error('SCHEDULE_DRIFT');
 const group=(phase:'pilot'|'full')=>{
  const source=benchmark.after[phase];const rows=benchmark.rows.filter(row=>phase==='full'||row.phase==='pilot');
  if(rows.length!==(phase==='pilot'?20:160)||source.starts!==rows.length||rows.reduce((n,row)=>n+row.afterBytes,0)!==source.bodyBytes||source.framingReservation!==rows.length*512||source.inputReservation!==source.bodyBytes+source.framingReservation||source.outputReservation!==rows.length*2048)throw Error('RESERVATION_DRIFT');
  const reservedInkPoints=exactReservation(source.inputReservation,source.outputReservation,'800','2700');
  if(reservedInkPoints!==String(source.reservationInkPoints))throw Error('HISTORICAL_TOTAL_DRIFT');
  return {starts:source.starts,bodyBytes:source.bodyBytes,overheadUnits:source.framingReservation,inputReservationUnits:source.inputReservation,outputReservationTokens:source.outputReservation,reservedInkPoints,failedStartReservationInkPoints:reservedInkPoints,overheadInkPoints:exactReservation(source.framingReservation,0,'800','2700'),outputOnlyReservationInkPoints:exactReservation(0,source.outputReservation,'800','2700'),unverifiedFrozenLowRateScenarioInkPoints:exactReservation(source.inputReservation,source.outputReservation,'0.8','2.7'),budgetStatus:withinBudget(reservedInkPoints,'1.5')?'WITHIN_BUDGET':'BLOCKED'};
 };
 return {schemaVersion:'beginner-r12b-cost-accounting-final/1',mandate:'MND-20261030-004',baseline:'3e120a81239e623209b3ba61889947e9a97cae86',status:'BLOCKED_EXTERNAL_EVIDENCE_AND_BUDGET',source:{path,sha256:createHash('sha256').update(raw).digest('hex'),oracleSha256:benchmark.oracleSha256,scheduleSha256:benchmark.scheduleSha256},arithmetic:'BIGINT_FIXED_POINT_EXACT_NO_ROUNDING',decimalConvention:'ASCII_DOT_DECIMAL_NO_GROUPING',pricing:{unit:'INKPOINTS_PER_MILLION_TOKENS',input:'800',output:'2700',cacheHit:'100',status:'HISTORICAL_OFFICIAL_UI_OBSERVATION_NOT_CURRENT_BILLING_ATTESTATION',discrepancyFactor:'1000',formulaDivisorConflict:'1000_VERSUS_PER_MILLION_1000000'},budgetInkPoints:'1.5',additionalUSD:'0',liveStarts:0,actualSpendInkPoints:'0',actualTokens:'NOT_MEASURED',estimatedActualUsage:null,anchorRepeats:benchmark.anchorRepeats,cacheDiscount:'0',inputReservationMethod:'HTTP_UTF8_BYTES_PLUS_512_ASSUMED_UNITS_PER_START_NOT_AUTHENTICATED_TOKENIZER_BOUND',billingUnknowns:['INKPOINTS_CONVERSION','MINIMUM_BILLING_UNIT','ROUNDING','TIMEOUT_CANCELLATION_NETWORK_INFLIGHT_BILLING','CACHED_INPUT_ELIGIBILITY','EXACT_ENDPOINT_RETENTION_LOGGING_TRAINING_DELETION'],pilot:group('pilot'),full:group('full'),worstCaseInkPoints:exactReservation(650000,327680,'800','2700'),livePermitted:false,blockers:[...costEvidenceBlockers(),'PILOT_RESERVATION_EXCEEDS_1_5_INKPOINTS'],tokenInstrumentation:'EXISTING_OBSERVE_METADATA_AND_BOUNDED_TRANSPORT_REQUIRE_USAGE_NO_NEW_PROVIDER_REQUEST',officialResearch:{quotaObservation:{url:'https://discovery.intern-ai.org.cn/token-plan/points',observer:'COORDINATOR_BROWSER_UI_READ_ONLY',observedDate:'2026-10-30',recordedAt:'2026-10-30T04:55:10Z',observationTimePrecision:'DATE_ONLY_COORDINATOR_REPORT;RECORDED_AT_IS_WRITE_TIME',status:'QUOTA_AVAILABLE_UI_OBSERVED_NOT_BILLING_ATTESTATION',normalization:'OBSERVED_EN_UI_COMMA_THOUSANDS_DOT_DECIMAL_ONLY;API_PARSER_STAYS_STRICT',raw:{balance:'9,835.673',fiveHourRemaining:'10,000.000',fiveHourLimit:'10,000.000',fiveHourUsed:'0.000',sevenDayRemaining:'50,000.000',sevenDayLimit:'50,000.000',sevenDayUsed:'0.000',monthlyFreeBasicGrant:'+10,000.000'},canonical:{balance:'9835.673',fiveHourRemaining:'10000.000',fiveHourLimit:'10000.000',fiveHourUsed:'0.000',sevenDayRemaining:'50000.000',sevenDayLimit:'50000.000',sevenDayUsed:'0.000',monthlyFreeBasicGrant:'10000.000'},missionBudgetUnchanged:'1.5',requestsSent:0},pricingUrl:'https://discovery.intern-ai.org.cn/token-plan/home?tabIndex=3&dockey=04-model-limits-and-pricing.md',publicRead:'2026-10-30_ZERO_READABLE_LINES',privacySearch:'OFFICIAL_HELP_RESULTS_DID_NOT_ESTABLISH_EXACT_ENDPOINT_POLICY',freshAuthenticatedUi:{observedDate:'2026-10-30',observer:'COORDINATOR_BROWSER_UI_READ_ONLY',input:'800',output:'2700',cached:'100',unit:'INKPOINTS_PER_MILLION_TOKENS',formulaDivisor:'1000',exampleEquation:'0.1*2000+0.5*10000+0.2*40000=13200',settlement:'SUCCESSFUL_REQUEST_CURRENT_PRICE_AND_ACTUAL_USAGE',unclassifiedCache:'BILLED_UNCACHED',documentedNoDeduction:['AUTHENTICATION_FAILURE','PARAMETER_ERROR','PLATFORM_OWN_ERROR'],insufficientPoints:'NEW_REQUEST_REJECTED',priceChanges:'POSSIBLE',empiricalBillingVerified:false}}};
}
