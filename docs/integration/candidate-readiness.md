# Candidate readiness — RED: unexplained historical placement claim

Final tested source/test commit **ef27185**. Runtime source is byte-identical to the integrated product checkpoint; all recovery code changes are tests/harness only. **Do not merge.**

| Recovery gate | Evidence / status |
| --- | --- |
| A Backup/restore | Closed for this environment: loaded 120,000 ms; focused 10/10 and actual full backup/restore pass, checksum/data assertions intact |
| B Placement intermittency | **OPEN GR-PLACEMENT-001**: historical claim=false cause unproven;240 journeys / 720 claims + 300 direct probes and final full placement 2/2 pass do not establish a fix |
| C Final-runtime real E2E | Legacy 12/12 at ef27185; V3 desktop/mobile 8/8 at 077ee67 with byte-identical runtime/relevant tests; draft/exit persistence verified with real API |
| Full backend | 1,176 passed / 1 inherited skip; 220 passed files / 1 skipped file; exit 0; owned DB cleanup verified; 911.55 s |
| Frontend/shared | Web 798; contracts 125; content 135; owner 107; cross/native 25; lint/types/i18n/build pass |
| Preservation | 1,295 original protected files, 2,978 backup files, 52 dirty dispositions/index/status, captured refs/main/LG and 582 historical artifacts verified |

Readiness stays **RED** because the user explicitly requires keeping the unproven historical race as a blocker. No production scheduler/clock/polling change, arbitrary sleep, weakened assertion or acceptance retry was made. The newly reproduced autosave-interception and granted-lock diagnostic defects are fixed with RED→GREEN evidence; they are not relabeled as the original race.

The inherited actual-byte Windows speech release test remains skipped for absent prepared media; live providers/physical devices/WCAG and historical decorative CSS/Add-path wrapping limits remain explicit. No rate of passing tests overrides these boundaries.

No merge/push/deploy/production migration. Original main remains dirty and protected. Further investigation and any eventual exact-candidate merge require the user's separate direction/approval. See gate-recovery-report.md for all 11 handoff points and exact evidence.
