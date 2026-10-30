(function (global) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value;
  const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  const need = (ok, message) => { if (!ok) throw Error(message); };
  const keys = (value, list) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === list.split(',').sort().join(',');
  const text = value => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 8000;
  const sha = async bytes => Array.from(new Uint8Array(await global.crypto.subtle.digest('SHA-256', bytes))).map(b => b.toString(16).padStart(2, '0')).join('');
  function createState(packet) { return {packet, index: 0, drafts: {}, verified: {}, played: {}, listened: {}, audioRevision: {}, reviewer: null}; }
  function itemFor(state, id) { const item = state.packet.items.find(i => i.id === id); need(item, 'UNKNOWN_ITEM'); return item; }
  function saveDraft(state, id, review) { itemFor(state, id); state.drafts[id] = copy(review); }
  function move(state, delta) { state.index = Math.max(0, Math.min(state.packet.items.length - 1, state.index + delta)); return state.packet.items[state.index]; }
  async function verifyAudio(state, id, bytes) {
    const item = itemFor(state, id), revision = (state.audioRevision[id] || 0) + 1; state.audioRevision[id] = revision;
    delete state.verified[id]; delete state.played[id]; delete state.listened[id];
    const actual = await sha(bytes);
    need(state.audioRevision[id] === revision, 'AUDIO_SELECTION_SUPERSEDED');
    need(item.target.bindings.audio && actual === item.target.bindings.audio.sha256, 'AUDIO_HASH: selected file does not match this item');
    state.verified[id] = item.target.bindings.audio.sha256; return true;
  }
  function markPlayed(state, id) { need(state.verified[id], 'AUDIO_HASH_REQUIRED'); state.played[id] = true; }
  function attestListening(state, id, value) { need(state.verified[id] && state.played[id], 'LISTEN: play the verified audio first'); state.listened[id] = value === true; }
  function validateReviewer(reviewer) {
    need(keys(reviewer, 'id,authorType,qualificationReference,identityEvidenceReference,independenceAttestation') && text(reviewer.id) && !/(?:\bAI\b|WORKLINGO-AI|GPT|CLAUDE|GEMINI|LLAMA|QWEN)/iu.test(reviewer.id) && reviewer.authorType === 'HUMAN_SELF_ATTESTED' && text(reviewer.qualificationReference) && text(reviewer.identityEvidenceReference) && reviewer.independenceAttestation === true, 'REVIEWER: complete your own identity and qualification references; do not use the recipient as a signature');
  }
  function validateReview(item, review) {
    need(keys(review, 'decision,reviewedAt,method,evidenceReferences,rationale,confidence,limitations,correction,comparisonToAI,disagreementRationale'), 'REVIEW_SCHEMA');
    need(['PASS', 'REVISE', 'REJECT', 'NEEDS_EVIDENCE'].includes(review.decision), 'DECISION_REQUIRED');
    need(text(review.rationale), 'RATIONALE_REQUIRED');
    need(typeof review.reviewedAt === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/u.test(review.reviewedAt) && Number.isFinite(Date.parse(review.reviewedAt)) && Date.parse(review.reviewedAt) <= Date.now(), 'REVIEW_DATE_REQUIRED');
    need(new Date(review.reviewedAt).toISOString().slice(0,19) === review.reviewedAt.slice(0,19), 'REVIEW_DATE: nonexistent calendar date');
    need(['ACTUAL_AUDIO_LISTENING', 'SOURCE_TEXT_REVIEW', 'ASR_ONLY'].includes(review.method) && ['HIGH', 'MEDIUM', 'LOW'].includes(review.confidence), 'METHOD_CONFIDENCE_REQUIRED');
    need(Array.isArray(review.evidenceReferences) && review.evidenceReferences.length >= 1 && review.evidenceReferences.length <= 40 && review.evidenceReferences.every(e => keys(e, 'reference,sha256') && text(e.reference) && typeof e.sha256 === 'string' && /^[a-f0-9]{64}$/u.test(e.sha256)), 'EVIDENCE: add an opaque reference and exact SHA256');
    need(Array.isArray(review.limitations) && review.limitations.length >= 1 && review.limitations.length <= 40 && review.limitations.every(text), 'LIMITATIONS_REQUIRED');
    need(review.correction === null || text(review.correction), 'CORRECTION_SCHEMA');
    need(!['REVISE', 'REJECT'].includes(review.decision) || text(review.correction), 'CORRECTION_REQUIRED');
    need(['AGREE', 'DISAGREE', 'PARTIAL', 'NOT_COMPARED'].includes(review.comparisonToAI) && (review.disagreementRationale === null || text(review.disagreementRationale)), 'COMPARISON_REQUIRED');
    need(!['DISAGREE', 'PARTIAL'].includes(review.comparisonToAI) || text(review.disagreementRationale), 'DISAGREEMENT_RATIONALE_REQUIRED');
    need(!(item.category === 'audio' && review.decision === 'PASS') || review.method === 'ACTUAL_AUDIO_LISTENING', 'LISTEN: audio PASS requires actual listening');
  }
  function exportSubmission(state, reviewer) {
    validateReviewer(reviewer);
    need(!state.reviewer || same(state.reviewer,reviewer), 'REVIEWER_CONFLICT: preserved decisions belong to the imported reviewer');
    const reviews = Object.entries(state.drafts).map(([id, review]) => {
      const item = itemFor(state, id); validateReview(item, review);
      if (item.category === 'audio' && review.decision === 'PASS') need(state.verified[id] === item.target.bindings.audio.sha256 && state.played[id] && state.listened[id], 'LISTEN: verify, play and explicitly attest listening before audio PASS');
      return {kind: 'QA', id, bindings: copy(item.target.bindings), review: copy(review)};
    });
    need(reviews.length > 0, 'REVIEWS_REQUIRED');
    state.reviewer=copy(reviewer);
    return {schemaVersion: 'worklingo-external-expert-intake/1', templateSha256: state.packet.templateSha256, reviewer: copy(reviewer), reviews};
  }
  function importSubmission(state, input) {
    need(keys(input, 'schemaVersion,templateSha256,reviewer,reviews') && input.schemaVersion === 'worklingo-external-expert-intake/1' && input.templateSha256 === state.packet.templateSha256, 'TEMPLATE: stale or unknown submission');
    validateReviewer(input.reviewer); need(!state.reviewer || same(state.reviewer,input.reviewer), 'REVIEWER_CONFLICT: import belongs to another reviewer');
    need(!Object.keys(state.drafts).length || state.reviewer, 'REVIEWER_CONFLICT: export existing unbound drafts before importing a submission');
    need(Array.isArray(input.reviews) && input.reviews.length > 0 && input.reviews.length <= 82, 'REVIEWS_REQUIRED');
    const next = {}, seen = new Set();
    for (const row of input.reviews) {
      need(keys(row, 'kind,id,bindings,review') && row.kind === 'QA' && !seen.has(row.id), 'DUPLICATE_OR_UNKNOWN_REVIEW'); seen.add(row.id);
      const item = itemFor(state, row.id); need(same(row.bindings, item.target.bindings), 'BINDING: source, bundle or audio differs'); validateReview(item, row.review);
      need(!state.drafts[row.id] || same(state.drafts[row.id], row.review), 'CONFLICT: existing decision preserved; export it before starting a separate review'); next[row.id] = copy(row.review);
    }
    Object.assign(state.drafts, next); state.reviewer=copy(input.reviewer); return copy(input.reviewer);
  }
  const api = {createState, saveDraft, move, verifyAudio, markPlayed, attestListening, exportSubmission, importSubmission};
  global.WorkLingoReview = api;
  if (!global.document) return;
  const doc = global.document, $ = id => doc.getElementById(id), packet = JSON.parse($('review-packet').textContent), state = createState(packet);
  let audioUrl = null, selection = 0;
  const announce = message => { $('message').textContent = message; };
  const errorFields = {REVIEWER:'reviewerId',RATIONALE:'rationale',REVIEW_DATE:'reviewedAt',METHOD:'method',CONFIDENCE:'confidence',EVIDENCE:'evidenceReferences',LIMITATIONS:'limitations',CORRECTION:'correction',COMPARISON:'comparisonToAI',DISAGREEMENT:'disagreementRationale',DECISION:'decision',LISTEN:'listened',AUDIO:'audio-file'};
  const reportError = error => {
    $('errors').hidden = false; $('errors').textContent = error.message;
    const key = Object.keys(errorFields).find(prefix => error.message.startsWith(prefix)), field = key && $(errorFields[key]);
    if(field){field.setAttribute('aria-invalid','true');const inline=doc.createElement('p');inline.id='inline-error';inline.className='error';inline.textContent=error.message;field.setAttribute('aria-describedby',inline.id);field.insertAdjacentElement('afterend',inline);const link=doc.createElement('a');link.href='#'+field.id;link.textContent=' Go to this field';$('errors').appendChild(link);}
    $('errors').focus();
  };
  const clearError = () => { $('errors').hidden = true; $('errors').textContent = ''; doc.querySelectorAll('[aria-invalid]').forEach(field=>{field.removeAttribute('aria-invalid');field.removeAttribute('aria-describedby');});doc.querySelectorAll('#inline-error').forEach(element=>element.remove()); };
  const reviewFields = ['decision', 'reviewedAt', 'method', 'rationale', 'confidence', 'correction', 'comparisonToAI', 'disagreementRationale'];
  const getReviewer = () => ({id: $('reviewerId').value.trim(), authorType: 'HUMAN_SELF_ATTESTED', qualificationReference: $('qualificationReference').value.trim(), identityEvidenceReference: $('identityEvidenceReference').value.trim(), independenceAttestation: $('independenceAttestation').checked});
  function readReview() {
    const r = Object.fromEntries(reviewFields.map(key => [key, $(key).value.trim()]));
    r.correction = r.correction || null; r.disagreementRationale = r.disagreementRationale || null;
    r.limitations = $('limitations').value.split('\n').map(x => x.trim()).filter(Boolean);
    r.evidenceReferences = $('evidenceReferences').value.split('\n').filter(x => x.trim()).map(line => { const parts = line.split('|'); return {reference: (parts[0] || '').trim(), sha256: (parts[1] || '').trim()}; });
    return r;
  }
  function storePartial() { if (reviewFields.some(key => $(key).value.trim()) || $('limitations').value.trim() || $('evidenceReferences').value.trim()) saveDraft(state, state.packet.items[state.index].id, readReview()); }
  function render() {
    selection++; clearError(); const item = packet.items[state.index], draft = state.drafts[item.id];
    if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; } $('audio').pause(); $('audio').removeAttribute('src'); $('audio').load();
    $('item-title').textContent = item.id; $('item-category').textContent = item.category; $('progress').textContent = `${state.index + 1} / ${packet.items.length} · ${Object.keys(state.drafts).length} drafts in memory`;
    $('context').textContent = JSON.stringify(item.context, null, 2); $('bindings').textContent = JSON.stringify(item.target.bindings, null, 2); $('ai').textContent = `${item.ai.proposal}\n${item.ai.rationale}\nLimitations: ${item.ai.unresolved.join('; ')}`;
    $('source').textContent = item.sources.map(s => `${s.path}\nSHA256 ${s.sha256}\n\n${s.text}`).join('\n\n');
    $('audio-section').hidden = item.category !== 'audio'; $('audio-file').value = ''; $('audio-status').textContent = state.verified[item.id] ? 'Earlier verified playback is retained for this item. Choose the WAV again to replay.' : 'Choose the exact local WAV. Playback stays disabled until its SHA256 matches.'; $('listened').checked = !!state.listened[item.id]; $('listened').disabled = !state.played[item.id];
    for (const key of reviewFields) $(key).value = draft ? (draft[key] || '') : '';
    $('limitations').value = draft ? draft.limitations.join('\n') : ''; $('evidenceReferences').value = draft ? draft.evidenceReferences.map(e => e.reference + ' | ' + e.sha256).join('\n') : '';
    $('previous').disabled = state.index === 0; $('next').disabled = state.index === packet.items.length - 1;
  }
  $('previous').onclick = () => { storePartial(); move(state, -1); render(); $('item-title').focus(); };
  $('next').onclick = () => { storePartial(); move(state, 1); render(); $('item-title').focus(); };
  $('review-form').onsubmit = event => { event.preventDefault(); clearError(); try { const item = packet.items[state.index], review = readReview(); validateReview(item, review); if(item.category === 'audio' && review.decision === 'PASS') need(state.listened[item.id], 'LISTEN: verify and play the exact WAV, then attest listening'); saveDraft(state, item.id, review); announce('Decision retained in memory. Export before closing this page.'); $('progress').textContent = `${state.index + 1} / 82 · ${Object.keys(state.drafts).length} drafts in memory`; } catch(error) { reportError(error); } };
  $('audio-file').onchange = async () => {
    const selected = ++selection, item = packet.items[state.index], id = item.id, file = $('audio-file').files[0]; clearError();
    if(audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl=null; } $('audio').removeAttribute('src'); $('audio').load(); $('listened').checked=false; $('listened').disabled=true;
    if(!file) return; announce('Checking local audio SHA256…');
    try { need(file.size <= 20*1024*1024, 'AUDIO_SIZE: expected a short WAV'); const bytes=await file.arrayBuffer(); if(selected!==selection)return; await verifyAudio(state,id,bytes); if(selected!==selection || packet.items[state.index].id !== id) return; audioUrl=URL.createObjectURL(file); $('audio').src=audioUrl; $('audio-status').textContent='SHA256 matches this recording. Play it, then record your own listening judgment.'; announce('Verified audio ready.'); } catch(error) { if(selected===selection && packet.items[state.index].id===id) reportError(error); }
  };
  $('audio').onplay = () => { try { const id=packet.items[state.index].id; markPlayed(state,id); $('listened').disabled=false; } catch(error) { reportError(error); } };
  $('listened').onchange = () => { try { attestListening(state,packet.items[state.index].id,$('listened').checked); } catch(error) { reportError(error); } };
  $('export').onclick = () => { clearError(); try { storePartial(); const output=exportSubmission(state,getReviewer()),blob=new Blob([JSON.stringify(output,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=doc.createElement('a'); anchor.href=url; anchor.download='worklingo-private-expert-submission.json'; anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); announce('Exported private submission. Validate with the existing CLI before handoff.'); } catch(error) { reportError(error); } };
  $('import').onchange = async () => { clearError(); try { const file=$('import').files[0]; if(!file)return; need(file.size<=4*1024*1024,'SUBMISSION_SIZE'); const reviewer=importSubmission(state,JSON.parse(await file.text())); for(const key of ['id','qualificationReference','identityEvidenceReference']) $(key==='id'?'reviewerId':key).value=reviewer[key]; $('independenceAttestation').checked=reviewer.independenceAttestation; render(); announce('Imported matching decisions; existing decisions preserved. Audio PASS must be reverified and listened to before export.'); } catch(error) { reportError(error); } finally { $('import').value=''; } };
  global.addEventListener('beforeunload', event => { if(Object.keys(state.drafts).length){event.preventDefault();event.returnValue='';} });
  render();
})(globalThis);
