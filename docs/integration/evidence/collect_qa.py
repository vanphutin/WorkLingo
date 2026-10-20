"""Collect immutable copies of observed run logs and hash evidence, not rerun tests."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[3]
SCRATCH = ROOT / '.superpowers/sdd/plan'
EVIDENCE = ROOT / 'docs/integration/evidence'
LOGS = [
    'main-web-baseline.log', 'candidate-web-final.log', 'candidate-web-qualified.log',
    'candidate-packages.log', 'contracts-final.log', 'full-lint.log', 'lint-qualified.log',
    'candidate-web-types.log', 'candidate-api-types.log', 'types-qualified.log',
    'i18n-qualified.log', 'candidate-build.log', 'candidate-e2e-build.log', 'candidate-build-final.log',
    'mandate-final.log', 'cross-smoke-console.log', 'cross-smoke-fixture-console.log',
    'cross-native-console.log', 'webkit-settled-console.log', 'cross-qualified-console.log', 'cross-final-console.log',
    'owner-console.log', 'owner-adapted-console.log', 'owner-structured-console.log', 'owner-qualified-console.log',
    'topic-repair-red.log', 'topic-repair-api-green.log', 'review-draft-red.log', 'review-draft-green.log',
    'curriculum-reflow-red.log', 'curriculum-focus-red.log', 'candidate-api-tests.log',
    'error-qualified-console.log', 'performance-qualified-console.log', 'api-build-qualified.log',
    'security-qualified.log', 'utility-qualified.log',
    'api-test-lint-qualified.log', 'task-2-tests.log', 'task-3-tests.log',
]
observed = []
normalization = []


def normalized_log(raw):
    # Preserve every message/line; terminal trailing whitespace is not evidence.
    return ('\n'.join(line.rstrip(' \t') for line in raw.decode('utf8', errors='strict').splitlines()).rstrip('\n') + '\n').encode('utf8')


(EVIDENCE / 'logs').mkdir(exist_ok=True)
for name in LOGS:
    source = SCRATCH / name
    if not source.exists():
        continue
    text = source.read_text(encoding='utf8', errors='replace')
    raw = source.read_bytes()
    destination = EVIDENCE / 'logs' / name
    destination.write_bytes(normalized_log(raw))
    normalization.append({'artifact': destination.relative_to(EVIDENCE).as_posix(), 'rawSHA256': hashlib.sha256(raw).hexdigest(), 'rawSource': f'.superpowers/sdd/plan/{name}'})
    summaries = re.findall(r'^.*(?:Test Files |Tests\s+\d|\d+ passed \(|\d+ failed|\d+ did not run|error TS\d+|typecheck: Done|lint: Done|i18n:|valid|Compilation|Compiled successfully|Dynamic\)).*$', text, re.M)
    observed.append({'log': f'logs/{name}', 'tailSummary': summaries[-8:],
                     'note': 'Observed text only; empty/partial logs are not passing gates. See integration-qa.md for source binding, exact commands, aborted attempts and final disposition.'})
raw_live = SCRATCH / 'raw-live-evidence'
raw_live.mkdir(exist_ok=True)
for path in (EVIDENCE / 'live').glob('*.log'):
    original = raw_live / path.name
    if not original.exists():
        original.write_bytes(path.read_bytes())
    raw = original.read_bytes()
    path.write_bytes(normalized_log(raw))
    normalization.append({'artifact': path.relative_to(EVIDENCE).as_posix(), 'rawSHA256': hashlib.sha256(raw).hexdigest(), 'rawSource': f'.superpowers/sdd/plan/raw-live-evidence/{path.name}'})
files = {}
for path in EVIDENCE.rglob('*'):
    if path.is_file() and path.name != 'qa-artifacts.json':
        files[path.relative_to(EVIDENCE).as_posix()] = {'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes': path.stat().st_size}
report = {'collectedAt': datetime.now(timezone.utc).isoformat(),
          'candidateAtCollection': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
          'method': 'Existing observed logs normalized only for line endings/trailing whitespace/final blank lines, with raw originals retained in ignored scratch and SHA256 recorded. No messages or internal whitespace removed; this script does not execute tests or assign PASS.',
          'logNormalization': normalization,
          'runs': observed, 'artifacts': files}
(EVIDENCE / 'qa-artifacts.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
print(json.dumps({'collectedLogs': len(observed), 'artifacts': len(files), 'bytes': sum(item['bytes'] for item in files.values())}))
