# Beginner R2.1 source reconciliation

Date: 2026-11-07. Evidence: local source reconciliation and independent code review; no human learner validation.

## Current identities

Inventory SHA-256: `d5e9ba5e0843b27dcca327fd1e04fdc455e845885f9caadeb799da9b94a67776`.

Vocabulary evidence SHA-256: `e8cca326f361f96102f71eec3745a82bcfdcbda883cf36872a96492a29bfe67a`.

The inventory includes the complete vocabulary evidence snapshot. Source text uses committed LF identity; WAV bytes are never normalized.

| Lesson | Source SHA-256 | Bundle SHA-256 | Activities / objectives / audio |
|---|---|---|---|
| MG01-L1 | `da7a962a6f49c5a37a8e6abf94f57d320095749807aee7b8087bbcea7e6834a7` | `bec4d025c8719fb6271fee73f42ffca2c33b53b9460c5e5e0153ab4c76f74115` | 8 / 4 / 3 |
| MG01-L2 | `8e56913c15309b143724d927dc1fe109dc8f1e7e45193b04329ff756f7822e9b` | `bf2e376d7abc2930e99ab4863848d4f045453628791ac40eb5d11fdd9aecf6f1` | 8 / 4 / 3 |
| MG01-L3 | `f625bafa71efad86d5a87c875a7474945d2e5eb190075c5b0cd99fd2cefe8a6c` | `c772d5bf52b496d65a127ed120f7a98978938e7ace923339197141e8e2645b3a` | 8 / 4 / 3 |
| MG01-L4 | `2052b9668fbc4ec1bfb01d46157f010af30913c167783ecf9716a05f16428024` | `a6926156c9a65ac1792c2850de99bc939edc409684351e93128d6e6574ee9f1b` | 8 / 4 / 3 |
| MG02-L1 | `5b4fb8b342dd1d522caacd2a5b1971710d90e1a0f0057e3776bb1a6883d0a88a` | `f7690b8c1d10989b624a01623e8b4c1358a0d1829bd5ee46fdfd092609aea9c9` | 8 / 4 / 3 |
| MG02-L2 | `46ab7eb3f512c5f9a4177b475bbb45283b2d107cf0693d3e8cb0b3cdc234eb2a` | `06db374a3a4289630fd11ef8bc9cb170ed285525b94c2965d6d91b2f031cf193` | 8 / 4 / 3 |
| MG02-L3 | `d226f10472ceddfcc05ccf906b2eef37eecd0914aa7f882f6484eee6b1ee5a1d` | `c1e44f8fb188c6c1e0f46ef4df2ff067dc4dc31cf2938a5d7f3b9155893ad4e2` | 8 / 4 / 3 |
| MG02-L4 | `3fac27d20494bdca2dcd5e1bcce5b8199b2378aac5ba1c904b2096285c3241bb` | `04b4c48f2d8c55f0ff47816f29f964a01751d2452919a7fe76f2aefb1d7406ba` | 8 / 4 / 3 |

## Integrity outcome

PASS: 8 lessons, 64 activities, 32 objectives, 41 lexical blocks, 24 listening scripts and 24 selected WAV files reconciled. Sources are `content/beginner/pilot/mg01-l1.lesson.txt` through MG02-L4 in intended order.

`beginner-program-source.ts` checks source hashes, parser publication readiness, activity/objective counts, seven corrected bundle projections, response-task content, task rubrics, evaluator rubric-code identity, exact script text, listening references, WAV SHA-256 and RIFF/WAVE headers. Each lesson has three selected audio assets. The selected offline files are identified by `beginner-pilot-ai-correction-bindings.json`; no provider request is required.

MG02-L2 remains the distinct frozen control: its source hash is checked and its known historical bundle identity is required. The control bundle artifact was not independently reconstructed in this review; the importer compares its bundle digest with the frozen constant. This limitation does not transfer any historical PASS decision.

## Evidence and safety

The authoritative binding records are `beginner-pilot-post-context-requalification.json`, `beginner-pilot-ai-correction-bindings.json`, and `beginner-pilot-vocabulary-provenance.json`. All 297 historical qualification decisions remain historical evidence; this work does not edit or promote them. The constrained local grading result remains REVISE. Speaking/writing use transparent unscored practice rather than qualified automatic grading.

Read-only command: `pnpm --filter @worklingo/api exec tsx -e` importing `reconcileBeginnerSources` and printing the inventory/counts/lesson bindings; completed 2026-11-07. Source tests also passed (2 tests) in the independent 13-test rerun. These are engineering checks, not production qualification.

Actual database release IDs and final publication readback belong in [publication report](beginner-program-publication-report.md); no release identity is inferred here.
