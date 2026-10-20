"""Preserve raw new logs in ignored scratch, archive whitespace-normalized copies."""
from pathlib import Path
import hashlib
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SCRATCH = ROOT / '.superpowers/sdd/placement-investigation-plan'
assert (HERE / 'live/backend-final.json').exists(), 'Wait for the full run to close'
assert (HERE / 'matrix-reviewed/result.json').exists(), 'Wait for reviewed launcher to close'
logs = HERE / 'checks'
logs.mkdir(exist_ok=True)
for name in ['typecheck-final.log', 'lint-final.log', 'launcher-red.log', 'launcher-green.log',
             'launcher-green-final.log', 'preservation-preflight.log', 'preservation-final.log']:
    destination = logs / name
    assert not destination.exists(), f'Refuse replacing archived check: {name}'
    destination.write_bytes((SCRATCH / name).read_bytes())
records = []
for path in sorted(HERE.rglob('*.log')):
    relative = path.relative_to(HERE)
    raw = path.read_bytes()
    destination = SCRATCH / 'raw-logs' / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    assert not destination.exists(), f'Refuse replacing raw log: {relative}'
    destination.write_bytes(raw)
    encoding = 'utf-16' if raw.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig'
    text = raw.decode(encoding)
    normalized = ('\n'.join(line.rstrip() for line in text.splitlines()).rstrip() + '\n').encode()
    path.write_bytes(normalized)
    records.append({'path': relative.as_posix(), 'rawSHA256': hashlib.sha256(raw).hexdigest(),
                    'archiveSHA256': hashlib.sha256(normalized).hexdigest(), 'rawBytes': len(raw),
                    'rawRetainedAt': destination.relative_to(ROOT).as_posix(),
                    'normalization': 'Line endings, trailing whitespace and trailing empty lines only; no test content removed.'})
(HERE / 'log-provenance.json').write_text(json.dumps(records, indent=2) + '\n', encoding='utf8')
print(json.dumps({'result': 'PASS', 'archivedLogs': len(records), 'rawLogsRetained': True}))
