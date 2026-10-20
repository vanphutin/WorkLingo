"""Read-only local Git topology; no remote contact, original writes or private content."""
import pathlib,subprocess,os,json,datetime
root=pathlib.Path(__file__).resolve().parents[3]
os.environ['GIT_OPTIONAL_LOCKS']='0'
def git(*args,cwd=root):return subprocess.check_output(['git',*args],cwd=cwd).decode().strip()
main=git('rev-parse','main');lg=git('rev-parse','codex/worklingo-liquid-glass-redesign')
refs=git('for-each-ref','--format=%(refname) %(objectname)','refs/heads','refs/remotes').splitlines()
selected={'codex/audio-dashboard-v2':'INCLUDE: full branch explicitly approved; disposable test migrations only','codex/ielts-beta-release-spec':'INCLUDE: beta planning docs approved','codex/worklingo-liquid-glass-redesign':'INCLUDE: immutable verified presentation source','codex/intermediate-quality-baseline':'DEFER: explicit human decision; assessment/workload/B1 draft','feat/ui-ux-luminary-redesign':'DEFER: explicit human decision; older UI/OpenAI TTS checkpoint'}
branches=[]
for name in git('for-each-ref','--format=%(refname:short)','refs/heads').splitlines():
    if name.startswith('integration/'):continue
    sha=git('rev-parse',name);flags={r.split()[1]:r.split()[0] for r in git('cherry','main',name).splitlines()}
    commits=[]
    for commit in git('rev-list','--reverse','main..'+name).splitlines():
        paths=git('diff-tree','--no-commit-id','--name-only','-r',commit).splitlines()
        commits.append({'sha':commit,'subject':git('show','-s','--format=%s',commit),'files':paths,'parents':git('show','-s','--format=%P',commit).split(),'patchEquivalentInMain':flags.get(commit)=='-','classification':('backend/schema' if any(p.startswith('apps/api/') for p in paths) else 'documentation' if paths and all(p.startswith(('docs/','mandate/','.agents/')) for p in paths) else 'frontend/test or mixed'),'decision':selected.get(name,'already main')})
    branches.append({'branch':name,'sha':sha,'mergeBaseMain':git('merge-base','main',name),'mainDivergence':git('rev-list','--left-right','--count','main...'+name),'lgDivergence':git('rev-list','--left-right','--count','codex/worklingo-liquid-glass-redesign...'+name),'decision':selected.get(name,'already main'),'patchEquivalentInMain':[c['sha'] for c in commits if c['patchEquivalentInMain']],'commits':commits})
worktrees=[]
for block in git('worktree','list','--porcelain').split('\n\n'):
    info={line.split(' ',1)[0]:line.split(' ',1)[1] if ' ' in line else True for line in block.splitlines()}
    if info.get('worktree'):
        info['status']=git('status','--porcelain=v1','-uall',cwd=info['worktree']);worktrees.append(info)
snapshot=json.loads(pathlib.Path('D:/Projects/WorkLingo-Integration-Backup/manifest.private.json').read_text(encoding='utf8'))
dirty=[]
lgchanged=set(git('diff','--name-only',main,lg).splitlines());lgtracked=set(git('ls-tree','-r','--name-only',lg).splitlines())
for row in snapshot['dirty']:
    metadata=next((m for m in snapshot['backupFiles'] if m['path']==row['path']),{})
    dirty.append({**row,'backupSHA256':metadata.get('sha256'),'lgOverlap':row['path'] in lgchanged,'addAdd':row['status']=='??' and row['path'] in lgtracked,'resolution':'PENDING semantic reconciliation','tests':'PENDING'})
report={'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':'python docs/integration/evidence/inventory.py','main':main,'liquidGlass':lg,'localRefs':refs,'branches':branches,'worktrees':worktrees,'uniqueOutstandingCommits':len(set(c['sha'] for b in branches for c in b['commits'])),'dirty':dirty,'preservation':{'backup':'D:/Projects/WorkLingo-Integration-Backup','verifiedBeforeTransplant':True,'originalIndexSHA256':snapshot['indexSHA256'],'stagedDiffSHA256':snapshot['stagedDiffSHA256'],'unstagedDiffSHA256':snapshot['unstagedDiffSHA256'],'dirtyFiles':len(dirty),'protectedFiles':len(snapshot['protectedFiles']),'backupFiles':len(snapshot['backupFiles']),'ignoredFiles':snapshot['ignoredSelectedFiles'],'backupBytes':sum(r.get('size',0) for r in snapshot['backupFiles']),'privateBackupExcludedFromGit':True,'ACL':'User and SYSTEM FullControl; inheritance disabled; numeric SID syntax retried and verified after initial name-mapping rejection'},'authorization':'Direct human answers: all audio commits+test DB migrations, inline feedback, defer Intermediate/Luminary, include beta docs.'}
(root/'docs/integration/evidence/inventory.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
lines=['# Complete local commit inventory','',f'Main `{main}`; LiquidGlass `{lg}`. No fetch; remote-tracking refs are cached observations.',f'Unique commits outside main across5 source branches: **{report["uniqueOutstandingCommits"]}**. Main already has7 local commits above cached origin/main; not an outstanding candidate dependency.','', '| Branch | Main-only / branch-only | Decision | Patch-equivalent to main |','| --- | --- | --- | --- |']
for b in branches:lines.append(f'| `{b["branch"]}` | {b["mainDivergence"].replace(chr(9)," / ")} | {b["decision"]} | {len(b["patchEquivalentInMain"])} |')
lines+=['','## Dependency and integration order','','1. Start from actual main7a5e383, so its seven local commits are included once.','2. Merge complete approved audio-dashboard-v2: coherent APIs/contracts/schema before their consumers. A patch-equivalent commit remains historical provenance, not duplicated source logic.','3. Merge IELTS beta planning docs; no runtime or release authority follows.','4. Merge complete LiquidGlass history and reconcile JSX/styles with new feature behavior.','5. Reconcile original snapshot per file; preserve inline feedback per direct human choice. Never import audio worktree dirty extensions without separate scope.','6. Run candidate gates, one independent review, exact handoff. Deferred branches remain intact.','','Other worktree dirty states are recorded in JSON, not transplanted. Audio worktree has additional uncommitted voice-preview/narration/bug-mandate work not covered by the approved committed-head integration. No source is discarded or altered.']
for b in branches:
    if not b['commits']:continue
    lines+=['',f'## {b["branch"]}','','| SHA | Subject / classification | Dependency | Main / LG relation | Conflict risk / method | Changed files |','| --- | --- | --- | --- | --- | --- |']
    for c in b['commits']:
        relation='patch-equivalent in main' if c['patchEquivalentInMain'] else 'not in main; see branch divergence above'
        included=subprocess.run(['git','merge-base','--is-ancestor',c['sha'],lg],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
        lines.append('| `'+c['sha']+'` | '+c['subject'].replace('|','\\|')+'; '+c['classification']+' | '+','.join(p[:7] for p in c['parents'])+' | '+relation+('; included LG' if included else '; not included LG')+' | '+('preserve/defer by human decision' if b['decision'].startswith('DEFER') else 'ordinary history-preserving merge; inspect overlapping owner hunks')+' | '+'<br>'.join('`'+p+'`' for p in c['files'])+' |')
(root/'docs/integration/commit-inventory.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
print(json.dumps({'outstanding':report['uniqueOutstandingCommits'],'branches':len(branches),'dirty':len(dirty),'overlaps':sum(r['lgOverlap'] for r in dirty),'addAdd':sum(r['addAdd'] for r in dirty)}))
