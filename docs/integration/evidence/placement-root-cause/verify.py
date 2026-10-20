"""Read-only preservation/provenance checks; separate seal from old recovery."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import runpy
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
os.environ['GIT_OPTIONAL_LOCKS'] = '0'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, encoding='utf8').strip()

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

assert ROOT == Path('D:/Projects/WorkLingo-Integration')
assert git('branch', '--show-current') == 'integration/worklingo-release-candidate'
assert not git('ls-files', '-u')
subprocess.run(['git', 'diff', '010f31d', '--check'], cwd=ROOT, check=True)
subprocess.run(['git', 'diff', '--cached', '--check'], cwd=ROOT, check=True)
changed = set(git('diff', '010f31d', '--name-only', '--', 'apps', 'packages').splitlines())
assert changed == {'apps/api/test/integration/placement-isolation.integration.spec.ts',
                   'apps/api/test/integration/jobs-worker.integration.spec.ts'}, changed
assert not git('diff', '010f31d', '--name-only', '--', 'apps/api/src', 'apps/web/src', 'packages')

# The old verifier's preservation-only path does not rewrite its sealed files.
# Its historical runtime/scope checks remain valid for these two test paths.
previous_arguments = sys.argv[:]
try:
    sys.argv = [str(HERE.parent / 'gate-recovery/verify.py'), '--preserve-check']
    runpy.run_path(sys.argv[0], run_name='__main__')
finally:
    sys.argv = previous_arguments
for folder, manifest in [('gate-recovery', 'artifacts.json')]:
    sealed = json.loads((HERE.parent / folder / manifest).read_text(encoding='utf8'))
    for relative, row in sealed['artifacts'].items():
        assert sha(HERE.parent / folder / relative) == row['sha256'], relative

tracked = git('ls-files').splitlines()
product = {p: sha(ROOT / p) for p in tracked if p.startswith(('apps/', 'packages/'))}
old = json.loads((HERE.parent / 'gate-recovery/source.json').read_text(encoding='utf8'))
runtime_changes = [p for p, digest in product.items() if p.startswith(('apps/api/src/', 'apps/web/', 'packages/'))
                   and old['productSHA256'].get(p) != digest]
assert not runtime_changes, runtime_changes
fixed = json.loads((HERE / 'matrix-fixed/result.json').read_text(encoding='utf8'))
assert fixed['result'] == 'PASS' and fixed['cleanup']
assert fixed['sourceSHA256'] == product, 'Matrix source bytes changed'
assert all(row['exitCode'] == 0 for cell in fixed['cells'] for row in cell['children'])
reviewed = json.loads((HERE / 'matrix-reviewed/result.json').read_text(encoding='utf8'))
assert reviewed['result'] == 'PASS' and reviewed['cleanup']
assert reviewed['sourceSHA256'] == product
assert reviewed['launcherSHA256'] == sha(HERE / 'run-matrix.cjs')
assert all(row['closed'] and not row['timedOut'] and row['exitCode'] == 0 for cell in reviewed['cells'] for row in cell['children'])
if '--preflight' in sys.argv:
    print(json.dumps({'result': 'PASS', 'mainOriginalLiquidGlassBackupPreserved': True,
                      'old582And481ArtifactSealsPreserved': True, 'runtimeFrontendAndContractsUnchanged': True,
                      'placementMatrixSourceMatches': True, 'fullBackendStillRequiresSeparateGate': True}))
    sys.exit(0)
backend = json.loads((HERE / 'live/backend-final.json').read_text(encoding='utf8'))
assert backend['sourceCommit'] == git('log', '-1', '--format=%H', '--', 'apps', 'packages')
assert backend['cleanup'], 'Owned full-suite database was not cleaned'
assert backend['result'] == 'PASS' and backend['exitCode'] == 0, 'Full suite must pass'
assert backend['testArguments'] == [], 'Must be the complete backend suite'
assert backend['harnessSHA256'] == sha(ROOT / 'apps/web/e2e/fixtures/run-phase6-live.cjs')
qualification = json.loads((HERE / 'qualification-input.json').read_text(encoding='utf8'))
assert qualification['sourceCommit'] == backend['sourceCommit']
assert qualification['productSHA256'] == product, 'Final backend inputs drifted'
assert '1179 passed | 1 skipped (1180)' in (HERE / 'live/backend-final.log').read_text(encoding='utf8')

if '--seal' in sys.argv:
    assert not (HERE / 'artifacts.json').exists(), 'Refuse replacing a sealed evidence namespace'
    assert not git('diff', 'HEAD', '--name-only', '--', 'apps', 'packages')
    source = {'testedSourceCommit': backend['sourceCommit'], 'archiveParent': git('rev-parse', 'HEAD'),
              'timestamp': datetime.now(timezone.utc).isoformat(), 'productSHA256': product,
              'runtimeAndFrontendUnchangedFromEf27185': True, 'fullBackendResult': backend['result'],
              'hashBasis': 'Working-file SHA256, distinct from Git LF/CRLF blob encoding.'}
    (HERE / 'source.json').write_text(json.dumps(source, indent=2) + '\n', encoding='utf8')
    files = [p for p in HERE.rglob('*') if p.is_file() and p.name != 'artifacts.json']
    assert not any(p.suffix in {'.zip', '.env'} for p in files)
    artifacts = {p.relative_to(HERE).as_posix(): {'sha256': sha(p), 'bytes': p.stat().st_size} for p in sorted(files)}
    (HERE / 'artifacts.json').write_text(json.dumps({'artifacts': artifacts}, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'result': 'SEALED', 'testedSourceCommit': source['testedSourceCommit'], 'artifacts': len(artifacts)}))

if '--check' in sys.argv:
    source = json.loads((HERE / 'source.json').read_text(encoding='utf8'))
    assert source['productSHA256'] == product
    for relative, row in json.loads((HERE / 'artifacts.json').read_text(encoding='utf8'))['artifacts'].items():
        assert sha(HERE / relative) == row['sha256'], relative
        assert (HERE / relative).relative_to(ROOT).as_posix() in tracked, relative
    assert not git('status', '--porcelain=v1', '-uall'), 'Candidate not clean'
    print(json.dumps({'result': 'PASS', 'candidateHEAD': git('rev-parse', 'HEAD'),
                      'testedSourceCommit': source['testedSourceCommit'], 'runtimeAndFrontendUnchanged': True,
                      'old582And481ArtifactSealsPreserved': True, 'clean': True}))
