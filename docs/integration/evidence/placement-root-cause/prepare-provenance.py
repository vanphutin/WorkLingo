"""Capture research-source variants and exact qualification inputs without edits."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
assert not (HERE / 'qualification-input.json').exists(), 'Qualification input already captured; use verify.py for read-only checks'
def sha(data):
    return hashlib.sha256(data).hexdigest()

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, encoding='utf8').strip()

def archive_variant(name, source, expected):
    variants = [source.encode(), source.replace('\n', '\r\n').encode()]
    matching = [data for data in variants if sha(data) == expected]
    assert matching, f'No byte-identical reconstruction: {name}'
    (HERE / 'reproductions' / name).write_bytes(matching[0])

old = json.loads((HERE / 'matrix/result.json').read_text(encoding='utf8'))
fixed = json.loads((HERE / 'matrix-fixed/result.json').read_text(encoding='utf8'))
red = (HERE / 'reproductions/clock-red-source.ts.txt').read_text(encoding='utf8')
# Reconstruct the exact earlier diagnostic variant, verifying bytes against the
# manifest captured by that run; never write it over the active source.
source = red[:red.index('  const runPlacementJob')] + red[red.index('  beforeAll'):]
start = source.index("  it('uses persisted database eligibility")
end = source.index('  it.each(', start)
source = source[:start] + source[end:]
source = source.replace('JOB_RUNNER_OPTIONS, JobHandlerRegistry, JobRunnerService', 'JobRunnerService')
source = source.replace("    await agent.post(`/api/v1/learning-sessions/${session.body.id}/start`).expect(200);\n", "    await agent.post(`/api/v1/learning-sessions/${session.body.id}/start`).expect(200);\n    const runner = context.app.get(JobRunnerService);\n", 1)
source = source.replace("await runPlacementJob('TRANSCRIBE_SPEECH')", 'await expect(runner.runOnce()).resolves.toBe(true)')
source = source.replace("await runPlacementJob('EVALUATE_ATTEMPT')", 'await expect(runner.runOnce()).resolves.toBe(true)')
path = 'apps/api/test/integration/placement-isolation.integration.spec.ts'
archive_variant('matrix-before-placement.ts.txt', source, old['sourceSHA256'][path])
worker = (ROOT / 'apps/api/test/integration/jobs-worker.integration.spec.ts').read_text(encoding='utf8')
worker = worker.replace('      release();\n      await transaction;\n', '      release();\n', 1)
archive_variant('matrix-before-jobs-worker.ts.txt', worker, old['sourceSHA256']['apps/api/test/integration/jobs-worker.integration.spec.ts'])
launcher = subprocess.check_output(['git', 'show', '4577379:docs/integration/evidence/placement-root-cause/run-matrix.cjs'], cwd=ROOT).decode()
archive_variant('matrix-fixed-launcher.cjs.txt', launcher, fixed['launcherSHA256'])
launcher = launcher.replace("const directory = process.argv[2] || 'matrix';\nassert.match(directory, /^matrix(?:-[a-z]+)?$/u, 'Evidence directory must be a local matrix namespace');\nconst evidence = path.join(__dirname, directory);", "const evidence = path.join(__dirname, 'matrix');")
start = launcher.index('    // Bound the observed DB clock')
end = launcher.index('    const execute =', start)
launcher = launcher[:start] + launcher[end:]
archive_variant('matrix-before-launcher.cjs.txt', launcher, old['launcherSHA256'])

tracked = git('ls-files', '--', 'apps', 'packages').splitlines()
current = {p: sha((ROOT / p).read_bytes()) for p in tracked}
assert current == fixed['sourceSHA256'], 'Final matrix source drift'
assert not git('diff', 'HEAD', '--name-only', '--', 'apps', 'packages')
previous = json.loads((HERE.parent / 'gate-recovery/source.json').read_text(encoding='utf8'))
changed = [p for p in current if current[p] != previous['productSHA256'].get(p)]
assert set(changed) == {'apps/api/test/integration/placement-isolation.integration.spec.ts', 'apps/api/test/integration/jobs-worker.integration.spec.ts'}
record = {'timestamp': datetime.now(timezone.utc).isoformat(), 'sourceCommit': git('rev-parse', 'HEAD'),
          'productSHA256': current, 'changedFromEf27185': changed,
          'runtimeFrontendAndContractsByteIdentical': True,
          'researchAt010f31dUsedUncommittedTestVariants': True,
          'historicalFullGateSource': previous['sourceCommit']}
(HERE / 'qualification-input.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf8')
print(json.dumps({'result': 'PASS', 'sourceCommit': record['sourceCommit'], 'changedTestPaths': changed,
                  'researchSourcesRecoveredAndHashVerified': True, 'runtimeFrontendAndContractsByteIdentical': True}))
