import ts from 'typescript';
import { createHash } from 'node:crypto';

export const hash = value => createHash('sha256').update(value).digest('hex');
export const stableId = (prefix, value) => `${prefix}-${hash(value).slice(0, 16)}`;
export const decorators = node => ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
export const decoratorName = decorator => {
  const e = decorator.expression;
  return (ts.isCallExpression(e) ? e.expression : e).getText().split('.').at(-1);
};
export const decoratorArgs = decorator => ts.isCallExpression(decorator.expression) ? [...decorator.expression.arguments] : [];
export const deco = (node, name) => decorators(node).find(d => decoratorName(d) === name);
const literal = node => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;
const texts = decorator => decorator ? decoratorArgs(decorator).map(x => literal(x) ?? x.getText()) : [];
export function evidence(sf, node, symbol) {
  return { file:sf.fileName, symbol, lineStart:sf.getLineAndCharacterOfPosition(node.getStart(sf)).line+1, lineEnd:sf.getLineAndCharacterOfPosition(node.end).line+1, sha256:hash(sf.text) };
}
export function parseSource(source, file) {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}
export function extractRoutes(source, file, prefix = '/api/v1') {
  const sf = parseSource(source, file);
  const routes = [];
  for (const cls of sf.statements.filter(ts.isClassDeclaration)) {
    const controller = deco(cls, 'Controller');
    if (!controller) continue;
    const controllerArgs = decoratorArgs(controller);
    const base = controllerArgs.length ? literal(controllerArgs[0]) : '';
    for (const method of cls.members.filter(ts.isMethodDeclaration)) {
      const routeDecorators = decorators(method).filter(d => ['Get','Post','Put','Patch','Delete','Options','Head','All'].includes(decoratorName(d)));
      for (const routeDecorator of routeDecorators) {
        const args = decoratorArgs(routeDecorator);
        const subpath = args.length ? literal(args[0]) : '';
        const routeKnown = base !== undefined && subpath !== undefined;
        const path = routeKnown ? `/${[prefix,base,subpath].map(s => s.replace(/^\/+|\/+$/g,'')).filter(Boolean).join('/')}` : null;
        const classGuards = texts(deco(cls, 'UseGuards'));
        const methodGuards = texts(deco(method, 'UseGuards'));
        const roleDecorator = deco(method,'Roles') ?? deco(cls,'Roles');
        const publicDecorator = deco(method,'Public') ?? deco(cls,'Public');
        const calls = [];
        const errors = [];
        const scan = n => {
          if (ts.isCallExpression(n)) calls.push(n.expression.getText(sf));
          if (ts.isNewExpression(n) && n.expression.getText(sf).endsWith('Exception')) errors.push(n.expression.getText(sf));
          ts.forEachChild(n, scan);
        };
        if (method.body) scan(method.body);
        const parameters = method.parameters.map(p => ({name:p.name.getText(sf),type:p.type?.getText(sf) ?? 'UNKNOWN',source:decorators(p).map(decoratorName)[0] ?? 'UNKNOWN',decorators:decorators(p).map(d => d.expression.getText(sf))}));
        routes.push({
          id:stableId('API', `${file}:${cls.name?.text}.${method.name.getText(sf)}:${decoratorName(routeDecorator)}`),
          kind:'api', name:`${decoratorName(routeDecorator).toUpperCase()} ${path ?? '[dynamic path]'}`,
          module:`MOD-${file.split('/')[3] ?? 'unknown'}`, status:routeKnown ? 'VERIFIED' : 'UNKNOWN',
          description:'Route declaration verified statically. Response types and Swagger metadata are declarations; runtime serialization and service-level errors require separate analysis.',
          method:decoratorName(routeDecorator).toUpperCase(), path,controller:cls.name?.text, handler:method.name.getText(sf),
          guards:[...new Set([...classGuards,...methodGuards])],roles:texts(roleDecorator),isPublic:Boolean(publicDecorator),
          parameters,declaredResponse:method.type?.getText(sf) ?? 'UNKNOWN (inferred TypeScript return type not evaluated)',
          swagger:decorators(method).filter(d=>decoratorName(d).startsWith('Api')).map(d=>d.expression.getText(sf)),
          httpCode:texts(deco(method,'HttpCode'))[0] ?? 'Nest default; runtime not probed',
          errors:[...new Set(errors)],calls:[...new Set(calls)],
          rateLimit:texts(deco(method,'RateLimit') ?? deco(cls,'RateLimit')),
          evidence:[evidence(sf,method,`${cls.name?.text}.${method.name.getText(sf)}`),evidence(sf,cls,cls.name?.text ?? 'controller')],relatedIds:[],
        });
      }
    }
  }
  return routes;
}

