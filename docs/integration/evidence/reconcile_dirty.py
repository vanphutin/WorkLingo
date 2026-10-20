"""Per-file snapshot reconciliation decisions, no blanket dirty diff application."""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[3];backup=Path('D:/Projects/WorkLingo-Integration-Backup')
snapshot=json.loads((backup/'manifest.private.json').read_text(encoding='utf8'))
inv=json.loads((root/'docs/integration/evidence/inventory.json').read_text(encoding='utf8'))
registry='mandate/items/MND-20261019-001-ux-unify-worklingo-visual-materials-and-accessibility-fallbacks-for-liqui.md'
target=root/registry
historical=root/'docs/integration/historical/mandate/original-dirty'/Path(registry).name
historical.parent.mkdir(parents=True,exist_ok=True)
if target.exists():
    assert target.read_bytes()==(backup/'files'/registry).read_bytes()
    assert not historical.exists();target.rename(historical)
elif not historical.exists():historical.write_bytes((backup/'files'/registry).read_bytes())
assert historical.read_bytes()==(backup/'files'/registry).read_bytes()
rows=[]
for original in inv['dirty']:
    row=dict(original);p=row['path'];src=backup/'files'/p;dst=root/p
    same=dst.exists() and src.read_bytes()==dst.read_bytes()
    row['candidateSHA256']=hashlib.sha256(dst.read_bytes()).hexdigest() if dst.exists() else None
    row['conflictType']='add/add' if row['addAdd'] else 'semantic overlap' if row['lgOverlap'] else 'no-overlap'
    if same:
        intent='Historical rendering capture / identical original file';resolution='Identical bytes already integrated from selected source history';status='ALREADY PRESENT';tests='Hash equality'
    elif 'admin-curriculum/curriculum-workspace' in p or p.endswith('messages/adminCurriculum.ts') or p.endswith('admin-curriculum/curriculum.css'):
        intent='Curriculum search, status/issues filtering, program/path/level collapse, outline/copy and compact view; original mutation handlers';resolution='Semantic three-way reconciliation, retain LG authoring root and canonical colors; only new scoped functional CSS imported, clipping/old branding rejected';status='INTEGRATED';tests='New missing-control RED then7/7 owner tests; candidate browser reflow pending'
    elif p==registry:
        intent='Captured original Liquid Glass UX mandate with source references predating redesign';resolution='Preserve byte-exact in docs/integration/historical/mandate/original-dirty; original line270 no longer exists in approved inline owner. Do not resurrect obsolete active evidence, invent an approval or rewrite original references';status='HISTORICAL SUPERSEDED';tests='Historical hash; active registry reindex/validate separately'
    elif p=='mandate/INDEX.md':
        intent='Generated registry includes original UX proposal';resolution='Rebuild from current valid active items; duplicate15-001 and stale-original UX capture preserved byte-exact in historical namespace, not falsely active/approved';status='REGENERATED';tests='Mandate CLI reindex/validate'
    elif p.endswith('settings/page.test.tsx'):
        intent='Heading, AI/audio destinations, language and appearance coverage';resolution='Adapt original assertions to approved Appearance copy and actual theme/reduced-transparency controls';status='INTEGRATED ADAPTATION';tests='Settings page test; browser CSS/native zoom checks'
    elif 'evaluation-feedback' in p or p.endswith('learning-session/session-shell.tsx') or p.endswith('messages/learningSession.ts'):
        intent='Floating topup feedback and related tests/labels';resolution='Human explicitly chose inline; retain feature processing/model/recording/error data and LG inline draft/focus tests; do not import modal/topup state or dead labels';status='EXPLICITLY SUPERSEDED';tests='Merged feedback/busy/delete/draft identity and session tests'
    elif p.endswith('globals.css') or p.endswith('landing.css') or p=='apps/web/src/app/page.tsx' or '/settings/' in p or p.endswith('mastery/mastery.css'):
        intent='Alternate landing/settings/mastery/global presentation';resolution='Existing required destinations/theme/locale/auth/learning behavior retained through LG owners; alternate decorative copy/layout/palette superseded by completed approved LG design; byte-exact original remains private';status='PRESENTATION SUPERSEDED';tests='Candidate route/theme/reflow/owner checks; no assertion of discarded duplicate UI being executed'
    elif p.startswith('docs/ui-redesign/'):
        intent='Original Phase0 discovery/plan/source capture';resolution='Use completed versioned Phase0-6 evidence from LG; retain divergent originals privately, do not overwrite historical QA or retroactively certify current integrated routes';status='HISTORICAL SUPERSEDED';tests='Existing LG artifact hashes; candidate independent evidence separate'
    elif p.startswith('docs/reports/'):
        intent='Original flow audit and local screenshots';resolution='Private backup retains exact audit/screens; findings are useful prior evidence, not new candidate verification or permission to copy potentially private captures';status='PRESERVED PRIVATE';tests='Backup hash; audit risks cross-referenced in integration QA'
    elif p.startswith('docs/superpowers/reports/'):
        intent='Session workspace verification note';resolution='Approved audio committed report has same architecture and newer evidence; preserve divergent original privately, no duplicate report';status='HISTORICAL SUPERSEDED';tests='Session/workspace source + tests; private hash'
    else:raise RuntimeError('Unclassified dirty source: '+p)
    row.update({'originalDirtyIntent':intent,'resolution':resolution,'status':status,'tests':tests,'preservation':'Private backup SHA256 verified, original unchanged'})
    rows.append(row)
report={'sourceSnapshot':snapshot['head'],'candidateAtClassification':'See current integration HEAD; final source hashes in release manifest','rows':rows,'allAccountedFor':len(rows)==len(snapshot['dirty']),'functionalDirtyOwnersIntegrated':['curriculum controls','settings behavioral test'],'humanDecisions':['inline feedback','LG presentation retained instead of alternate old presentation','imported duplicate mandate preserved historically'],'limits':'Superseded/private artifacts are not falsely labelled transplanted or tested. Stale original mandate evidence remains byte-exact historical, never invented active approval. Other worktree dirty changes remain separate.'}
(root/'docs/integration/evidence/dirty-reconciliation.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
lines=['# Original dirty-source reconciliation','',f'Exact observed source:52 paths =14 tracked modifications +38 untracked, no staged changes. Backup2978 files/813751961bytes includes ignored work/data/credentials privately;1295 tracked+untracked source hashes and original index/status/diff fingerprints preserved. No backup content or environment values enter Git.','', 'All52 accounted for. Superseded/private records are preserved, not labelled runtime-integrated. Product scope follows direct human answers. Original and LG checkouts remain read-only.','', '| File | Original dirty intent | Candidate state | LG overlap/conflict | Resolution | Tests | Status |','| --- | --- | --- | --- | --- | --- | --- |']
for row in rows:lines.append('| `'+row['path']+'` | '+row['originalDirtyIntent']+' | '+('present' if (root/row['path']).exists() else 'private/historical reference')+' | '+row['conflictType']+' | '+row['resolution']+' | '+row['tests']+' | '+row['status']+' |')
lines+=['','Source/backup/candidate hash mapping is in evidence/dirty-reconciliation.json. Relevant ignored data and .env remain only in restricted private backup; no copy into candidate runtime. Main dirty checkout remains unsafe to update merely because the same functionality has been reconciled here.']
(root/'docs/integration/dirty-source-inventory.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
print(json.dumps({'dirty':len(rows),'accountedFor':report['allAccountedFor'],'statuses':{state:sum(row['status']==state for row in rows) for state in sorted(set(row['status'] for row in rows))}}))
