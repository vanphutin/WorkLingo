import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import prismaInternals from '@prisma/internals';
import { hash, stableId, parseSource, extractRoutes, evidence, decorators, decoratorName, decoratorArgs, deco, validateGraph, connectTraceability, citations, fieldKey } from './core.mjs';
const { getDMMF } = prismaInternals;

const home = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.resolve(home, '../..');
const slash = p => p.replaceAll('\\','/');
const rel = p => slash(path.relative(root,p));
const items = [];
const inventory = [];
const sources = new Map();
const asts = new Map();
const moduleMap = new Map();
const allowed = new Set(['.ts','.tsx','.js','.mjs','.json','.prisma','.sql','.md','.yaml','.yml','.ps1','.toml','.css']);
const skip = new Set(['node_modules','.git','.next','.next-e2e','dist','build','coverage','generated','test-results','playwright-report','system-documentation','content-drafts','data']);

function moduleFor(file) {
  if (file.startsWith('apps/api/src/')) return `MOD-${file.split('/').length===4 ? 'api' : file.split('/')[3]}`;
  if (file.startsWith('apps/api/test/')) return 'MOD-api-tests';
  if (file.startsWith('apps/api/prisma/')) return 'MOD-database';
  if (file.startsWith('apps/api/')) return 'MOD-api';
  if (file.startsWith('apps/web/')) return 'MOD-web';
  if (file.startsWith('packages/')) return `MOD-package-${file.split('/')[1]}`;
  if (file.startsWith('scripts/')) return 'MOD-operations-scripts';
  if (file.startsWith('infra/') || file.startsWith('.github/')) return 'MOD-infra';
  if (file.startsWith('docs/')) return 'MOD-existing-docs';
  return 'MOD-workspace';
}
const sourceKind = file => /\.(spec|test)\.[cm]?[jt]sx?$/.test(file) || file.includes('/e2e/') ? 'test' : file.endsWith('migration.sql') ? 'migration' : file.endsWith('.prisma') ? 'schema' : file.startsWith('docs/') || file.endsWith('.md') ? 'document' : /\.[cm]?[jt]sx?$/.test(file) ? 'source' : 'configuration';

