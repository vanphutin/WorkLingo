"""Compare private initial snapshot. Output metadata/counts only; never source/secret content."""
import pathlib,subprocess,os,hashlib,json,datetime,stat
root=pathlib.Path(__file__).resolve().parents[3];origin=pathlib.Path('D:/Projects/WorkLingo');lg=pathlib.Path('D:/Projects/WorkLingo-Liquid-Glass');backup=pathlib.Path('D:/Projects/WorkLingo-Integration-Backup')
os.environ['GIT_OPTIONAL_LOCKS']='0'
snapshot=json.loads((backup/'manifest.private.json').read_text(encoding='utf8'))
def git(cwd,*args):return subprocess.check_output(['git',*args],cwd=cwd)
def sha(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for part in iter(lambda:f.read(1024*1024),b''):h.update(part)
    return h.hexdigest()
for field,args in [('branch',['branch','--show-current']),('head',['rev-parse','HEAD']),('main',['rev-parse','main'])]:assert git(origin,*args).decode().strip()==snapshot[field],field
assert git(origin,'status','--porcelain=v1','-z','-uall').decode()==snapshot['statusPorcelainZ'],'Original status changed'
assert hashlib.sha256(git(origin,'diff','--cached','--binary','--full-index')).hexdigest()==snapshot['stagedDiffSHA256']
assert hashlib.sha256(git(origin,'diff','--binary','--full-index')).hexdigest()==snapshot['unstagedDiffSHA256']
index=pathlib.Path(git(origin,'rev-parse','--path-format=absolute','--git-path','index').decode().strip())
assert sha(index)==snapshot['indexSHA256'],'Original index changed'
for row in snapshot['protectedFiles']+snapshot['backupFiles']:
    p=origin/row['path']
    if row.get('missing'):assert not p.exists();continue
    if 'symlink' in row:assert os.readlink(p)==row['symlink'];continue
    assert sha(p)==row['sha256'],'Original changed: '+row['path']
    assert stat.S_IMODE(p.stat().st_mode)==row['mode'],'Original mode changed'
for row in snapshot['backupFiles']:
    if row.get('missing'):continue
    p=backup/'files'/row['path']
    if 'symlink' in row:assert os.readlink(p)==row['symlink']
    else:assert sha(p)==row['sha256'],'Backup changed: '+row['path']
assert git(lg,'rev-parse','HEAD').decode().strip()==snapshot['lg']['head']
assert git(lg,'status','--porcelain=v1','-uall').decode()==snapshot['lg']['status']
report={'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':'python docs/integration/evidence/preservation.py','result':'PASS','originalHEAD':snapshot['head'],'originalProtectedFiles':len(snapshot['protectedFiles']),'dirtyFiles':len(snapshot['dirty']),'backupFiles':len(snapshot['backupFiles']),'originalIndexStatusAndFingerprintsUnchanged':True,'allSelectedIgnoredBytesAndBackupHashesVerified':True,'liquidGlassHEADStatusUnchanged':True,'mainUnchanged':True,'limitations':'Private backup remains outside Git; other worktree dirty source is inventoried but not transplanted.'}
(root/'docs/integration/evidence/preservation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report))
