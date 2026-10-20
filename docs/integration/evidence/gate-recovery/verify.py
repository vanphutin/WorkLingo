"""Recovery-only seal; historical source/artifact manifests remain immutable."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import runpy
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
os.environ['GIT_OPTIONAL_LOCKS'] = '0'


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True, encoding='utf8').strip()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


assert ROOT == Path('D:/Projects/WorkLingo-Integration')
assert git('branch', '--show-current') == 'integration/worklingo-release-candidate'
inventory = json.loads((HERE.parent / 'inventory.json').read_text(encoding='utf8'))
for captured in inventory['localRefs']:
    ref, expected = captured.split()
    if ref != 'refs/heads/integration/worklingo-release-candidate':
        assert git('rev-parse', ref) == expected, ref
assert not git('ls-files', '-u')
subprocess.run(['git', 'diff', '67df2af', '--check'], cwd=ROOT, check=True)
subprocess.run(['git', 'diff', '--cached', '--check'], cwd=ROOT, check=True)
historical = json.loads((HERE.parent / 'qa-artifacts.json').read_text(encoding='utf8'))
for relative, row in historical['artifacts'].items():
    assert sha(HERE.parent / relative) == row['sha256'], relative
assert not git('diff', inventory['liquidGlass'], '--name-only', '--',
               'docs/ui-redesign/evidence/phase5', 'docs/ui-redesign/evidence/phase6')
allowed_product_paths = {
    'apps/api/test/integration/backup-restore.integration.spec.ts',
    'apps/api/test/integration/placement-isolation.integration.spec.ts',
    'apps/api/test/integration/job-claim-diagnostics.ts',
    'apps/api/test/integration/jobs-worker.integration.spec.ts',
    'apps/web/e2e/curriculum-foundation.spec.ts',
    'apps/web/e2e/ielts-full-mock.spec.ts',
    'apps/web/playwright.phase6-live.config.ts',
}
changed = set(git('diff', '67df2af', '--name-only', '--', 'apps', 'packages').splitlines())
assert changed <= allowed_product_paths, changed - allowed_product_paths
assert not git('diff', '67df2af', '--name-only', '--', 'apps/api/src', 'apps/web/src', 'packages')
tracked = git('ls-files').splitlines()
product = {p: sha(ROOT / p) for p in tracked if p.startswith(('apps/', 'packages/'))}
old_source = json.loads((HERE.parent / 'candidate-source.json').read_text(encoding='utf8'))
runtime = {p: digest for p, digest in product.items()
           if p.startswith(('apps/api/src/', 'apps/web/src/', 'packages/'))}
assert all(old_source['productSHA256'].get(p) == digest for p, digest in runtime.items()), 'Runtime bytes drifted'

if '--preserve' in sys.argv or '--preserve-check' in sys.argv:
    old_destination = HERE.parent / 'preservation.json'
    original_write = Path.write_text

    def redirected(path, text, *args, **kwargs):
        assert path == old_destination, path
        if '--preserve-check' in sys.argv:
            return len(text)
        return original_write(HERE / 'preservation-final.json', text, *args, **kwargs)

    Path.write_text = redirected
    try:
        runpy.run_path(str(HERE.parent / 'preservation.py'), run_name='__main__')
    finally:
        Path.write_text = original_write

if '--seal' in sys.argv:
    assert not git('diff', 'HEAD', '--name-only', '--', 'apps', 'packages')
    source = {'timestamp': datetime.now(timezone.utc).isoformat(), 'sourceCommit': git('rev-parse', 'HEAD'),
              'startingCommit': git('rev-parse', '67df2af'), 'productSHA256': product,
              'runtimeUnchangedFromStartingCommit': True,
              'runtimeMatchesHistoricalSeal': True,
              'runtimeTreeSHA256': hashlib.sha256(json.dumps(runtime, sort_keys=True).encode()).hexdigest(),
              'hashBasis': 'SHA256 of current working-file bytes. Git LF/CRLF conversion can differ from committed blobs; raw preservation and this local seal are distinct from a portable checkout test.',
              'changedTestHarnessPaths': sorted(changed)}
    (HERE / 'source.json').write_text(json.dumps(source, indent=2) + '\n', encoding='utf8')
    # Raw Playwright traces may contain synthetic session credentials; keep them
    # in ignored scratch. Only sanitized logs/metadata/selected images are sealed.
    files = [p for p in HERE.rglob('*') if p.is_file() and p.name != 'artifacts.json']
    assert not [p for p in files if p.suffix == '.zip'], 'Do not archive credential-bearing traces'
    artifacts = {p.relative_to(HERE).as_posix(): {'sha256': sha(p), 'bytes': p.stat().st_size}
                 for p in sorted(files)}
    (HERE / 'artifacts.json').write_text(json.dumps({'sourceCommit': source['sourceCommit'],
        'historicalArtifactsVerified': len(historical['artifacts']), 'artifacts': artifacts}, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'result': 'SEALED', 'sourceCommit': source['sourceCommit'], 'artifacts': len(artifacts)}))

if '--check' in sys.argv:
    source = json.loads((HERE / 'source.json').read_text(encoding='utf8'))
    assert source['productSHA256'] == product, 'Recovery product/test bytes changed'
    assert not git('diff', source['sourceCommit'], 'HEAD', '--name-only', '--', 'apps', 'packages')
    sealed = json.loads((HERE / 'artifacts.json').read_text(encoding='utf8'))
    for relative, row in sealed['artifacts'].items():
        path = HERE / relative
        assert sha(path) == row['sha256'], relative
        assert path.relative_to(ROOT).as_posix() in tracked, relative
    assert not git('status', '--porcelain=v1', '-uall'), 'Candidate is not clean'
    print(json.dumps({'result': 'PASS', 'candidateHEAD': git('rev-parse', 'HEAD'),
        'sourceCommit': source['sourceCommit'], 'historicalArtifacts': len(historical['artifacts']),
        'recoveryArtifacts': len(sealed['artifacts']), 'mainAndOtherRefsUnchanged': True, 'clean': True}))