async function walk(dir) {
  for (const ent of await fs.readdir(dir,{withFileTypes:true})) {
    if (ent.isSymbolicLink()) continue;
    if (ent.isDirectory()) { if (!skip.has(ent.name)) await walk(path.join(dir,ent.name)); continue; }
    if (!ent.isFile() || ent.name.startsWith('.env') || !allowed.has(path.extname(ent.name)) || ent.name.endsWith('.d.ts')) continue;
    const abs = path.join(dir,ent.name), file = rel(abs);
    const text = await fs.readFile(abs,'utf8');
    const entry = {file,module:moduleFor(file),kind:sourceKind(file),sha256:hash(text),lines:text.split('\n').length,analysis:'INVENTORIED'};
    inventory.push(entry); sources.set(file,text);
  }
}
for (const dir of ['apps','packages','scripts','infra','docs','.github']) {
  try { await walk(path.join(root,dir)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
for (const file of ['package.json','pnpm-workspace.yaml','tsconfig.base.json','eslint.config.mjs','README.md','AGENTS.md']) {
  const text = await fs.readFile(path.join(root,file),'utf8'); sources.set(file,text); inventory.push({file,module:moduleFor(file),kind:sourceKind(file),sha256:hash(text),lines:text.split('\n').length,analysis:'INVENTORIED'});
}
inventory.sort((a,b)=>a.file.localeCompare(b.file));
const fileEvidence = (file,symbol,lineStart=1,lineEnd=1) => ({file,symbol,lineStart,lineEnd,sha256:hash(sources.get(file))});
const push = item => { item.relatedIds ??= []; item.evidence ??= []; items.push(item); return item; };

for (const entry of inventory) {
  if (!moduleMap.has(entry.module)) moduleMap.set(entry.module,{id:entry.module,kind:'module',name:entry.module.replace('MOD-',''),module:entry.module,status:'VERIFIED',description:'Source boundary grouped by application/package or API source directory. Responsibilities are evidenced by registered classes, routes, imports and curated use cases. File discovery does not imply complete behavioral analysis.',path:entry.file.split('/').slice(0,entry.file.startsWith('apps/api/src/') ? 4 : entry.file.startsWith('packages/') ? 2 : 1).join('/'),evidence:[],relatedIds:[],dependencies:[],classes:[],sourceFiles:[]});
  moduleMap.get(entry.module).sourceFiles.push(entry.file);
  if (/\.[cm]?[jt]sx?$/.test(entry.file)) {
    const sf = parseSource(sources.get(entry.file),entry.file);
    if (sf.parseDiagnostics.length) throw new Error(`TypeScript syntax diagnostics in ${entry.file}`);
    asts.set(entry.file,sf); entry.analysis = 'STRUCTURALLY_ANALYZED';
  }
}
for (const mod of moduleMap.values()) {
  const preferred = mod.sourceFiles.find(f=>f.endsWith('.module.ts')) ?? mod.sourceFiles.find(f=>f.endsWith('package.json')) ?? mod.sourceFiles[0];
  mod.evidence = [fileEvidence(preferred,`source boundary ${mod.name}`)]; push(mod);
}

const schemaFile = 'apps/api/prisma/schema.prisma';
const schemaText = sources.get(schemaFile);
const dmmf = await getDMMF({datamodel:schemaText});
const schemaLines = schemaText.split('\n');
function blockRef(kind,name) {
  const start = schemaLines.findIndex(line=>new RegExp(`^${kind}\\s+${name}\\s*\\{`).test(line));
  const end = schemaLines.findIndex((line,i)=>i>start && /^}/.test(line));
  if (start < 0 || end < 0) throw new Error(`Missing schema block ${name}`);
  return fileEvidence(schemaFile,name,start+1,end+1);
}
for (const model of dmmf.datamodel.models) {
  const ref = blockRef('model',model.name);
  const indexes = schemaLines.slice(ref.lineStart-1,ref.lineEnd).map((line,i)=>({definition:line.trim(),line:ref.lineStart+i})).filter(x=>/^@@(index|unique|id)/.test(x.definition));
  push({id:`ENT-${model.name}`,kind:'entity',name:model.name,module:'MOD-database',status:'VERIFIED',description:'Prisma schema declaration parsed using the Prisma DMMF parser. Physical schema application to any live database has not been inspected.',evidence:[ref],relatedIds:['MOD-database'],tableName:model.dbName ?? model.name,primaryKey:model.primaryKey ?? model.fields.filter(f=>f.isId).map(f=>f.name),uniqueFields:model.uniqueFields,uniqueIndexes:model.uniqueIndexes,indexes,
    fields:model.fields.map(f=>({name:f.name,type:f.type,kind:f.kind,isRequired:f.isRequired,isList:f.isList,isId:f.isId,isUnique:f.isUnique,isUpdatedAt:f.isUpdatedAt,default:f.default,dbName:f.dbName,relationFromFields:f.relationFromFields,relationToFields:f.relationToFields,relationName:f.relationName})),
    relations:model.fields.filter(f=>f.kind==='object' && f.relationFromFields?.length).map(f=>({field:f.name,target:f.type,from:f.relationFromFields,to:f.relationToFields,onDelete:f.relationOnDelete ?? 'Prisma default; see migration',relationName:f.relationName})),
  });
}
for (const en of dmmf.datamodel.enums) push({id:`ENUM-${en.name}`,kind:'enum',name:en.name,module:'MOD-database',status:'VERIFIED',description:'Persisted enum declaration. An enum alone does not establish valid state transitions.',values:en.values.map(v=>v.name),evidence:[blockRef('enum',en.name)],relatedIds:['MOD-database']});
for (const entry of inventory.filter(x=>x.file===schemaFile)) entry.analysis='STRUCTURALLY_ANALYZED';
const entityByDelegate = new Map(dmmf.datamodel.models.map(m=>[m.name[0].toLowerCase()+m.name.slice(1),`ENT-${m.name}`]));
for (const entity of items.filter(x=>x.kind==='entity')) {
  entity.relatedIds.push(...entity.relations.map(r=>`ENT-${r.target}`));
  entity.relatedIds.push(...entity.fields.filter(f=>f.kind==='enum').map(f=>`ENUM-${f.type}`));
}

const classByName = new Map();
const methods = [];
const importEdges = [];
function resolveImport(file,spec) {
  if (spec.startsWith('@worklingo/')) return moduleMap.has(`MOD-package-${spec.split('/')[1]}`) ? `MOD-package-${spec.split('/')[1]}` : null;
  if (!spec.startsWith('.')) return null;
  const resolved = slash(path.posix.normalize(path.posix.join(path.posix.dirname(file),spec))).replace(/\.js$/,'.ts');
  for (const candidate of [resolved,`${resolved}.ts`,`${resolved}.tsx`,`${resolved}/index.ts`]) if (sources.has(candidate)) return moduleFor(candidate);
  return null;
}
for (const [file,sf] of asts) {
  const module = moduleFor(file);
  const mod = moduleMap.get(module);
  for (const stmt of sf.statements) {
    if (ts.isImportDeclaration(stmt)) {
      const target = resolveImport(file,stmt.moduleSpecifier.text);
      if (target && target!==module) { mod.dependencies.push(target); importEdges.push({from:module,to:target,file}); }
    }
  }
  if (sourceKind(file)==='test') {
    const cases=[];
    const scan = node => {
      if (ts.isCallExpression(node) && /^(test|it)(\.|$)/.test(node.expression.getText(sf))) {
        const name=node.arguments[0];
        if (name && ts.isStringLiteralLike(name)) cases.push({name:name.text,line:sf.getLineAndCharacterOfPosition(node.getStart(sf)).line+1,mode:node.expression.getText(sf).includes('skip') ? 'SKIPPED_DECLARATION' : 'DECLARED'});
      }
      ts.forEachChild(node,scan);
    }; scan(sf);
    push({id:stableId('TEST',file),kind:'test',name:file.split('/').at(-1),module,status:'VERIFIED',description:'Existing test source inventoried, not executed by this documentation run. Literal test titles extracted with TypeScript AST; dynamic/parameterized expansion counts remain unknown.',execution:'NOT_RUN',testType:file.includes('/e2e/')?'E2E':file.includes('/integration/')?'Integration':file.includes('/qualification/')?'Qualification':'Unit / source test',cases,evidence:[fileEvidence(file,'test file',1,sf.getLineAndCharacterOfPosition(sf.end).line+1)],relatedIds:[module,...mod.dependencies]});
    continue;
  }
  if (file.startsWith('apps/web/src/app/') && /\/(page|route)\.tsx?$/.test(file)) {
    const route = '/'+file.slice('apps/web/src/app/'.length).split('/').slice(0,-1).filter(s=>!s.startsWith('(')).join('/');
    push({id:stableId('PAGE',file),kind:'route',name:route,module,status:'VERIFIED',description:'Next.js App Router file-based page route. Route groups are omitted; dynamic segment names remain as declared. Rendering/auth behavior requires component-level evidence.',path:route,evidence:[fileEvidence(file,'Next.js page',1,Math.min(12,sources.get(file).split('\n').length))],relatedIds:[module]});
  }
  for (const stmt of sf.statements) {
    if (ts.isClassDeclaration(stmt) && stmt.name) {
      const name=stmt.name.text;
      mod.classes.push(name);
      const fields=stmt.members.filter(ts.isPropertyDeclaration).map(p=>({name:p.name.getText(sf),type:p.type?.getText(sf)??'UNKNOWN',optional:Boolean(p.questionToken),validators:decorators(p).map(d=>d.expression.getText(sf))}));
      const moduleDecorator = deco(stmt,'Module');
      const item=push({id:stableId('SYM',`${file}:${name}`),kind:'symbol',name,module,status:'VERIFIED',description:deco(stmt,'Controller')?'NestJS controller declaration':moduleDecorator?'NestJS module registration':file.includes('/dto/')?'DTO declaration and property-level validators; declared types do not prove runtime serialization.':'Class declaration; methods and static calls inventoried.',fields,evidence:[evidence(sf,stmt,name)],relatedIds:[module],decorators:decorators(stmt).map(decoratorName)});
      if (moduleDecorator) item.registration = decoratorArgs(moduleDecorator).map(x=>x.getText(sf));
      if (!classByName.has(name)) classByName.set(name,[]);
      classByName.get(name).push(item);
      const injected = Object.fromEntries(stmt.members.filter(ts.isConstructorDeclaration).flatMap(c=>c.parameters.filter(p=>p.type).map(p=>[p.name.getText(sf),p.type.getText(sf)])));
      for (const method of stmt.members.filter(ts.isMethodDeclaration)) {
        const name=`${stmt.name.text}.${method.name.getText(sf)}`;
        const calls=[],errors=[],delegates=[],callTypes=[];
        const scan=n=>{
          if (ts.isCallExpression(n)) {
            const call=n.expression.getText(sf); calls.push(call);
            const match=call.match(/^this\.([\w]+)\.([\w]+)$/);
            if (match && injected[match[1]]) callTypes.push({class:injected[match[1]],method:match[2]});
          }
          if (ts.isPropertyAccessExpression(n) && entityByDelegate.has(n.name.text)) delegates.push(entityByDelegate.get(n.name.text));
          if (ts.isNewExpression(n) && n.expression.getText(sf).endsWith('Exception')) errors.push(n.expression.getText(sf));
          ts.forEachChild(n,scan);
        }; if(method.body) scan(method.body);
        const child=push({id:stableId('SYM',`${file}:${name}`),kind:'symbol',name,module,status:'VERIFIED',description:'Static method declaration and calls. Call targets resolved only for named injected class types; dynamic dispatch and transaction semantics require behavioral review.',declaredResponse:method.type?.getText(sf)??'UNKNOWN',calls:[...new Set(calls)],errors:[...new Set(errors)],evidence:[evidence(sf,method,name)],relatedIds:[module,item.id,...new Set(delegates)]});
        methods.push({item:child,callTypes});
      }
    }
    if (ts.isFunctionDeclaration(stmt) && stmt.name) push({id:stableId('SYM',`${file}:${stmt.name.text}`),kind:'symbol',name:stmt.name.text,module,status:'VERIFIED',description:'Top-level function declaration; not executed during analysis.',evidence:[evidence(sf,stmt,stmt.name.text)],relatedIds:[module]});
    if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt) || ts.isEnumDeclaration(stmt)) {
      const name=stmt.name.text;
      const contract=push({id:stableId('SYM',`${file}:${name}`),kind:'symbol',name,module,status:'VERIFIED',description:'Declared TypeScript contract; compile-time shape is not runtime validation or serialization.',declarationType:ts.isInterfaceDeclaration(stmt)?'interface':ts.isEnumDeclaration(stmt)?'enum':'type alias',
        fields:ts.isInterfaceDeclaration(stmt)?stmt.members.filter(ts.isPropertySignature).map(p=>({name:p.name.getText(sf),type:p.type?.getText(sf)??'UNKNOWN',optional:Boolean(p.questionToken)})):[],
        declaredShape:ts.isTypeAliasDeclaration(stmt)?stmt.type.getText(sf):undefined,
        evidence:[evidence(sf,stmt,name)],relatedIds:[module]});
      if (!classByName.has(name)) classByName.set(name,[]);
      classByName.get(name).push(contract);
    }
  }
}
for (const {item,callTypes} of methods) for (const call of callTypes) {
  for (const target of methods.filter(m=>m.item.name===`${call.class}.${call.method}`)) item.relatedIds.push(target.item.id);
}