export function validateGraph(items) {
  const errors = [];
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) errors.push(`duplicate ID: ${item.id}`);
    ids.add(item.id);
    if (item.kind && !['module','api','entity','enum','requirement','use-case','rule','test','route','symbol','security','integration','migration','document','finding','actor','diagram'].includes(item.kind)) errors.push(`${item.id}: unsupported kind ${item.kind}`);
    if (!['VERIFIED','INFERRED','DOCUMENTED_ONLY','UNKNOWN','CONFLICT'].includes(item.status)) errors.push(`${item.id}: invalid status`);
    if (item.status === 'VERIFIED' && !item.evidence?.length) errors.push(`${item.id}: VERIFIED without evidence`);
    for (const ref of citations(item)) if (!ref.file || !ref.symbol || !Number.isInteger(ref.lineStart) || ref.lineStart < 1 || !Number.isInteger(ref.lineEnd) || ref.lineEnd < ref.lineStart) errors.push(`${item.id}: invalid evidence range`);
  }
  for (const item of items) for (const target of item.relatedIds ?? []) if (!ids.has(target)) errors.push(`${item.id}: dangling relationship ${target}`);
  return errors;
}

export function fieldKey(entity,field) {
  const primaryFields=Array.isArray(entity.primaryKey)?entity.primaryKey:entity.primaryKey?.fields??[];
  return field.isId||primaryFields.includes(field.name)?' PK':field.isUnique?' UK':'';
}

export function connectTraceability(items,groups) {
  const byId=new Map(items.map(item=>[item.id,item]));
  const edges=[];
  for (const group of groups) {
    const useCase=byId.get(group.useCase);
    if (!useCase || useCase.kind!=='use-case') throw new Error(`Missing use case ${group.useCase}`);
    for (const targetId of [...group.requirements,...group.rules]) {
      const target=byId.get(targetId);
      if (!target) throw new Error(`Missing traceability record ${targetId}`);
      const edge={target:targetId,type:target.kind==='requirement'?'satisfies':'governed-by',status:'INFERRED',basis:'Analyst mapping between reviewed source-backed descriptions; not runtime or test coverage.'};
      useCase.relatedIds??=[];
      if (!useCase.relatedIds.includes(targetId)) useCase.relatedIds.push(targetId);
      useCase.relationships??=[];
      if (!useCase.relationships.some(e=>e.target===targetId)) useCase.relationships.push(edge);
      edges.push({source:useCase.id,...edge});
    }
  }
  return edges;
}

export function citations(value) {
  if (!value || typeof value!=='object') return [];
  if (typeof value.file==='string' && ('lineStart' in value || 'lineEnd' in value)) return [value];
  return Object.values(value).flatMap(citations);
}

export function validateSources(items, sources) {
  const errors=[];
  for (const item of items) for (const ref of citations(item)) {
    if (/(^|\/)(\.env[^/]*|node_modules|dist|build|coverage|data|system-documentation)(\/|$)/.test(ref.file) || ref.file.includes('..') || ref.file.includes('\\') || /^[A-Za-z]:/.test(ref.file)) {
      errors.push(`${item.id}: excluded evidence path ${ref.file}`); continue;
    }
    const text=sources.get(ref.file);
    if (text===undefined) { errors.push(`${item.id}: missing source ${ref.file}`); continue; }
    if (ref.sha256!==hash(text)) errors.push(`${item.id}: stale hash ${ref.file}`);
    if (ref.lineStart < 1 || ref.lineEnd > text.split('\n').length || ref.lineStart > ref.lineEnd) errors.push(`${item.id}: range exceeds source ${ref.file}`);
  }
  return errors;
}
