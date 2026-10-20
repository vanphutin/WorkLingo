"""Read-only candidate/source checks; writes only the integration evidence report."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[3]


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True, encoding='utf8').strip()


def ancestor(ref):
    return subprocess.run(['git', 'merge-base', '--is-ancestor', ref, 'HEAD'], cwd=ROOT).returncode == 0


inventory = json.loads((ROOT / 'docs/integration/evidence/inventory.json').read_text(encoding='utf8'))
assert git('branch', '--show-current') == 'integration/worklingo-release-candidate'
assert Path(git('rev-parse', '--show-toplevel')).resolve() == ROOT
assert git('rev-parse', 'main') == inventory['main']
assert git('rev-parse', 'codex/worklingo-liquid-glass-redesign') == inventory['liquidGlass']
for captured in inventory['localRefs']:
    ref, sha = captured.split()
    if ref == 'refs/heads/integration/worklingo-release-candidate':
        continue
    assert git('rev-parse', ref) == sha, 'Captured ref changed: ' + ref
included, deferred = [], []
for source in inventory['branches']:
    if source['decision'] == 'already main':
        assert ancestor(source['sha'])
        continue
    selected = source['decision'].startswith('INCLUDE')
    assert ancestor(source['sha']) == selected, source['branch']
    (included if selected else deferred).extend(commit['sha'] for commit in source['commits'])
assert len(set(included)) == 85
assert len(set(deferred)) == 5
assert not git('ls-files', '-u')
subprocess.run(['git', 'diff', '--check'], cwd=ROOT, check=True)
subprocess.run(['git', 'diff', '--cached', '--check'], cwd=ROOT, check=True)
subprocess.run(['git', 'diff', '168b377', '--check', '--', 'docs/integration'], cwd=ROOT, check=True)
historical = ['docs/ui-redesign/evidence/phase5', 'docs/ui-redesign/evidence/phase6']
assert not git('diff', inventory['liquidGlass'], '--name-only', '--', *historical)
dirty = json.loads((ROOT / 'docs/integration/evidence/dirty-reconciliation.json').read_text(encoding='utf8'))
assert dirty['allAccountedFor'] and len(dirty['rows']) == 52
assert len({row['path'] for row in dirty['rows']}) == 52
assert all(row['backupSHA256'] and row['resolution'] for row in dirty['rows'])
tracked = git('ls-files').splitlines()
assert not [p for p in tracked if Path(p).name.startswith('.env') and not p.endswith('.env.example')]
assert not [p for p in tracked if 'Integration-Backup' in p or p.endswith('manifest.private.json')]
product = [p for p in tracked if p.startswith(('apps/', 'packages/'))]
hashes = {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in product if (ROOT / p).is_file()}
pages = sorted(p for p in tracked if p.startswith('apps/web/src/app/') and p.endswith('/page.tsx'))
lg_pages = [p for p in git('ls-tree', '-r', '--name-only', inventory['liquidGlass'], '--', 'apps/web/src/app').splitlines() if p.endswith('/page.tsx')]
assert set(lg_pages).issubset(pages)
report = {
    'timestamp': datetime.now(timezone.utc).isoformat(), 'command': 'python docs/integration/evidence/verify_candidate.py',
    'result': 'PASS', 'candidateCommit': git('rev-parse', 'HEAD'), 'main': inventory['main'],
    'approvedCommitsRetained': len(set(included)), 'deferredCommitsExcluded': len(set(deferred)),
    'dirtyPathsAccountedFor': 52, 'historicalPhase5Phase6ArtifactsUnchanged': True,
    'routePages': len(pages), 'liquidGlassRoutePagesRetained': len(lg_pages), 'routes': pages,
    'productSHA256': hashes,
    'limitations': 'Integrity/scope checks only. Does not certify runtime behavior or exhaustively detect secrets. Preservation is a separate full verifier. Product hashes are working-file bytes; Git line-ending conversion can differ from committed blobs.',
}
destination = ROOT / 'docs/integration/evidence/candidate-source.json'
if '--check' in sys.argv:
    saved = json.loads(destination.read_text(encoding='utf8'))
    assert saved['productSHA256'] == hashes, 'Product bytes changed after source seal'
    subprocess.run(['git', 'diff', '--exit-code', saved['candidateCommit'], 'HEAD', '--', 'apps', 'packages'], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    seal = json.loads((ROOT / 'docs/integration/evidence/qa-artifacts.json').read_text(encoding='utf8'))
    for name, artifact in seal['artifacts'].items():
        path = ROOT / 'docs/integration/evidence' / name
        assert hashlib.sha256(path.read_bytes()).hexdigest() == artifact['sha256'], name
        assert path.relative_to(ROOT).as_posix() in tracked, 'Untracked evidence: ' + name
    assert not git('status', '--porcelain=v1', '-uall'), 'Candidate is not clean'
    print(json.dumps({'result': 'PASS', 'candidateHEAD': git('rev-parse', 'HEAD'), 'sealedSource': saved['candidateCommit'], 'trackedArtifactsVerified': len(seal['artifacts']), 'clean': True}))
else:
    destination.write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
    print(json.dumps({key: value for key, value in report.items() if key not in ['routes', 'productSHA256']}))