const prefixes=[];
const globalGuards=[];
for (const [file,sf] of asts) {
  if (sourceKind(file)==='test') continue;
  const scan=node=>{
    if (file==='apps/api/src/main.ts' && ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text==='setGlobalPrefix') {
      const arg=node.arguments[0]; if (arg && ts.isStringLiteralLike(arg)) prefixes.push(arg.text);
    }
    if (ts.isObjectLiteralExpression(node)) {
      const props=node.properties.filter(ts.isPropertyAssignment);
      const provider=props.find(p=>p.name.getText(sf)==='provide');
      const useClass=props.find(p=>p.name.getText(sf)==='useClass');
      if (provider?.initializer.getText(sf)==='APP_GUARD' && useClass) globalGuards.push(useClass.initializer.getText(sf));
    }
    ts.forEachChild(node,scan);
  };scan(sf);
}
if (prefixes.length!==1) throw new Error('Unsupported global API prefix; update extractor instead of assuming.');
for (const required of ['SessionAuthGuard','RolesGuard','RateLimitGuard']) if (!globalGuards.includes(required)) throw new Error(`Global guard registration changed: ${required}; review auth extraction.`);
const prefix = `/${prefixes[0]}`;
const guardSources = ['apps/api/src/auth/auth.module.ts','apps/api/src/auth/infrastructure/session-auth.guard.ts','apps/api/src/auth/infrastructure/roles.guard.ts','apps/api/src/common/rate-limit/rate-limit.module.ts'];
for (const [file,sf] of asts) {
  if (sourceKind(file)==='test') continue;
  for (const api of extractRoutes(sf.text,file,prefix)) {
    api.globalGuards = [...new Set(globalGuards)];
    api.authentication=api.isPublic ? 'PUBLIC' : 'SESSION_COOKIE';
    api.authorization=api.roles.length ? 'RolesGuard: exact any-of role membership; service ownership checks are separate.' : 'Authenticated unless Public; no role metadata restriction declared.';
    api.guards=[...api.globalGuards,...api.guards];
    api.evidence.push(...guardSources.map(f=>fileEvidence(f,f.split('/').at(-1),1,sources.get(f).split('\n').length)),fileEvidence('apps/api/src/main.ts','bootstrap global prefix / validation',18,29));
    api.relatedIds.push(moduleFor(file));
    for (const m of methods.filter(m=>m.item.name===`${api.controller}.${api.handler}` && m.item.evidence[0].file===file)) api.relatedIds.push(m.item.id);
    api.dtoIds=[];
    for (const p of api.parameters) for (const c of classByName.get(p.type)??[]) { api.dtoIds.push(c.id); api.relatedIds.push(c.id); }
    for (const name of api.declaredResponse.match(/[A-Za-z_$][\w$]*/g)??[]) for (const c of classByName.get(name)??[]) api.relatedIds.push(c.id);
    push(api);
  }
}

