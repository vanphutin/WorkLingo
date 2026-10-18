import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRoutes, validateGraph, validateSources, hash, connectTraceability, fieldKey } from '../scripts/analyze/core.mjs';

const source = `import {Controller, Get, Post, UseGuards, Body} from '@nestjs/common';
@Controller('things') @UseGuards(LocalGuard) @Roles('CONTENT_ADMIN')
class ThingsController {
 @Get(':id') @Roles('LEARNER') get(@Param('id', ParseUUIDPipe) id: string): Promise<ThingDto> { return this.service.find(id); }
 @Post() @Public() save(@Body() body: CreateDto) { return this.service.create(body); }
}`;

test('compose controller and method routes, preserve method roles override and body type', () => {
  const routes = extractRoutes(source, 'apps/api/src/things/things.controller.ts', '/api/v1');
  assert.equal(routes.length, 2);
  assert.equal(routes[0].path, '/api/v1/things/:id');
  assert.deepEqual(routes[0].roles, ['LEARNER']);
  assert.deepEqual(routes[0].guards, ['LocalGuard']);
  assert.equal(routes[0].declaredResponse, 'Promise<ThingDto>');
  assert.equal(routes[0].parameters[0].source, 'Param');
  assert.equal(routes[1].parameters[0].type, 'CreateDto');
  assert.equal(routes[1].isPublic, true);
  assert.equal(routes[0].evidence[0].lineStart, 4);
});

test('dynamic controller paths remain unknown instead of fabricated endpoints', () => {
  const routes = extractRoutes('@Controller(PREFIX) class C { @Get() list() {} }', 'c.ts', '/api/v1');
  assert.equal(routes[0].path, null);
  assert.equal(routes[0].status, 'UNKNOWN');
});

test('class and method guards combine while an empty method role list overrides class roles', () => {
  const [route] = extractRoutes("@UseGuards(A) @Roles('ADMIN') @Controller('x') class C { @UseGuards(B) @Roles() @Get() list() {} }", 'c.ts', '');
  assert.deepEqual(route.guards, ['A', 'B']);
  assert.deepEqual(route.roles, []);
});

test('validator rejects dangling links, duplicate IDs and VERIFIED claims without evidence', () => {
  const errors = validateGraph([{id:'A', status:'VERIFIED', relatedIds:['MISSING'], evidence:[]}, {id:'A', status:'UNKNOWN', evidence:[],relatedIds:[]}]);
  assert.ok(errors.some(x => x.includes('MISSING')));
  assert.ok(errors.some(x => x.includes('duplicate')));
  assert.ok(errors.some(x => x.includes('evidence')));
});

test('validator accepts a closed graph with a bounded source reference', () => {
  assert.deepEqual(validateGraph([{id:'A',status:'VERIFIED',relatedIds:['B'],evidence:[{file:'a.ts',symbol:'A',lineStart:1,lineEnd:2}]},{id:'B',status:'UNKNOWN',relatedIds:[],evidence:[]}]), []);
});

test('source validation rejects stale hashes, nonexistent files and out-of-range lines', () => {
  const errors=validateSources([{id:'A',evidence:[{file:'a.ts',lineStart:1,lineEnd:3,sha256:'old'},{file:'missing.ts',lineStart:1,lineEnd:1,sha256:'old'}]}],new Map([['a.ts','one\ntwo']]));
  assert.ok(errors.some(x=>x.includes('stale')));
  assert.ok(errors.some(x=>x.includes('range')));
  assert.ok(errors.some(x=>x.includes('missing.ts')));
});

test('source validation accepts an exact snapshot and rejects sensitive paths', () => {
  assert.deepEqual(validateSources([{id:'A',evidence:[{file:'a.ts',lineStart:1,lineEnd:2,sha256:hash('one\ntwo')}]}],new Map([['a.ts','one\ntwo']])),[]);
  assert.ok(validateSources([{id:'A',evidence:[{file:'.env',lineStart:1,lineEnd:1,sha256:hash('x')}]}],new Map([['.env','x']])).some(x=>x.includes('excluded')));
});

test('traceability connects reviewed use cases to requirements and rules without claiming runtime test coverage', () => {
  const items=[{id:'UC-a',kind:'use-case',relatedIds:[]},{id:'REQ-a',kind:'requirement',relatedIds:[]},{id:'BR-a',kind:'rule',relatedIds:[]}];
  connectTraceability(items,[{useCase:'UC-a',requirements:['REQ-a'],rules:['BR-a']}]);
  assert.deepEqual(items[0].relatedIds,['REQ-a','BR-a']);
  assert.equal(items[0].relationships[0].status,'INFERRED');
  assert.throws(()=>connectTraceability(items,[{useCase:'UC-a',requirements:['MISSING'],rules:[]}]),/MISSING/);
});

test('unknown item kinds cannot silently disappear from navigation', () => {
  assert.ok(validateGraph([{id:'A',kind:'business-rule',status:'UNKNOWN',relatedIds:[],evidence:[]}]).some(x=>x.includes('unsupported kind')));
});

test('supplemental and nested test citations reject missing files, stale hashes and invalid bounds', () => {
  const item={id:'UC-a',evidence:[],testEvidence:[{file:'test.ts',symbol:'test',lineStart:1,lineEnd:8,sha256:'old'}],details:{sourceEvidence:[{file:'missing.ts',symbol:'missing',lineStart:1,lineEnd:1,sha256:'old'}]}};
  const errors=validateSources([item],new Map([['test.ts','one\ntwo']]));
  assert.ok(errors.some(x=>x.includes('stale hash test.ts')));
  assert.ok(errors.some(x=>x.includes('range exceeds source test.ts')));
  assert.ok(errors.some(x=>x.includes('missing.ts')));
});

test('ERD markers preserve compound primary key columns and ordinary unique fields', () => {
  assert.equal(fieldKey({primaryKey:{fields:['missionId','lessonId']}},{name:'missionId',isId:false,isUnique:false}),' PK');
  assert.equal(fieldKey({primaryKey:{fields:['missionId','lessonId']}},{name:'lessonId',isId:false,isUnique:false}),' PK');
  assert.equal(fieldKey({primaryKey:['id']},{name:'id',isId:true}),' PK');
  assert.equal(fieldKey({primaryKey:[]},{name:'email',isUnique:true}),' UK');
  assert.equal(fieldKey({primaryKey:[]},{name:'label'}),'');
});
