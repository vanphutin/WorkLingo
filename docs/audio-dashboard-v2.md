# Audio and dashboard metric definitions

The new dashboards extend the existing audio, analytics and learning-program modules. They do not write progression or require a database migration.

## Dashboard endpoints

- `GET /admin/analytics/overview`: authenticated Content Admin or System Admin only.
- `GET /me/dashboard`: authenticated learner only; the user ID always comes from the session.
- Both responses are validated with shared Zod contracts. Date series cover today and the preceding 13 UTC dates, including zero-activity days.
- Admin total learners counts accounts with role `LEARNER`; active learners counts distinct learners whose non-planned learning sessions were updated in the previous seven days.
- Admin session completion is completed / non-planned learning sessions across all time. Placement sessions are excluded. No sessions produces `null`, displayed as an em dash.
- Enrollment counts represent stored program enrollments, not distinct learners across programs.
- Recent activity is capped at ten sessions and excludes learner identities.
- Learner activity and scores are restricted to their active program through the session mission, level and learning path. Started and completed sessions use their respective event dates.
- Accuracy and skill averages use only `EVALUATED` attempts with scores between zero and one in the reporting period. Skill is the activity's primary activity type. Sample counts remain visible; missing evaluations are absent rather than zero.
- Lesson progress counts distinct completed lesson versions in the current published program content. Published curriculum revisions determine pinned versions; legacy missions without a revision use their current published lesson links. Repeating a lesson does not increase completion.
- Mission milestones use the latest published curriculum revision and its stored enrollment-specific completion evidence. An older revision's evidence does not complete a newer revision.
- Practice scores are not TOEIC/IELTS exam scores. The dashboard does not invent exam-score history or unavailable enrollments.

## Voice registry

The browser registry contains only actual named English voices reported by the current device. Stable voice URIs preserve saved preferences; devices without a URI use locale and name. Round-robin selection excludes disabled voices and keeps replays stable for the same session-qualified item. An explicit saved voice overrides rotation when eligible.

The Admin audio page distinguishes persisted provider configuration from current-tab device voice controls. Browser enabled/rotation controls do not reconfigure other users' devices. The existing provider exposes a single configured voice, so server-side rotation is explicitly unavailable. Playback never requests new paid audio merely to rotate voices.

Speech and native media share one playback owner. Replacing playback cancels the previous owner; stale completions and unrelated component cleanup cannot cancel its replacement.

## Compatibility

All existing Admin routes remain reachable. The new `/admin` overview and `/admin/programs/[slug]` pages link the existing shared authoring tools, with their global scope stated. Unsupported user administration and standalone question banks display an unavailable state. Learner program selection continues through the existing catalog and enrollment APIs.

## Verification record

- Shared contracts: 18 files / 88 tests passed; content-format: 6 files / 47 tests passed.
- Web suite: 88 files / 425 tests passed, including the new orientation caller regression.
- API broad run: 159 files passed; two new dashboard assertions failed against the earlier transformed service while it was being corrected. The final focused analytics and AppModule run passed all 14 tests, including both corrected cases. A second complete API run was not repeated.
- Browser broad run: 49 passed, 8 failed and 10 dependency-skipped. Failures identified stale greeting/ambiguous selectors and long-name overflow. Affected onboarding/Foundation/engagement journeys passed after fixes; final Admin/dashboard/qualification run passed 17/17. Existing audio, catalog, IELTS and language journeys passed in the broad run.
- Production API/web builds passed after the production fixes. Translation validation reports zero errors. Final lint, typecheck and whitespace results are recorded with the handoff.
- Independent review found one Important issue: orientation narration lost its voice on slide remount. A real caller test reproduced A/B/C instead of A/B/A, then passed after stable version/slide IDs were supplied. No unresolved Critical/Important review findings.

The changes remain in the attached worktree on `codex/audio-dashboard-v2`. No merge, push, deployment or data migration was performed.

Final handoff: workspace lint, workspace typecheck, translation validation and git diff whitespace checks all passed. Final acceptance browser run: 17/17 passed. The primary checkout remains clean; all changes are in the attached worktree.

## Speaker-aware dialogue follow-up

Dialogue playback and new Azure generation now share the speaker parser described in [the author format guide](dialogue-audio-format.md). Explicit `(nam)` / `(nữ)` or `(male)` / `(female)` declarations select matching distinct voices; more than two characters requires declarations. Browser playback speaks one turn at a time without labels, keeps character voices stable through replay and handles bounded pre-start recovery. Azure creates one multi-voice SSML recording and audits its speaker assignments. This extends dialogue generation; the existing provider descriptor still exposes its configured narration default, and general server round-robin settings are unchanged.

Follow-up verification: content-format 108/108, web 446/446, lint/typecheck/translation checks and API/web builds passed. Actual Edge synthesis completed David/Zira/David without labels. The API broad run had one placement worker assertion failure and two setup failures (806 passed, 1 failed, 7 skipped); all three affected files passed unchanged on targeted recheck (9/9). See [the completed plan](superpowers/plans/2026-10-15-dialogue-audio.md) for exact scope and limitations. No paid synthesis, publication or existing learner-snapshot rewrite occurred.