push({id:'SEC-api-role-matrix',kind:'security',name:'API role metadata matrix',module:'MOD-auth',status:'VERIFIED',description:'Declared global SessionAuthGuard and RolesGuard policy for each route. pass-role-check means only that the role metadata check permits this role; ownership, account/session validity, validation, rate limits and service checks may still deny. There is no implicit administrative role hierarchy. Public means the authentication guard is bypassed, not unconditional authorization.',
  permissions:items.filter(x=>x.kind==='api').map(api=>({apiId:api.id,method:api.method,path:api.path,authentication:api.authentication,requiredAnyRoles:api.roles,roleMetadata:Object.fromEntries(['LEARNER','CONTENT_ADMIN','SYSTEM_ADMIN'].map(role=>[role,api.roles.length===0||api.roles.includes(role)?'pass-role-check':'deny-role-check'])),ownership:'See linked reviewed use cases / service methods; not inferred from role metadata.'})),
  evidence:guardSources.map(f=>fileEvidence(f,f.split('/').at(-1),1,sources.get(f).split('\n').length)),relatedIds:items.filter(x=>x.kind==='api').map(x=>x.id)});

const migrationFiles=inventory.filter(x=>x.kind==='migration');
for (const entry of migrationFiles) {
  const sql=sources.get(entry.file);
  const creates=[...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map(x=>x[1]);
  const foreignKeys=[...sql.matchAll(/ALTER TABLE "([^"]+)"\s+ADD CONSTRAINT "([^"]+)"\s+FOREIGN KEY \(([^)]+)\) REFERENCES "([^"]+)"\(([^)]+)\)([^;]*);/g)].map(x=>({table:x[1],constraint:x[2],fields:x[3],target:x[4],references:x[5],actions:x[6].trim()}));
  push({id:stableId('MIG',entry.file),kind:'migration',name:entry.file.split('/').at(-2),module:'MOD-database',status:'VERIFIED',description:'SQL migration file inventoried; CREATE TABLE and FK metadata extracted for cross-check. SQL extraction is bounded and is not a full SQL parser; application status on a running database is UNKNOWN.',creates,foreignKeys,evidence:[fileEvidence(entry.file,'SQL migration',1,entry.lines)],relatedIds:['MOD-database',...creates.filter(n=>dmmf.datamodel.models.some(m=>m.name===n)).map(n=>`ENT-${n}`)]}); entry.analysis='STRUCTURALLY_ANALYZED';
}
for (const entry of inventory.filter(x=>x.kind==='document')) {
  const headings=sources.get(entry.file).split('\n').map((line,i)=>({title:line.replace(/^#+\s*/,''),line:i+1,heading:/^#+\s/.test(line)})).filter(x=>x.heading).slice(0,24).map(({title,line})=>({title,line}));
  push({id:stableId('DOC',entry.file),kind:'document',name:headings[0]?.title??entry.file,module:entry.module,status:'DOCUMENTED_ONLY',description:'Existing documentation inventoried by headings. Claims in this document are not automatically promoted to implemented behavior.',headings,evidence:[fileEvidence(entry.file,headings[0]?.title??'document',1,Math.min(entry.lines,8))],relatedIds:[entry.module]}); entry.analysis='STRUCTURALLY_ANALYZED';
}
for (const packageFile of inventory.filter(x=>x.file.endsWith('package.json'))) {
  const pkg=JSON.parse(sources.get(packageFile.file));
  push({id:stableId('CONFIG',packageFile.file),kind:'integration',name:pkg.name??packageFile.file,module:packageFile.module,status:'VERIFIED',description:'Package manifest dependency and script declarations, not proof that a service is running.',dependencies:pkg.dependencies??{},devDependencies:pkg.devDependencies??{},scripts:pkg.scripts??{},engines:pkg.engines??{},evidence:[fileEvidence(packageFile.file,'package manifest',1,packageFile.lines)],relatedIds:[packageFile.module]}); packageFile.analysis='STRUCTURALLY_ANALYZED';
}
for (const mod of moduleMap.values()) { mod.dependencies=[...new Set(mod.dependencies)].sort(); mod.relatedIds.push(...mod.dependencies); }

const curatedFiles=['curated-core.json','curated-learning.json','curated-architecture.json'];
const curatedDocuments=[];
for (const filename of curatedFiles) {
  try {
    const data=JSON.parse(await fs.readFile(path.join(home,'data',filename),'utf8'));
    curatedDocuments.push({filename,data});
    for (const item of data.items) {
      for (const ref of citations(item)) {
        if (!sources.has(ref.file)) throw new Error(`Curated evidence excluded or missing: ${ref.file}`);
        const digest=hash(sources.get(ref.file));
        if (ref.sha256 && ref.sha256!==digest) throw new Error(`Stale curated evidence ${item.id}: ${ref.file}`);
        ref.sha256=digest;
      }
      item.curated=true;
      item.relatedIds??=[];
      if (item.module && moduleMap.has(item.module)) item.relatedIds.push(item.module);
      for (const file of item.testFiles??[]) {
        const t=items.find(x=>x.kind==='test' && x.evidence[0].file===file);
        if (!t) throw new Error(`Curated test file not inventoried: ${file}`);
        item.relatedIds.push(t.id);
      }
      for (const ref of citations(item)) {
        const test=items.find(x=>x.kind==='test' && x.evidence[0].file===ref.file);
        if(test) item.relatedIds.push(test.id);
      }
      for (const file of item.relatedSourceFiles??[]) item.relatedIds.push(...items.filter(x=>['api','symbol'].includes(x.kind) && x.evidence[0].file===file).map(x=>x.id));
      for (const ref of item.evidence??[]) item.relatedIds.push(...items.filter(x=>x.kind==='api' && x.evidence[0].file===ref.file && x.evidence[0].lineStart<=ref.lineEnd && x.evidence[0].lineEnd>=ref.lineStart).map(x=>x.id));
      push(item);
    }
  } catch (err) { if (err.code==='ENOENT') console.log(`Pending curated analysis: ${filename}`); else throw err; }
}

const reviewedGroups=JSON.parse(await fs.readFile(path.join(home,'data/relationships.json'),'utf8'));
connectTraceability(items,reviewedGroups);

const escapeLabel=s=>s.replaceAll('"',"'").replace(/[<>]/g,'');
const depNodes=[...moduleMap.values()].filter(x=>x.id!=='MOD-existing-docs' && x.id!=='MOD-api-tests');
const nodeId=id=>'n'+hash(id).slice(0,10);
const useCases=items.filter(x=>x.kind==='use-case');
const actorLabels=[...new Set(useCases.map(x=>x.actor).filter(x=>typeof x==='string'))];
const actorNodes=actorLabels.map(label=>({label,id:'a'+hash(label).slice(0,10)}));
push({id:'DIA-use-case-actors',kind:'diagram',name:'Actor / use-case map',module:'MOD-api',status:'INFERRED',diagramType:'use-case',description:'Narrative actor-to-use-case grouping from reviewed use-case specifications. This is an analyst map, not an authorization matrix. Exact role enforcement is shown separately in the API role metadata matrix. Filter use-case lists by module or search actor descriptions for a narrower view.',
  code:'flowchart LR\n'+actorNodes.map(a=>` ${a.id}["${escapeLabel(a.label)}"]`).join('\n')+'\n'+useCases.map(uc=>` ${nodeId(uc.id)}(["${escapeLabel(uc.name)}"])`).join('\n')+'\n'+useCases.map(uc=>` ${actorNodes.find(a=>a.label===uc.actor).id} --> ${nodeId(uc.id)}`).join('\n'),
  nodeMap:Object.fromEntries(useCases.map(uc=>[nodeId(uc.id),uc.id])),evidence:useCases.map(uc=>uc.evidence[0]),relatedIds:useCases.map(uc=>uc.id)});
const dependencyCode='flowchart LR\n'+depNodes.map(m=>` ${nodeId(m.id)}["${escapeLabel(m.name)}"]`).join('\n')+'\n'+importEdges.filter(e=>depNodes.some(m=>m.id===e.from)&&depNodes.some(m=>m.id===e.to)).filter((e,i,a)=>a.findIndex(x=>x.from===e.from&&x.to===e.to)===i).map(e=>` ${nodeId(e.from)} --> ${nodeId(e.to)}`).join('\n');
push({id:'DIA-module-dependencies',kind:'diagram',name:'Module dependencies from static imports',module:'MOD-api',status:'VERIFIED',diagramType:'dependency',description:'An arrow means a source import crosses module boundaries, including type imports. It does not assert runtime invocation or deployment topology.',code:dependencyCode,nodeMap:Object.fromEntries(depNodes.map(m=>[nodeId(m.id),m.id])),evidence:importEdges.slice(0,20).map(e=>fileEvidence(e.file,'cross-module import')),relatedIds:depNodes.map(m=>m.id)});
const entities=items.filter(x=>x.kind==='entity');
const erd = selected => 'erDiagram\n'+selected.map(e=>` ${e.name} {\n${e.fields.filter(f=>f.kind!=='object').slice(0,12).map(f=>`  ${f.type.replace(/[^\w]/g,'')} ${f.name}${fieldKey(e,f)}`).join('\n')}\n }`).join('\n')+'\n'+selected.flatMap(e=>e.relations.filter(r=>selected.some(t=>t.name===r.target)).map(r=>{
  const field=e.fields.find(f=>f.name===r.field);
  const unique=r.from.length===1 && e.fields.some(f=>f.name===r.from[0] && (f.isId||f.isUnique)) || e.uniqueFields.some(fields=>fields.length===r.from.length && fields.every(f=>r.from.includes(f)));
  return ` ${e.name} ${unique?'|o':'}o'}--${field.isRequired?'||':'o|'} ${r.target} : "${r.from.join(',')} FK"`;
})).join('\n');
for (const [suffix,selected] of [['all',entities],['identity',entities.filter(e=>['User','UserSession','LearnerProfile','LearningProgram','LearnerProgramEnrollment'].includes(e.name))],['learning',entities.filter(e=>/^(LearningSession|ActivityAttempt|ActivityDraft|Recording|Job|MasteryRecord|MasteryEvent|Mission|LessonVersion|MutationReceipt)$/.test(e.name))]]) {
  if (!selected.length) continue;
  push({id:`DIA-erd-${suffix}`,kind:'diagram',name:`Schema relationships: ${suffix}`,module:'MOD-database',status:'VERIFIED',diagramType:'erd',description:'Only owning-side Prisma @relation(fields,references) links are drawn. Glyphs use relation optionality and scalar/composite uniqueness. Scalar display is capped at 12 fields; entity detail contains every field. Schema is declared, live database state UNKNOWN.',code:erd(selected),evidence:[fileEvidence(schemaFile,'Prisma declared foreign keys',1,schemaLines.length)],relatedIds:selected.map(e=>e.id)});
}

push({id:'FIND-runtime',kind:'finding',name:'Runtime and deployment remain unverified',module:'MOD-api',status:'UNKNOWN',description:'This analysis reads source, schema and migration files. It does not connect to PostgreSQL, inspect migration application state, execute application tests, or verify external provider availability. The documentation package is tested separately.',evidence:[fileEvidence('README.md','local startup instructions',1,Math.min(28,sources.get('README.md').split('\n').length))],relatedIds:['MOD-api','MOD-database']});
push({id:'FIND-extraction-limits',kind:'finding',name:'Static extraction boundaries',module:'MOD-workspace',status:'UNKNOWN',description:'TypeScript AST extracts declarations and direct static calls. Dynamic dispatch, runtime DTO serialization, all service-level error branches, conditional registration, test parameter expansion and SQL semantics are not fully resolved. SQL migration facts use a bounded extractor; Prisma DMMF is authoritative for schema declarations. Files outside the explicit scope are not analyzed.',evidence:[],relatedIds:['MOD-workspace']});

for (const item of items) item.relatedIds=[...new Set(item.relatedIds??[])].filter(id=>id!==item.id);
const errors=validateGraph(items);
if (errors.length) throw new Error(errors.join('\n'));
// Persist the first reviewed snapshot. On later runs the hash check above rejects
// source changes until the corresponding curated record is reviewed and updated.
for (const doc of curatedDocuments) await fs.writeFile(path.join(home,'data',doc.filename),JSON.stringify(doc.data,null,2)+'\n');

const coverage=[...moduleMap.values()].map(mod=>{
  const files=inventory.filter(f=>f.module===mod.id), records=items.filter(x=>x.module===mod.id), curated=records.filter(x=>x.curated);
  return {module:mod.id,name:mod.name,discoveredFiles:files.length,analyzedFiles:files.filter(f=>f.analysis==='STRUCTURALLY_ANALYZED').length,verifiedItems:records.filter(x=>x.status==='VERIFIED').length,behaviorReviewed:curated.filter(x=>['use-case','rule'].includes(x.kind)).length,analysisStatus:curated.length?'PARTIALLY_ANALYZED (structural + selected behavior)':'PARTIALLY_ANALYZED (structural metadata only)',sourceCoveragePercent:Math.round(files.filter(f=>f.analysis==='STRUCTURALLY_ANALYZED').length/files.length*100),rule:'Structurally analyzed files / discovered in-scope files. Not statement, branch, runtime or complete behavioral coverage.'};
});
const git = args => execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const meta={title:'WorkLingo System Atlas',schemaVersion:1,commit:git(['rev-parse','HEAD']),branch:git(['branch','--show-current']),dirty:Boolean(git(['status','--porcelain'])),generatedAt:new Date().toISOString(),timezone:'Asia/Saigon',scope:'apps, packages, scripts, infra, existing docs, optional .github and selected root configuration; actual working-tree snapshot with per-file hashes',excluded:['dependencies and generated/build outputs','.env and all environment files','data runtime directories','docs/content-drafts','.agents and .superpowers','mandate governance records (not implementation evidence)','existing binary media and log files'],limitations:['VERIFIED means the specific source declaration or reviewed rule has evidence; it does not mean runtime-tested or deployed.','Structural file coverage is not behavioral or code-test coverage.','Curated behavior covers selected flows; every module remains PARTIALLY_ANALYZED.','No production test suite or database mutation was executed.'],counts:Object.fromEntries([...new Set(items.map(x=>x.kind))].map(k=>[k,items.filter(x=>x.kind===k).length]))};
await fs.mkdir(path.join(home,'data'),{recursive:true});
await fs.mkdir(path.join(home,'reports'),{recursive:true});
await fs.writeFile(path.join(home,'data/system.json'),JSON.stringify({meta,inventory,items,coverage},null,2)+'\n');
for (const [filename,kind] of [['modules','module'],['requirements','requirement'],['use-cases','use-case'],['business-rules','rule'],['entities','entity'],['apis','api'],['architecture','diagram'],['security','security'],['tests','test'],['findings','finding']]) await fs.writeFile(path.join(home,`data/${filename}.json`),JSON.stringify(items.filter(x=>x.kind===kind),null,2)+'\n');
await fs.writeFile(path.join(home,'data/inventory.json'),JSON.stringify({meta,inventory,coverage},null,2)+'\n');
await fs.writeFile(path.join(home,'data/traceability.json'),JSON.stringify(items.map(x=>({id:x.id,kind:x.kind,relatedIds:x.relatedIds,evidence:x.evidence})),null,2)+'\n');
await fs.writeFile(path.join(home,'reports/coverage.md'),'# Structural and behavioral coverage\n\n'+meta.limitations.map(s=>`- ${s}`).join('\n')+'\n\n|Module|Discovered files|Structurally analyzed|Verified records|Reviewed use cases/rules|Status|\n|---|---:|---:|---:|---:|---|\n'+coverage.map(c=>`|${c.name}|${c.discoveredFiles}|${c.analyzedFiles}|${c.verifiedItems}|${c.behaviorReviewed}|${c.analysisStatus}|`).join('\n')+'\n\nDenominator: discovered files within the explicit allowlist; dependency, runtime data, generated artifacts and excluded file classes are outside it. Configuration files not parsed remain inventoried. No claim of 100% system coverage.\n');
await fs.writeFile(path.join(home,'reports/gaps.md'),'# Gaps, conflicts and unknowns\n\n'+items.filter(x=>x.kind==='finding').map(x=>`## ${x.id}: ${x.name} (${x.status})\n\n${x.description}\n\nEvidence: ${x.evidence.map(e=>`${e.file}:${e.lineStart}-${e.lineEnd} (${e.symbol})`).join('; ')||'Analysis boundary; no runtime evidence.'}`).join('\n\n')+'\n');
const testRecords=items.filter(x=>x.kind==='test');
const unmappedRules=items.filter(x=>x.kind==='rule' && !x.relatedIds.some(id=>id.startsWith('TEST-')));
await fs.writeFile(path.join(home,'reports/quality.md'),'# Testing and quality boundaries\n\n'+
  `- Existing test files: ${testRecords.length}.\n- Literal AST-extracted test declarations: ${testRecords.reduce((n,x)=>n+x.cases.length,0)}. Dynamic/parameterized expansion is not counted.\n- Application tests executed by this documentation task: 0 (NOT_RUN).\n- Statement/branch/runtime coverage: UNKNOWN.\n- Documentation package tests and browser checks are reported separately in verification.json and ui-smoke.json.\n\n`+
  '## Rules without a direct test-file mapping\n\nThese rules may have tests elsewhere. Absence of a mapping is not proof of missing tests. Tests associated with a use case are candidates for semantic review, not automatic evidence that each rule is covered.\n\n'+
  (unmappedRules.map(x=>`- ${x.id}: ${x.name}`).join('\n')||'None.')+'\n\n## Requirements and direct mapped tests\n\n|Requirement|Direct test-file links|Reviewed use cases|\n|---|---:|---|\n'+
  items.filter(x=>x.kind==='requirement').map(x=>`|${x.id}|${x.relatedIds.filter(id=>id.startsWith('TEST-')).length}|${useCases.filter(uc=>uc.relatedIds.includes(x.id)).map(uc=>uc.id).join(', ')||'No use-case mapping'}|`).join('\n')+'\n\n## Modules without a reviewed use case or rule assigned directly\n\n'+coverage.filter(c=>c.behaviorReviewed===0).map(c=>`- ${c.name}: structural metadata only, or referenced as a dependency by another module’s reviewed flow.`).join('\n')+'\n\nPotential architectural risks and unverified edge cases remain in gaps.md, with evidence confidence. Test presence does not certify assertions or successful execution.\n');
await fs.writeFile(path.join(home,'reports/analysis-summary.md'),`# Analysis summary\n\nCommit: ${meta.commit}\n\nWorking tree: ${meta.dirty?'dirty (per-file hashes capture analyzed snapshot)':'clean'}\n\nGenerated: ${meta.generatedAt}\n\n${Object.entries(meta.counts).map(([k,n])=>`- ${k}: ${n}`).join('\n')}\n\n${meta.scope}\n\nExclusions:\n${meta.excluded.map(x=>`- ${x}`).join('\n')}\n\nSee coverage.md for every module and gaps.md for uncertainty.\n`);
console.log(JSON.stringify({files:inventory.length,counts:meta.counts,bytes:(await fs.stat(path.join(home,'data/system.json'))).size},null,2));
