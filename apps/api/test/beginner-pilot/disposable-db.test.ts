import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as runtime from './disposable-db.js';
test('foreign DSNs cannot reach disposable database tooling',()=>{
 assert.equal(typeof runtime.assertDisposableUrl,'function','MISSING_DISPOSABLE_GUARD');
 for(const u of ['postgresql://u:p@localhost:5432/worklingo','postgresql://u:p@example.test:55433/worklingo_r12b_evidence_closure_001','postgresql://wl_r12b_evidence_001:p@127.0.0.1:55433/wrong'])assert.throws(()=>runtime.assertDisposableUrl(u),/DISPOSABLE/);
});
test('child environment excludes inherited secrets and DSNs',()=>{assert.equal(typeof runtime.childEnvironment,'function','MISSING_SANITIZED_CHILD');const env=runtime.childEnvironment();assert.equal(env.DATABASE_URL,undefined);assert.equal(env.DISCOVERY_API_KEY,undefined);assert.equal(env.NODE_ENV,'test');});
test('foreign resource labels cannot authorize cleanup',()=>{assert.equal(typeof runtime.assertOwnership,'function','MISSING_OWNERSHIP_GUARD');assert.throws(()=>runtime.assertOwnership({name:'foreign',label:'foreign'}),/OWNERSHIP/);});
test('valid disposable identity is accepted while schema, query and credential ambiguity reject',()=>{const good='postgresql://wl_r12b_evidence_001:synthetic@127.0.0.1:55433/worklingo_r12b_evidence_closure_001?schema=public';assert.equal(runtime.assertDisposableUrl(good).hostname,'127.0.0.1');for(const u of [good+'&host=example.test',good.replace('schema=public','schema=other'),good.replace(':synthetic@',':@'),good.replace('127.0.0.1','localhost')])assert.throws(()=>runtime.assertDisposableUrl(u),/DISPOSABLE/);});
test('cleanup requires exact resource name and current private owner token',()=>{runtime.assertOwnership({name:'worklingo-r12b-evidence-closure-001',label:'owned'},'owned');for(const value of [{name:'foreign',label:'owned'},{name:'worklingo-r12b-evidence-closure-001',label:'foreign'}])assert.throws(()=>runtime.assertOwnership(value,'owned'),/OWNERSHIP/);});
