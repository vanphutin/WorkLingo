# Candidate readiness — GREEN: reproduced placement harness defect resolved

Final tested app/test source **4577379**; diagnostic launcher fixes **0446e87**. Integration worktree/branch retained. **No merge, push or deploy.**

| Gate | Evidence |
| --- | --- |
| GR-PLACEMENT-001 | Natural19 failures prove future availableAt relative to supplied claim time; deterministic1ms RED→GREEN; harness synchronization fixed, scheduler unchanged |
| Bounded reproduction | Before229pass/19fail; fixed254/254; reviewed launcher254/254. After fix360 full journeys/1080 business claims,124 other integration load tests, zero unexpected nulls |
| Full backend | **1179 passed /1 inherited skipped**,220 passed files /1 skipped;650.80s; source4577379; exit0; owned DB cleanuptrue |
| Related checks | Placement3, queue12, backup10 pass in full; fake clock/future boundary/uncommitted visibility/held lock controls retained; API lint/types pass |
| Frontend/contracts/E2E | No source impact; SHA-identical to ef27185. Historical web798/contracts125/content135, real legacy12/12 at ef27185 and V3equivalent8/8 at077ee67 retained as previous evidence, not newly run |
| Diagnostic safety | Two Important review findings RED2→GREEN2: exclusive evidence reservation and finite process/Docker deadlines; reviewed launcher matrix passes and cleans all children/DB |
| Preservation |1295 original files,52 dirty paths/index/status,2978 backup files, main7a5e383/LGcc09a75/other captured refs and old582+481 artifacts verified; new source/log/archive SHA manifest |

GREEN follows the demonstrated reproduced harness cause and its regression fix plus final gates, not merely a passing rerun. Exact state of the destroyed historical database cannot be reconstructed. No product race was demonstrated or speculatively fixed. The persisted-time helper strengthens expected-job, completion and attempt-count assertions; no arbitrary sleeps, retries or relaxed evidence assertions.

Remaining limitations: existing prepared Windows speech fixture skip; no new paid-provider/physical-device certification. Deferred minor: legacy diagnostics true-mode timing is inaccurate and must not be used; primary matrices use boundary/failure, and hostNow is documented as supplied runner time. Original historical logs and prior RED assessments remain in history/evidence and the retained historical report sections.

See [complete12-point report](placement-root-cause-report.md) and [investigation](placement-root-cause-investigation.md). Stop pending human review; GREEN is not permission to merge main, push or deploy.
