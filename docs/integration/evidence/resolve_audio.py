"""Reviewed, owner-specific merge hunks. Never a generic ours/theirs resolver."""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[3]
file=root/'apps/web/src/features/audio/admin-audio-settings-panel.tsx'
lines=file.read_text(encoding='utf8').splitlines(keepends=True);out=[];decisions=[];i=0
while i<len(lines):
    if not lines[i].startswith('<<<<<<< '):out.append(lines[i]);i+=1;continue
    start=i;i+=1;left=[];right=[]
    while not lines[i].startswith('======='):left.append(lines[i]);i+=1
    i+=1
    while not lines[i].startswith('>>>>>>> '):right.append(lines[i]);i+=1
    i+=1;incoming=''.join(right);existing=''.join(left)
    rules=[
      ('use-voice-registry','Keep new device registry hook; existing side has no corresponding import.'),
      ('function DevicesIcon','Keep new device registry icon with explicit dimensions; no competing behavior.'),
      ('<AlertTriangleIcon size={16}', 'Retain explicit16px warning/error icon sizing; existing call uses same icon default.'),
      ('<AudioWaveIcon size={18}', 'Retain explicit18px title icon sizing; no API/state difference.'),
      ('<ChevronDownIcon size={16}', 'Retain explicit16px chevron sizing; no API/state difference.'),
      ('serverRotationUnavailable','Preserve new supported-locales/server-rotation explanation plus existing simulation warning.'),
      ('<CheckCircleIcon size={18}', 'Retain explicit18px success icon sizing; preserve surrounding main status content.'),
      ('Device Voice Registry & Rotation','Insert approved device registry/rotation controls before existing security notice; retain security copy.'),
      ('Section 5: Action Footer','Comment numbering reflects added device section; footer state/actions unchanged.'),
      ('<CheckCircleIcon size={14}', 'Retain explicit14px saved indicator; no persistence behavior change.'),
    ]
    matched=next((r for r in rules if r[0] in incoming),None)
    assert matched,(start+1,existing,incoming)
    # These are individually inspected feature additions/dimension/copy hunks only.
    assert len(existing.splitlines())<=10,(start+1,'Unexpected competing behavior')
    out.extend(right);decisions.append({'file':str(file.relative_to(root)).replace('\\','/'),'line':start+1,'match':matched[0],'decision':matched[1],'existingHunkSHA256':hashlib.sha256(existing.encode()).hexdigest(),'incomingHunkSHA256':hashlib.sha256(incoming.encode()).hexdigest()})
file.write_text(''.join(out),encoding='utf8')
source=root/'mandate/items/MND-20261015-001-feature-open-a-curated-local-ielts-beta-pathway.md'
target=root/'docs/integration/historical/mandate/audio-dashboard-v2'/source.name
assert source.resolve().is_relative_to(root) and target.resolve().is_relative_to(root)
target.parent.mkdir(parents=True,exist_ok=True);assert not target.exists()
before=hashlib.sha256(source.read_bytes()).hexdigest();source.rename(target);assert hashlib.sha256(target.read_bytes()).hexdigest()==before
decisions.append({'file':str(source.relative_to(root)).replace('\\','/'),'decision':'Direct human approval: duplicate imported mandate preserved byte-exact in historical namespace; main Intermediate ID/approval remains active; no ID or approval rewriting.','historicalPath':str(target.relative_to(root)).replace('\\','/'),'sha256':before})
(root/'docs/integration/evidence/audio-resolutions.json').write_text(json.dumps(decisions,indent=2)+'\n',encoding='utf8')
print(json.dumps({'reviewedAudioHunks':len(decisions)-1,'mandateBytesPreserved':True}))
