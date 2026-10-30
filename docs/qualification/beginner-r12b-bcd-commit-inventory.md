# R1.2b BCD complete branch commit inventory

Baseline main 752c19c38e86ae72072cab9f5355c5a50dfba2e7; retained pre-BCD checkpoint b08e96c2e12079d07d58b13b691a70f6f1627636 (103 commits). This inventory enumerates every actual commit through 20c12c413e0dbd3f8eb78c288f7082b181e738d4 (108 commits). The final BCD closure commit containing this inventory adds one self-relative row below; resolve its exact SHA after commit. No history was reset or rewritten.

Historical semantic review is retained in beginner-r12b-final-commit-audit.md and beginner-r12b-commit-inventory.md. The new delta was read and independently reviewed in this mission. Per-commit test reruns are not inferred from historical green reports.

## 1. f202e1975912f0e855890fa27e3c0f91c8177429

docs: analyze Foundation and Basic program readiness

- M — mandate/INDEX.md
- A — mandate/items/MND-20261024-001-feature-enable-beginner-admin-authoring-and-learner-enrollment-for-foundation.md
- A — mandate/reports/2026-10-24-foundation-basic-readiness.md

## 2. 10d32a0283c61aa5af3935330b9225095003ddbc

docs: design Beginner curriculum and versioned learning resources

- A — docs/superpowers/specs/2026-10-24-beginner-curriculum-resources-design.md
- M — mandate/items/MND-20261024-001-feature-enable-beginner-admin-authoring-and-learner-enrollment-for-foundation.md
- M — mandate/reports/2026-10-24-foundation-basic-readiness.md

## 3. f8dacc66d5a3b4aea9cc1c22da6f3d822ce4cde6

docs: refine Beginner knowledge map and minimal video pilot

- M — docs/superpowers/specs/2026-10-24-beginner-curriculum-resources-design.md
- A — docs/superpowers/specs/2026-10-24-beginner-final-refinement.md
- A — docs/superpowers/specs/2026-10-24-beginner-knowledge-map.md
- A — docs/superpowers/specs/2026-10-24-beginner-video-production-plan.md
- M — mandate/items/MND-20261024-001-feature-enable-beginner-admin-authoring-and-learner-enrollment-for-foundation.md
- M — mandate/reports/2026-10-24-foundation-basic-readiness.md

## 4. 6113427bb904d5130744d2957f25e55dacbe6c0a

docs: plan Beginner pilot and compatible resource updates

- A — docs/superpowers/plans/2026-10-24-beginner-implementation.md
- M — mandate/items/MND-20261024-001-feature-enable-beginner-admin-authoring-and-learner-enrollment-for-foundation.md

## 5. 0ffaf6b9c6456f00fa7441199ad9352eb2fa86be

docs: record human approval and exact R1.1 scope

- M — docs/superpowers/plans/2026-10-24-beginner-implementation.md
- M — mandate/INDEX.md
- M — mandate/items/MND-20261024-001-feature-enable-beginner-admin-authoring-and-learner-enrollment-for-foundation.md
- A — mandate/items/MND-20261024-002-feature-implement-provider-free-beginner-r1-1-format-and-exact-version-planner.md
- A — mandate/reports/2026-10-24-beginner-r11-human-approval.md
- A — mandate/reports/2026-10-24-beginner-r11-preapproval-review.md

## 6. 2da434a75afe43f5f92de308a1081e86421ba464

feat(beginner): add guarded 1.2 format and manifest contracts

- M — apps/api/src/content-authoring/application/content-imports.service.spec.ts
- M — apps/api/src/content-authoring/application/content-imports.service.ts
- M — apps/api/src/content-authoring/application/content-publisher.service.spec.ts
- M — apps/api/src/content-authoring/application/content-publisher.service.ts
- M — packages/content-format/src/ast.ts
- A — packages/content-format/src/beginner-format.spec.ts
- A — packages/content-format/src/beginner-format.ts
- M — packages/content-format/src/foundation-metadata.ts
- M — packages/content-format/src/index.ts
- M — packages/content-format/src/normalizer.ts
- M — packages/content-format/src/parser.ts
- M — packages/content-format/src/validator.ts
- A — packages/contracts/src/beginner.contracts.spec.ts
- A — packages/contracts/src/beginner.contracts.ts
- M — packages/contracts/src/index.ts

## 7. 8315f01aa2d36f775c105bd4e29ee7e4c696cda8

feat(beginner): add exact-version planner and guarded evaluation

- M — apps/api/src/curriculum/domain/curriculum.types.ts
- M — apps/api/src/learning-sessions/application/learning-session.types.ts
- M — apps/api/src/learning-sessions/application/learning-sessions.service.spec.ts
- M — apps/api/src/learning-sessions/application/learning-sessions.service.ts
- A — apps/api/src/learning-sessions/domain/beginner-session-planner.spec.ts
- A — apps/api/src/learning-sessions/domain/beginner-session-planner.ts
- M — apps/api/src/teacher-ai/application/evaluation.service.spec.ts
- M — apps/api/src/teacher-ai/application/evaluation.service.ts
- A — apps/api/src/teacher-ai/domain/beginner-rubrics.spec.ts
- A — apps/api/src/teacher-ai/domain/beginner-rubrics.ts
- A — apps/web/src/features/learning-session/activity-workspace.test.tsx
- M — apps/web/src/features/learning-session/activity-workspace.tsx
- M — apps/web/src/lib/api/api-client.learner.test.ts
- M — apps/web/src/lib/api/api-client.ts

## 8. 5963dbf7ed5b448b77c8a8b3b48f476a90694caf

docs: verify Beginner R1.1 and record regression evidence

- M — mandate/INDEX.md
- M — mandate/items/MND-20261024-002-feature-implement-provider-free-beginner-r1-1-format-and-exact-version-planner.md
- A — mandate/reports/2026-10-24-beginner-r11-verification.md

## 9. 29777da3a029d366357806f4df20d7d84fdea713

docs: record bounded R1.2a software approval

- A — docs/superpowers/plans/2026-10-24-beginner-r12a-implementation.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261024-003-feature-implement-isolated-beginner-r1-2a-admin-authoring-and-test-release-reg.md
- A — mandate/reports/2026-10-24-beginner-r12a-human-approval.md
- A — mandate/reports/2026-10-24-beginner-r12a-preapproval-review.md
- A — mandate/reports/2026-10-24-beginner-r12a-scope.json

## 10. 5fec9198ae2af2471ce61b4d8fffb660dc3f00d4

feat(beginner): add scoped authoring contracts and environment gates

- A — apps/api/src/beginner/domain/beginner-authoring-policy.spec.ts
- A — apps/api/src/beginner/domain/beginner-authoring-policy.ts
- A — apps/api/src/beginner/domain/beginner-environment-preflight.spec.ts
- A — apps/api/src/beginner/domain/beginner-environment-preflight.ts
- A — apps/api/src/beginner/domain/beginner-publication-policy.spec.ts
- A — apps/api/src/beginner/domain/beginner-publication-policy.ts
- A — apps/api/src/common/config/app-config.module.spec.ts
- M — apps/api/src/common/config/app-config.module.ts
- A — apps/api/test/fixtures/beginner/authoring/fixture-factory.ts
- A — apps/api/vitest.beginner.config.ts
- A — packages/contracts/src/beginner-authoring.contracts.spec.ts
- A — packages/contracts/src/beginner-authoring.contracts.ts
- A — packages/contracts/src/beginner-editorial-plan.spec.ts
- A — packages/contracts/src/beginner-editorial-plan.ts
- M — packages/contracts/src/index.ts

## 11. 0b09975ec9a47c50a9a1032859edc5765bc64409

feat(beginner): enforce scoped authoring and independent review

- M — apps/api/src/admin-curriculum/application/admin-curriculum-command.service.spec.ts
- M — apps/api/src/admin-curriculum/application/admin-curriculum-command.service.ts
- M — apps/api/src/app.module.ts
- A — apps/api/src/beginner/application/beginner-authoring.service.spec.ts
- A — apps/api/src/beginner/application/beginner-authoring.service.ts
- A — apps/api/src/beginner/beginner-admin.controller.spec.ts
- A — apps/api/src/beginner/beginner-admin.controller.ts
- A — apps/api/src/beginner/beginner.module.ts
- M — apps/api/src/beginner/domain/beginner-authoring-policy.ts
- M — apps/api/src/beginner/domain/beginner-environment-preflight.ts
- M — apps/api/src/beginner/domain/beginner-publication-policy.spec.ts
- M — apps/api/src/beginner/domain/beginner-publication-policy.ts
- A — apps/api/src/beginner/dto/beginner-authoring.dto.ts
- M — apps/api/src/content-authoring/application/audio-generation.service.spec.ts
- M — apps/api/src/content-authoring/application/audio-generation.service.ts
- M — apps/api/src/content-authoring/application/content-imports.service.spec.ts
- M — apps/api/src/content-authoring/application/content-imports.service.ts
- M — apps/api/src/content-authoring/application/content-publisher.service.spec.ts
- M — apps/api/src/content-authoring/application/content-publisher.service.ts
- A — apps/api/src/curriculum-foundation/application/foundation-curriculum.service.spec.ts
- M — apps/api/src/curriculum-foundation/application/foundation-curriculum.service.ts
- A — apps/api/src/curriculum-foundation/application/foundation-validation.spec.ts
- M — apps/api/src/curriculum-foundation/application/foundation-validation.ts
- M — apps/api/test/fixtures/beginner/authoring/fixture-factory.ts
- M — packages/contracts/src/beginner-authoring.contracts.ts

## 12. b6f479b80cfec546deb335984936c98bfd3172da

feat(beginner): add planned curriculum editor and safe exact-version preview

- M — apps/api/src/beginner/application/beginner-authoring.service.spec.ts
- M — apps/api/src/beginner/application/beginner-authoring.service.ts
- M — apps/api/src/beginner/beginner-admin.controller.ts
- M — apps/api/src/beginner/domain/beginner-authoring-policy.spec.ts
- M — apps/api/src/beginner/domain/beginner-authoring-policy.ts
- M — apps/api/src/content-authoring/application/content-publisher.service.ts
- M — apps/api/src/learning-sessions/application/learning-sessions.service.ts
- A — apps/api/src/learning-sessions/domain/learner-activity-projection.spec.ts
- A — apps/api/src/learning-sessions/domain/learner-activity-projection.ts
- A — apps/web/src/app/(admin)/admin/programs/beginner/page.tsx
- A — apps/web/src/features/admin-beginner/beginner-learner-preview.test.tsx
- A — apps/web/src/features/admin-beginner/beginner-learner-preview.tsx
- A — apps/web/src/features/admin-beginner/beginner-lesson-editor.test.tsx
- A — apps/web/src/features/admin-beginner/beginner-lesson-editor.tsx
- A — apps/web/src/features/admin-beginner/beginner-workspace.test.tsx
- A — apps/web/src/features/admin-beginner/beginner-workspace.tsx
- A — apps/web/src/features/admin-beginner/beginner.css
- M — apps/web/src/features/admin-curriculum/foundation-definition-editor.test.tsx
- M — apps/web/src/features/admin-curriculum/foundation-definition-editor.tsx
- M — apps/web/src/features/admin-dashboard/admin-navigation-config.ts
- M — apps/web/src/features/admin-dashboard/admin-navigation-inventory.test.tsx
- M — apps/web/src/features/admin-dashboard/admin-navigation-model.ts
- M — apps/web/src/features/admin-dashboard/admin-sidebar.test.tsx
- M — apps/web/src/features/admin-dashboard/admin-sidebar.tsx
- A — apps/web/src/features/learning-session/activity-renderer.test.tsx
- M — apps/web/src/features/learning-session/activity-renderer.tsx
- A — apps/web/src/i18n/messages/adminBeginner.ts
- A — apps/web/src/lib/api/beginner-admin-client.test.ts
- A — apps/web/src/lib/api/beginner-admin-client.ts

## 13. 0646bec0602d0aaf3804553bd88590bd37452148

fix(beginner): guard resolved ownership and preserve publication evidence

- M — apps/api/src/admin-curriculum/application/admin-curriculum-command.service.spec.ts
- M — apps/api/src/admin-curriculum/application/admin-curriculum-command.service.ts
- M — apps/api/src/content-authoring/application/content-publisher.service.spec.ts
- M — apps/api/src/content-authoring/application/content-publisher.service.ts

## 14. 959573df3a3b1c4d52549a6f195e82d94bbe73b7

feat(beginner): add fixture-only release registry and gated test harness

- A — apps/api/src/beginner/application/beginner-release.service.spec.ts
- A — apps/api/src/beginner/application/beginner-release.service.ts
- M — apps/api/src/beginner/beginner.module.ts
- M — apps/api/src/beginner/domain/beginner-environment-preflight.spec.ts
- M — apps/api/src/beginner/domain/beginner-environment-preflight.ts
- A — apps/api/test/integration/beginner-authoring.integration.spec.ts
- A — apps/api/test/integration/beginner-release-registry.integration.spec.ts
- A — apps/api/test/integration/beginner-test-harness.ts
- M — apps/api/vitest.beginner.config.ts
- A — apps/api/vitest.beginner.integration.config.ts
- A — apps/web/e2e/beginner-admin-history.spec.ts
- A — apps/web/e2e/beginner-admin.spec.ts
- A — apps/web/playwright.beginner-admin.config.ts
- M — packages/contracts/src/beginner-authoring.contracts.ts

## 15. fd09292df2c2c76f26ef7ea3e1ea911acb96e8f2

fix(beginner): preserve published drafts and redact listening previews

- M — apps/api/src/beginner/application/beginner-authoring.service.ts
- M — apps/api/src/learning-sessions/application/learning-sessions.service.spec.ts
- M — apps/api/src/learning-sessions/domain/learner-activity-projection.spec.ts
- M — apps/api/src/learning-sessions/domain/learner-activity-projection.ts
- M — apps/web/src/features/admin-beginner/beginner-workspace.test.tsx
- M — apps/web/src/features/admin-beginner/beginner-workspace.tsx
- M — apps/web/src/features/admin-dashboard/admin-navigation-model.ts
- M — apps/web/src/features/admin-dashboard/admin-sidebar.test.tsx
- M — apps/web/src/features/admin-dashboard/admin-sidebar.tsx
- M — apps/web/src/lib/api/beginner-admin-client.ts

## 16. 47dab4efb54d33b207455762446185a3f516f1e5

docs(beginner): record verification and remaining approval blockers

- A — mandate/reports/2026-10-24-beginner-r12a-verification.md

## 17. 24756b3db8dd013046a9bdba2a1fbe79fcc9e08b

fix: deny generic Beginner content lifecycle mutations

- M — apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.spec.ts
- M — apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.ts

## 18. 520acdca8b7d63deaeb3a2a8b8dd721a6bd4186b

docs: record approved Beginner lifecycle P1 verification

- A — docs/superpowers/plans/2026-10-25-beginner-r12a-p1-lifecycle-amendment.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261025-001-bug-close-generic-beginner-content-lifecycle-removal-bypass-within-r1-2a.md
- A — mandate/reports/2026-10-25-beginner-r12a-p1-amendment-review.md
- A — mandate/reports/2026-10-25-beginner-r12a-p1-amendment-scope.json
- A — mandate/reports/2026-10-25-beginner-r12a-p1-human-approval.md
- A — mandate/reports/2026-10-25-beginner-r12a-p1-verification.md

## 19. e7332c28fe5359d336aff1f12c68df826d9d348f

fix: require effective approval-root access proof

- M — apps/api/src/beginner/domain/beginner-environment-preflight.spec.ts
- M — apps/api/src/beginner/domain/beginner-environment-preflight.ts

## 20. ab13782c32bdae20cbcd12005ea7dbe01b7e0fca

test: validate isolated-run authority and privilege evidence

- A — apps/api/test/beginner-isolated/environment.spec.ts
- A — apps/api/test/beginner-isolated/environment.ts
- A — apps/api/vitest.beginner-isolated-tools.config.ts

## 21. 2b5eb0fad544d17157112d3966e1330664c2e402

docs: record conditional Gate A safety blocker

- A — docs/superpowers/plans/2026-10-25-beginner-r12a-isolated-db-e2e-preapproval.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261025-002-infrastructure-qualify-beginner-r1-2a-on-one-isolated-postgresql-and-desktop-mobile-e.md
- A — mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-human-approval.md
- A — mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-review.md
- A — mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-scope.json
- A — mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-verification.md

## 22. 9d50bc23ff596232c9693bc058d7fb434edda211

docs: record existing-worker and ACL recheck blocker

- M — mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-verification.md

## 23. 8c3bc63df04309140e241e085050a0e32341f1f7

docs: capture OS-only Beginner worker preapproval

- A — docs/superpowers/plans/2026-10-26-beginner-windows-worker-preapproval.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261026-001-infrastructure-establish-one-least-privilege-windows-worker-for-beginner-r1-2a-withou.md
- A — mandate/reports/2026-10-26-beginner-windows-worker-review.md
- A — mandate/reports/2026-10-26-beginner-windows-worker-scope.json

## 24. 25d2ee2b2d45945830224f993302e0af22936aef

docs: capture worker retirement and main database audit findings

- A — docs/superpowers/plans/2026-10-26-main-db-audit-worker-retirement-preapproval.md
- M — mandate/INDEX.md
- M — mandate/items/MND-20261026-001-infrastructure-establish-one-least-privilege-windows-worker-for-beginner-r1-2a-withou.md
- A — mandate/items/MND-20261026-002-infrastructure-retire-only-the-owned-temporary-beginner-worker-and-preserve-main-data.md
- A — mandate/reports/2026-10-26-beginner-windows-worker-human-approval.md
- A — mandate/reports/2026-10-26-beginner-windows-worker-verification.md
- A — mandate/reports/2026-10-26-main-db-readonly-counts.json
- A — mandate/reports/2026-10-26-main-db-worker-preapproval-review.md
- A — mandate/reports/2026-10-26-main-db-worker-retirement-scope.json

## 25. 98b0e72b8dd1f42eed002b2b14802ee249e91753

docs: verify approved temporary worker retirement

- M — mandate/INDEX.md
- M — mandate/items/MND-20261026-002-infrastructure-retire-only-the-owned-temporary-beginner-worker-and-preserve-main-data.md
- A — mandate/reports/2026-10-26-main-db-worker-retirement-human-approval.md
- A — mandate/reports/2026-10-26-main-db-worker-retirement-verification.md

## 26. 3c550947b66b66220f7e8d8303ec71c720cb5c2e

docs: scope controlled R1.2a qualification on main database

- A — docs/superpowers/plans/2026-10-26-beginner-main-db-qualification.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261026-003-infrastructure-qualify-beginner-r1-2a-on-the-existing-main-database-with-fixture-only.md
- A — mandate/reports/2026-10-26-beginner-main-db-checksums.json
- A — mandate/reports/2026-10-26-beginner-main-db-review.md
- A — mandate/reports/2026-10-26-beginner-main-db-scope.json

## 27. 5580c8338e4ff601d14995161e84ecc2cf1f430c

docs: record scoped human approval for main database qualification

- M — mandate/INDEX.md
- M — mandate/items/MND-20261026-003-infrastructure-qualify-beginner-r1-2a-on-the-existing-main-database-with-fixture-only.md
- A — mandate/reports/2026-10-26-beginner-main-db-human-approval.md

## 28. b5a4e0f48f8933db6a4e418eb9e9f0567aa87b11

feat: bind controlled Beginner test capabilities to approved scope

- M — apps/api/src/common/config/app-config.module.spec.ts
- M — apps/api/src/common/config/app-config.module.ts
- M — packages/contracts/src/beginner-authoring.contracts.spec.ts
- M — packages/contracts/src/beginner-authoring.contracts.ts

## 29. 529125693531b2722cda2e20f5e6c09a6e5fd260

test: add guarded main database qualification harness for Beginner

- A — apps/api/prisma.beginner-main.config.ts
- M — apps/api/src/beginner/domain/beginner-environment-preflight.spec.ts
- M — apps/api/src/beginner/domain/beginner-environment-preflight.ts
- A — apps/api/test/beginner-main/backup.spec.ts
- A — apps/api/test/beginner-main/backup.ts
- A — apps/api/test/beginner-main/egress-guard.cjs
- A — apps/api/test/beginner-main/environment.spec.ts
- A — apps/api/test/beginner-main/environment.ts
- A — apps/api/test/beginner-main/fixtures.spec.ts
- A — apps/api/test/beginner-main/fixtures.ts
- A — apps/api/test/beginner-main/run.spec.ts
- A — apps/api/test/beginner-main/run.ts
- A — apps/api/test/beginner-main/server.ts
- M — apps/api/test/integration/beginner-authoring.integration.spec.ts
- M — apps/api/test/integration/beginner-release-registry.integration.spec.ts
- M — apps/api/test/integration/beginner-test-harness.ts
- A — apps/api/vitest.beginner-main-tools.config.ts
- M — apps/web/e2e/beginner-admin-history.spec.ts
- M — apps/web/playwright.beginner-admin.config.ts

## 30. 613fcec48a2b40b3a3e720c6a57fc5b0534562b4

docs: record incomplete main qualification and reviewed safety evidence

- A — mandate/reports/2026-10-26-beginner-main-db-verification.md

## 31. 73c1a19bc78136b2746eb6d9a174be1a48574ad9

docs: capture separate Beginner pilot content authoring scope

- A — docs/superpowers/plans/2026-10-27-beginner-r12b-content-authoring.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261027-001-learning-content-author-real-mg01-mg02-beginner-pilot-sources-with-offline-qualificatio.md
- A — mandate/reports/2026-10-27-beginner-r12b-preapproval-review.md
- A — mandate/reports/2026-10-27-beginner-r12b-proposal.json
- A — mandate/reports/2026-10-27-beginner-r12b-scope.json

## 32. 76c5279463da021c50d53b684e0084f33c54e5b8

docs: permit scoped governance descendants in content baseline checks

- M — mandate/items/MND-20261027-001-learning-content-author-real-mg01-mg02-beginner-pilot-sources-with-offline-qualificatio.md
- M — mandate/reports/2026-10-27-beginner-r12b-proposal.json
- M — mandate/reports/2026-10-27-beginner-r12b-scope.json

## 33. 74043b2546bb2ce523f247ab02a26f4d7c0515fe

docs: record human approval for offline Beginner pilot authoring

- M — mandate/INDEX.md
- M — mandate/items/MND-20261027-001-learning-content-author-real-mg01-mg02-beginner-pilot-sources-with-offline-qualificatio.md
- A — mandate/reports/2026-10-27-beginner-r12b-human-approval.md

## 34. 6dc533b2d78fca5049170d322b0692bd58cd41e8

feat: author MG01 introduction lesson with offline qualification

- A — apps/api/test/beginner-pilot/qualify-content.test.ts
- A — apps/api/test/beginner-pilot/qualify-content.ts
- A — content/beginner/pilot/mg01-l1.lesson.txt
- A — docs/qualification/beginner-pilot-content-review.md

## 35. 5141e372e0a0bf5fd63583191a0b6cb6d2ac209d

feat: author MG01 name pronunciation and transfer lessons

- A — content/beginner/pilot/mg01-l2.lesson.txt
- A — content/beginner/pilot/mg01-l3.lesson.txt
- A — content/beginner/pilot/mg01-l4.lesson.txt

## 36. db16a5a5b29f2ce2a8bcc9322324a2ca543f6b99

feat: author MG02 object and quantity pilot with complete evidence matrix

- M — apps/api/test/beginner-pilot/qualify-content.test.ts
- A — content/beginner/pilot/mg02-l1.lesson.txt
- A — content/beginner/pilot/mg02-l2.lesson.txt
- A — content/beginner/pilot/mg02-l3.lesson.txt
- A — content/beginner/pilot/mg02-l4.lesson.txt
- M — docs/qualification/beginner-pilot-content-review.md

## 37. 478bd7cc946a236dc9cb69f03c064326dad08a7a

fix(content): preserve Beginner response requirements and assessment evidence

- M — apps/api/test/beginner-pilot/qualify-content.test.ts
- M — apps/api/test/beginner-pilot/qualify-content.ts
- M — content/beginner/pilot/mg01-l1.lesson.txt
- M — content/beginner/pilot/mg01-l2.lesson.txt
- M — content/beginner/pilot/mg01-l3.lesson.txt
- M — content/beginner/pilot/mg01-l4.lesson.txt
- M — content/beginner/pilot/mg02-l1.lesson.txt
- M — content/beginner/pilot/mg02-l2.lesson.txt
- M — content/beginner/pilot/mg02-l3.lesson.txt
- M — content/beginner/pilot/mg02-l4.lesson.txt
- M — docs/qualification/beginner-pilot-content-review.md

## 38. 1673f2ca28266f001e7d1d14514976df8b91d628

docs(mandate): record Beginner offline qualification and remaining readiness gates

- A — mandate/reports/2026-10-27-beginner-r12b-verification.md

## 39. a168d487066e7681a8c64dce1480a05a595c87af

docs(mandate): capture independent Beginner audio review and rehearsal qualification gates

- A — docs/qualification/beginner-pilot-audio-inventory.json
- A — docs/superpowers/plans/2026-10-27-beginner-r12b-qualification.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261027-002-learning-content-produce-and-human-check-offline-mg01-mg02-audio-within-capped-provider.md
- A — mandate/items/MND-20261027-003-learning-content-obtain-qualified-human-beginner-pedagogical-sign-offs-and-exact-correc.md
- A — mandate/items/MND-20261027-004-learning-content-observe-consented-offline-beginner-pilot-timing-without-fabricated-pro.md
- A — mandate/reports/2026-10-27-beginner-r12b-gate-a-proposal.json
- A — mandate/reports/2026-10-27-beginner-r12b-gate-a-scope.json
- A — mandate/reports/2026-10-27-beginner-r12b-gate-b-proposal.json
- A — mandate/reports/2026-10-27-beginner-r12b-gate-b-scope.json
- A — mandate/reports/2026-10-27-beginner-r12b-gate-c-proposal.json
- A — mandate/reports/2026-10-27-beginner-r12b-gate-c-scope.json
- A — mandate/reports/2026-10-27-beginner-r12b-qualification-handoff.md
- A — mandate/reports/2026-10-27-beginner-r12b-qualification-preapproval-review.md
- A — mandate/reports/2026-10-27-beginner-r12b-qualification-triage.json

## 40. cad2d781d7fd3e29aa19ec7b13381c2309742415

docs(mandate): align Gate A with existing educational F0 East Asia resource

- A — docs/superpowers/plans/2026-10-27-beginner-r12b-gate-a-resource-alignment.md
- M — mandate/items/MND-20261027-002-learning-content-produce-and-human-check-offline-mg01-mg02-audio-within-capped-provider.md
- M — mandate/reports/2026-10-27-beginner-r12b-gate-a-proposal.json
- M — mandate/reports/2026-10-27-beginner-r12b-gate-a-scope.json
- M — mandate/reports/2026-10-27-beginner-r12b-qualification-handoff.md

## 41. 0ad2902514171b879b282f4f3ee5c82681d2b3ca

docs: record matching Gate A F0 execution approval

- M — mandate/INDEX.md
- M — mandate/items/MND-20261027-002-learning-content-produce-and-human-check-offline-mg01-mg02-audio-within-capped-provider.md
- A — mandate/reports/2026-10-27-beginner-r12b-gate-a-human-approval.md

## 42. 423bc561a3e1c7f26af2cb3b170bdc16adec559d

feat: guard offline Beginner F0 audio qualification

- A — docs/qualification/beginner-pilot-audio-qa.md
- A — mandate/reports/2026-10-27-beginner-r12b-gate-a-verification.md
- A — tools/beginner-pilot/audio-qualification.mjs
- A — tools/beginner-pilot/audio-qualification.test.mjs

## 43. c3c41e6e15d12e19deb6261a743b5d8cbd1f5771

docs: scope private Gate A storage correction and audio continuation

- A — docs/superpowers/plans/2026-10-27-beginner-gate-a-storage-amendment.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261027-005-infrastructure-correct-private-gate-a-storage-ownership-and-native-path-before-bounde.md
- A — mandate/reports/2026-10-27-beginner-gate-a-storage-capture.json
- A — mandate/reports/2026-10-27-beginner-gate-a-storage-review.md
- A — mandate/reports/2026-10-27-beginner-gate-a-storage-scope.json
- A — mandate/reports/2026-10-27-beginner-gate-a-storage-triage.json

## 44. 0c82547499eba0dd577fc265df590068f0dbbf74

docs: record matching private storage amendment approval

- M — mandate/INDEX.md
- M — mandate/items/MND-20261027-005-infrastructure-correct-private-gate-a-storage-ownership-and-native-path-before-bounde.md
- A — mandate/reports/2026-10-27-beginner-gate-a-storage-human-approval.md

## 45. 0613bd69dda194f007ee61d289a9600fc040b4f6

fix: verify private storage tree and dual audio authority

- M — docs/qualification/beginner-pilot-audio-qa.md
- A — mandate/reports/2026-10-27-beginner-gate-a-storage-verification.md
- M — tools/beginner-pilot/audio-qualification.mjs
- M — tools/beginner-pilot/audio-qualification.test.mjs

## 46. af2574aaad4588f36b5bb928471397250ea09577

fix: isolate Windows helper modules and verify native storage

- M — docs/qualification/beginner-pilot-audio-qa.md
- M — mandate/reports/2026-10-27-beginner-gate-a-storage-verification.md
- M — tools/beginner-pilot/audio-qualification.mjs
- M — tools/beginner-pilot/audio-qualification.test.mjs

## 47. 59124ec2ff412f197cc9762fd703bd71b25e3b51

docs: verify private storage and record real F0 pilot audio

- M — docs/qualification/beginner-pilot-audio-qa.md
- M — mandate/INDEX.md
- M — mandate/items/MND-20261027-005-infrastructure-correct-private-gate-a-storage-ownership-and-native-path-before-bounde.md
- M — mandate/reports/2026-10-27-beginner-gate-a-storage-verification.md

## 48. 180fbc71862f38f98322e9f2bfd35ed21d00ca4b

docs: retain accepted pilot QA and hold for international names

- M — docs/qualification/beginner-pilot-audio-qa.md
- M — mandate/reports/2026-10-27-beginner-gate-a-storage-verification.md

## 49. f6d7f5858166e49eec12e765bae446a75c029ab0

docs: plan international Beginner names with preserved audio history

- A — docs/superpowers/plans/2026-10-28-beginner-international-names.md
- A — mandate/reports/2026-10-28-beginner-international-names-preview.json
- A — mandate/reports/2026-10-28-beginner-international-names-review.md

## 50. bbd8a70086933c776df83e2c3af4d78483e49500

docs: capture exact international content revision scope

- M — mandate/INDEX.md
- A — mandate/items/MND-20261028-001-learning-content-internationalize-beginner-pilot-names-while-preserving-source-versions.md
- A — mandate/reports/2026-10-28-beginner-international-names-capture.json
- A — mandate/reports/2026-10-28-beginner-international-names-scope.json
- A — mandate/reports/2026-10-28-beginner-international-names-triage.json

## 51. 8af78a28e6c6a184f43561abe1ec47f62dbf369f

docs: retain immutable original Beginner audio inventory

- A — docs/qualification/beginner-pilot-audio-inventory-v1.json

## 52. 7fffee869da7d439e9cb433b5cdef9bfc9dc8c64

feat: use international names consistently in Beginner pilot

- A — apps/api/test/beginner-pilot/international-content.test.ts
- M — apps/api/test/beginner-pilot/qualify-content.test.ts
- M — content/beginner/pilot/mg01-l1.lesson.txt
- M — content/beginner/pilot/mg01-l2.lesson.txt
- M — content/beginner/pilot/mg01-l3.lesson.txt
- M — content/beginner/pilot/mg01-l4.lesson.txt
- M — content/beginner/pilot/mg02-l2.lesson.txt
- M — content/beginner/pilot/mg02-l3.lesson.txt
- M — content/beginner/pilot/mg02-l4.lesson.txt
- M — docs/qualification/beginner-pilot-audio-inventory.json
- A — docs/qualification/beginner-pilot-international-content-review.md

## 53. 188f2befb57b2f6d0a24b9903a508df4bb3eb517

fix: reconcile historical audio under exact content revision approval

- M — docs/qualification/beginner-pilot-audio-qa.md
- M — mandate/INDEX.md
- M — mandate/items/MND-20261028-001-learning-content-internationalize-beginner-pilot-names-while-preserving-source-versions.md
- A — mandate/reports/2026-10-28-beginner-international-names-human-approval.md
- A — mandate/reports/2026-10-28-beginner-international-names-verification.md
- M — tools/beginner-pilot/audio-qualification.mjs
- M — tools/beginner-pilot/audio-qualification.test.mjs

## 54. c740d9313cab7849a43246a2666c606d3372b159

test: isolate active authority fixtures from completed mandates

- M — tools/beginner-pilot/audio-qualification.test.mjs

## 55. 02aaea9ff0a1635f1c18637cd1a14cc1e5ef9126

docs: verify all24 international audio assets and close Gate A

- M — docs/qualification/beginner-pilot-audio-qa.md
- M — docs/qualification/beginner-pilot-international-content-review.md
- M — mandate/INDEX.md
- M — mandate/items/MND-20261027-002-learning-content-produce-and-human-check-offline-mg01-mg02-audio-within-capped-provider.md
- M — mandate/items/MND-20261028-001-learning-content-internationalize-beginner-pilot-names-while-preserving-source-versions.md
- M — mandate/reports/2026-10-28-beginner-international-names-verification.md

## 56. 3e57f70c3ab29e9a2cf66305771c4bc6e4f46ed8

docs: prepare exact-version teacher review packet for eight pilot lessons

- A — docs/qualification/beginner-pilot-correction-requests.md
- A — docs/qualification/beginner-pilot-gate-b-checklist.md
- A — docs/qualification/beginner-pilot-pedagogy-review.json
- A — mandate/reports/2026-10-28-beginner-gate-b-source-audio-snapshot.json

## 57. 65b57c7cfbb503704dcbe02af313f527c4c1b152

docs: amend existing Gate B scope for current source and private human evidence

- A — docs/superpowers/plans/2026-10-28-beginner-gate-b-review.md
- M — mandate/items/MND-20261027-003-learning-content-obtain-qualified-human-beginner-pedagogical-sign-offs-and-exact-correc.md
- M — mandate/reports/2026-10-27-beginner-r12b-gate-b-proposal.json
- M — mandate/reports/2026-10-27-beginner-r12b-gate-b-scope.json
- A — mandate/reports/2026-10-28-beginner-gate-b-preapproval.md
- A — mandate/reports/2026-10-28-beginner-gate-b-triage.json

## 58. ae70e47c8a8b04151d8dcd6dcf1b53fd20c8c675

docs: record Gate B approval and owner-attested reviewer intake

- M — docs/qualification/beginner-pilot-correction-requests.md
- M — docs/qualification/beginner-pilot-pedagogy-review.json
- M — mandate/INDEX.md
- M — mandate/items/MND-20261027-003-learning-content-obtain-qualified-human-beginner-pedagogical-sign-offs-and-exact-correc.md
- A — mandate/reports/2026-10-27-beginner-r12b-gate-b-human-approval.md
- A — mandate/reports/2026-10-27-beginner-r12b-gate-b-verification.md

## 59. 1b1f87a33ca26a6eef39d6db2f624597e3aad9c0

docs: record global reviewer claim and source-bound AI analysis

- M — docs/qualification/beginner-pilot-correction-requests.md
- M — docs/qualification/beginner-pilot-pedagogy-review.json
- A — docs/qualification/beginner-pilot-pedagogy-summary.md

## 60. 69b559e9475d08c67cb4920b13c8e0f034eabaf3

docs: add autonomous AI review and correction dispositions

- M — docs/qualification/beginner-pilot-correction-requests.md
- M — docs/qualification/beginner-pilot-pedagogy-review.json
- M — docs/qualification/beginner-pilot-pedagogy-summary.md

## 61. e7282c2b0341ed8c471ec3248fbc0b2f90b04adb

docs: capture and record exact Beginner successor approvals

- A — docs/superpowers/plans/2026-10-28-beginner-successor-ai-led-policy.md
- A — docs/superpowers/plans/2026-10-28-beginner-successor-content-corrections.md
- A — docs/superpowers/plans/2026-10-28-beginner-successor-evaluator-context.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261028-002-learning-content-correct-bounded-beginner-pilot-tasks-while-preserving-historical-sourc.md
- A — mandate/items/MND-20261028-003-architecture-verify-beginner-evaluator-task-context-loss-using-isolated-contract-te.md
- A — mandate/items/MND-20261028-004-architecture-establish-prospective-ai-led-beginner-qualification-without-rewriting.md
- A — mandate/reports/2026-10-28-beginner-successor-ai-led-policy-proposal.json
- A — mandate/reports/2026-10-28-beginner-successor-ai-led-policy-scope.json
- A — mandate/reports/2026-10-28-beginner-successor-content-corrections-proposal.json
- A — mandate/reports/2026-10-28-beginner-successor-content-corrections-scope.json
- A — mandate/reports/2026-10-28-beginner-successor-evaluator-context-proposal.json
- A — mandate/reports/2026-10-28-beginner-successor-evaluator-context-scope.json
- A — mandate/reports/2026-10-28-beginner-successors-approved-decision.json
- A — mandate/reports/2026-10-28-beginner-successors-capture-authorization.md
- A — mandate/reports/2026-10-28-beginner-successors-capture-verification.md
- A — mandate/reports/2026-10-28-beginner-successors-execution-approval.md
- A — mandate/reports/2026-10-28-beginner-successors-implementing-decision.json
- A — mandate/reports/2026-10-28-beginner-successors-triaged-decision.json

## 62. b93df5d8c1691777a08bc5d6212b6a7158eb8660

test: reproduce missing Beginner evaluator task context

- A — apps/api/src/teacher-ai/application/beginner-evaluator-context.spec.ts
- A — apps/api/test/beginner-evaluator-context.setup.ts
- A — apps/api/vitest.beginner-evaluator-context.config.ts
- A — docs/qualification/beginner-evaluator-context-verification.md

## 63. 5ad24bff6524e05c6856471eaca1821a9a85fdc9

fix(content): apply bounded Beginner pilot corrections and version bindings

- M — apps/api/test/beginner-pilot/international-content.test.ts
- M — apps/api/test/beginner-pilot/qualify-content.test.ts
- M — apps/web/src/features/learning-session/activity-renderers/writing-activity.test.tsx
- M — content/beginner/pilot/mg01-l1.lesson.txt
- M — content/beginner/pilot/mg01-l2.lesson.txt
- M — content/beginner/pilot/mg01-l3.lesson.txt
- M — content/beginner/pilot/mg01-l4.lesson.txt
- M — content/beginner/pilot/mg02-l1.lesson.txt
- M — content/beginner/pilot/mg02-l3.lesson.txt
- M — content/beginner/pilot/mg02-l4.lesson.txt
- A — docs/qualification/beginner-pilot-ai-correction-bindings.json
- A — docs/qualification/beginner-pilot-ai-correction-review.md

## 64. d77a0c0251bf553b6e0275b7f6cd2f8d6282c761

docs: implement prospective AI-led qualification with fresh bundle review

- A — docs/qualification/beginner-pilot-ai-led-correction-requests.md
- A — docs/qualification/beginner-pilot-ai-led-review.json
- A — docs/qualification/beginner-pilot-ai-led-summary.md

## 65. 9616e7b68746814affe72a5d5c60adde3e2cbba6

test: require dedicated isolated evaluator context configuration

- M — apps/api/src/teacher-ai/application/beginner-evaluator-context.spec.ts
- M — apps/api/vitest.beginner-evaluator-context.config.ts

## 66. cf24c8262fac9888be87cac2b5fbdae38256acba

docs: record actual Beginner successor verification and remaining gates

- A — mandate/reports/2026-10-28-beginner-successors-execution-verification.md

## 67. ffa475cb732742a4c945f6758160bf3884084698

fix(api): pass pinned Beginner context and guard evaluation cache replay

- M — apps/api/src/ai-gateway/domain/language-evaluation.port.ts
- M — apps/api/src/ai-gateway/infrastructure/openai-language-evaluation.adapter.ts
- M — apps/api/src/teacher-ai/application/beginner-evaluator-context.spec.ts
- M — apps/api/src/teacher-ai/application/evaluation.service.spec.ts
- M — apps/api/src/teacher-ai/application/evaluation.service.ts
- A — docs/qualification/beginner-evaluator-context-fix-verification.md
- A — docs/superpowers/plans/2026-10-29-beginner-evaluator-context-fix.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261029-001-bug-fix-missing-pinned-beginner-evaluator-facts-and-private-task-criteria.md
- A — mandate/reports/2026-10-29-beginner-evaluator-context-fix-approved-decision.json
- A — mandate/reports/2026-10-29-beginner-evaluator-context-fix-capture-authorization.md
- A — mandate/reports/2026-10-29-beginner-evaluator-context-fix-execution-approval.md
- A — mandate/reports/2026-10-29-beginner-evaluator-context-fix-implementing-decision.json
- A — mandate/reports/2026-10-29-beginner-evaluator-context-fix-proposal.json
- A — mandate/reports/2026-10-29-beginner-evaluator-context-fix-scope.json
- A — mandate/reports/2026-10-29-beginner-evaluator-context-fix-triaged-decision.json
- A — mandate/reports/2026-10-29-beginner-evaluator-context-fix-verified-decision.json

## 68. a4211bfdf01eccf489c3f152aca683028c0de4cd

test: bind beginner qualification to verified evaluator context

- A — apps/api/test/beginner-pilot/post-context-requalification.spec.ts
- A — apps/api/vitest.beginner-requalification.config.ts
- A — docs/qualification/beginner-pilot-post-context-requalification.json
- A — docs/qualification/beginner-pilot-post-context-requalification.md

## 69. 6c6036288b245467ec9ca06ef4ab63488e443c06

docs: preserve qualification capture and scoped execution authority

- A — docs/superpowers/plans/2026-10-29-beginner-post-context-requalification.md
- A — docs/superpowers/plans/2026-10-29-beginner-real-qualification.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261029-002-architecture-rebind-beginner-qualification-after-verified-context-fix-with-exact-so.md
- A — mandate/items/MND-20261029-003-architecture-measure-real-discovery-beginner-evaluator-calibration-with-bounded-fic.md
- A — mandate/items/MND-20261029-004-learning-content-obtain-independent-exact-asset-phonetic-and-authored-vocabulary-qualif.md
- A — mandate/reports/2026-10-29-beginner-post-context-requalification-capture-authorization.md
- A — mandate/reports/2026-10-29-beginner-post-context-requalification-proposal.json
- A — mandate/reports/2026-10-29-beginner-post-context-requalification-scope.json
- A — mandate/reports/2026-10-29-beginner-real-qualification-a-proposal.json
- A — mandate/reports/2026-10-29-beginner-real-qualification-a-scope.json
- A — mandate/reports/2026-10-29-beginner-real-qualification-audit.json
- A — mandate/reports/2026-10-29-beginner-real-qualification-audit.md
- A — mandate/reports/2026-10-29-beginner-real-qualification-b-proposal.json
- A — mandate/reports/2026-10-29-beginner-real-qualification-b-scope.json
- A — mandate/reports/2026-10-29-beginner-real-qualification-c-refresh-draft-proposal.json
- A — mandate/reports/2026-10-29-beginner-real-qualification-c-refresh-draft-scope.json
- A — mandate/reports/2026-10-29-beginner-real-qualification-oracle-preview.json

## 70. 9d16acfb925c23f2f1a4570e07c02fecafbcac76

test: prepare bounded Beginner evaluator calibration offline

- A — apps/api/test/beginner-pilot/provider-calibration.test.ts
- A — apps/api/test/beginner-pilot/provider-calibration.ts
- A — docs/qualification/beginner-pilot-provider-calibration-goldens.json
- A — docs/qualification/beginner-pilot-provider-calibration-results.json
- A — docs/qualification/beginner-pilot-provider-calibration-results.md

## 71. 747018a4c5c79104f90febef4a69973819c4170f

test: bind independent phonetic and vocabulary QA packet

- A — apps/api/test/beginner-pilot/independent-qa-pack.test.ts
- A — apps/api/test/beginner-pilot/independent-qa-pack.ts
- A — docs/qualification/beginner-pilot-independent-qa.html
- A — docs/qualification/beginner-pilot-independent-qa.json
- A — docs/qualification/beginner-pilot-independent-qa.md

## 72. ad4a5fe5383f2d80de962aabe7ae041c17f71fc0

test: validate calibration oracle and bounded scoring evidence

- M — apps/api/test/beginner-pilot/provider-calibration.test.ts
- M — apps/api/test/beginner-pilot/provider-calibration.ts
- M — docs/qualification/beginner-pilot-provider-calibration-results.md

## 73. 39b6e90688c38fa0ec9b04289d02e751e94639fd

test: validate and aggregate exact independent QA dispositions

- M — apps/api/test/beginner-pilot/independent-qa-pack.test.ts
- M — apps/api/test/beginner-pilot/independent-qa-pack.ts
- M — docs/qualification/beginner-pilot-independent-qa.html
- M — docs/qualification/beginner-pilot-independent-qa.md

## 74. 93683aae55469f10774bd70a9b5d42ddebca9fa8

docs: capture bounded autonomous qualification engineering umbrella

- A — docs/superpowers/plans/2026-10-29-beginner-qualification-engineering-umbrella.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261029-005-architecture-bound-autonomous-beginner-qualification-engineering-with-durable-accou.md
- A — mandate/reports/2026-10-29-beginner-engineering-umbrella-proposal.json
- A — mandate/reports/2026-10-29-beginner-engineering-umbrella-review.md
- A — mandate/reports/2026-10-29-beginner-engineering-umbrella-scope.json

## 75. bc34c55e18d3ddd70851ec80d14c968bdcb8e5db

test: persist qualification reservations across process crashes

- M — .gitignore
- A — apps/api/test/beginner-pilot/qualification-runtime.test.ts
- A — apps/api/test/beginner-pilot/qualification-runtime.ts
- A — docs/qualification/beginner-pilot-qualification-engineering.md
- M — mandate/INDEX.md
- M — mandate/items/MND-20261029-005-architecture-bound-autonomous-beginner-qualification-engineering-with-durable-accou.md

## 76. a7f749c88216d32a1141cfd11e43b08729681d6d

test: journal source-bound oracle and independent QA evidence

- M — apps/api/test/beginner-pilot/independent-qa-pack.test.ts
- M — apps/api/test/beginner-pilot/independent-qa-pack.ts
- M — apps/api/test/beginner-pilot/provider-calibration.test.ts
- M — apps/api/test/beginner-pilot/provider-calibration.ts
- M — docs/qualification/beginner-pilot-independent-qa.md
- A — docs/qualification/beginner-pilot-oracle-adjudication-template.json
- M — docs/qualification/beginner-pilot-provider-calibration-results.md

## 77. f1b481be0e890ec74284626f4d8c4f57ff4eb7e5

test: prepare synthetic rehearsal and isolated qualification regressions

- A — apps/api/test/beginner-pilot/qualification-governance.test.ts
- A — apps/api/test/beginner-pilot/qualification-vitest.config.ts
- A — apps/api/test/beginner-pilot/rehearsal-protocol.test.ts
- A — apps/api/test/beginner-pilot/rehearsal-protocol.ts
- A — docs/qualification/beginner-pilot-rehearsal-engineering.json
- A — docs/qualification/beginner-pilot-rehearsal-protocol.md

## 78. 708afdac7fca3ab8dddf7a11531dc95583e29e53

docs: record qualification checks and remaining evidence gates

- M — docs/qualification/beginner-pilot-qualification-engineering.md

## 79. 692fc11d3abd6b44072957bb1a53f63535756fe4

fix: reject skipped pilot and malformed qualification checkpoints

- M — apps/api/test/beginner-pilot/qualification-runtime.test.ts
- M — apps/api/test/beginner-pilot/qualification-runtime.ts
- M — docs/qualification/beginner-pilot-qualification-engineering.md

## 80. 93fe13a00ea143993f2b12e9f9256c1b19b39008

fix: validate qualification journal semantics on append and recovery

- M — apps/api/test/beginner-pilot/qualification-runtime.test.ts
- M — apps/api/test/beginner-pilot/qualification-runtime.ts

## 81. aee8695a547d31a1e159c9c9cfe9fbbeb60d6d69

fix: require fresh pricing within frozen calibration credit ceilings

- M — apps/api/test/beginner-pilot/provider-calibration.test.ts
- M — apps/api/test/beginner-pilot/provider-calibration.ts

## 82. 5b554e9cdce98daf11236265f38d8bec73f36b5e

docs: record qualification audit and actual release blockers

- M — docs/qualification/beginner-pilot-qualification-engineering.md

## 83. c36cf15e334def770402a3d9756f2d1d7244098d

docs(MND-20261030-001): bind autonomous mission to finite successor scope

- A — docs/superpowers/plans/2026-10-30-r12b-autonomous-completion.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261030-001-bug-preserve-admin-drafts-and-enable-read-only-audio-verification-with-bou.md
- A — mandate/reports/2026-10-30-r12b-mission-authorization.md
- A — mandate/reports/2026-10-30-r12b-mission-proposal.json
- A — mandate/reports/2026-10-30-r12b-mission-scope.json

## 84. ba6f40d3b50b752ddcf76c90f7656f38fcdd1686

fix(MND-20261030-001): preserve Admin drafts across edits and navigation

- M — apps/web/src/features/admin-beginner/beginner-lesson-editor.test.tsx
- M — apps/web/src/features/admin-beginner/beginner-lesson-editor.tsx
- M — apps/web/src/features/admin-beginner/beginner-workspace.test.tsx
- M — apps/web/src/features/admin-beginner/beginner-workspace.tsx
- A — apps/web/vitest.qualification.config.ts

## 85. 88d63792c1bbda984c060e5c0663701006c0731c

fix(MND-20261030-001): verify immutable audio without write or provider effects

- A — docs/qualification/beginner-r12b-qa-evidence.json
- A — docs/qualification/beginner-r12b-qa-evidence.md
- M — tools/beginner-pilot/audio-qualification.mjs
- M — tools/beginner-pilot/audio-qualification.test.mjs

## 86. 2dbe52e8f5984e75d571780ef227e29d032bb36d

fix(MND-20261030-002): anchor auth CSS selectors for production compilation

- A — apps/api/test/beginner-pilot/autonomous-governance.test.ts
- M — apps/web/src/features/auth/auth.module.css
- M — mandate/INDEX.md
- A — mandate/items/MND-20261030-002-bug-repair-authentication-css-module-pure-selectors-blocking-the-r12b-prod.md
- A — mandate/reports/2026-10-30-r12b-auth-css-proposal.json

## 87. 3f8e981a09854554e1af2e32c851ebd598b5851a

test(MND-20261030-001): exercise storage faults and isolate API regression

- A — apps/api/test/beginner-pilot/autonomous-vitest.config.ts
- M — apps/api/test/beginner-pilot/qualification-runtime.test.ts

## 88. 3088496b06389fccd6e4ec1eda6a6e9f82bafb86

docs(MND-20261030-001): prepare source-bound cost oracle and learner evidence

- A — docs/qualification/beginner-r12b-gate-c-readiness.md
- A — docs/qualification/beginner-r12b-oracle-proposals.json
- A — docs/qualification/beginner-r12b-provider-cost-analysis.json
- A — docs/qualification/beginner-r12b-provider-cost-analysis.md

## 89. 5590b946cab8c270d444a798753aaa501a2c41b8

fix(MND-20261030-001): reject mixed newline hash equivalence

- M — tools/beginner-pilot/audio-qualification.mjs
- M — tools/beginner-pilot/audio-qualification.test.mjs

## 90. a4685e7cd42d8dbbe949b9d5d1e8429d8bb1694c

docs(MND-20261030-001): close autonomous engineering with explicit release blockers

- M — docs/RELEASE_CHECKLIST.md
- A — docs/qualification/beginner-r12b-autonomous-final-report.md
- A — docs/qualification/beginner-r12b-commit-inventory.md
- A — docs/qualification/final-commit-audit.md
- M — docs/superpowers/plans/2026-10-30-r12b-autonomous-completion.md
- M — mandate/INDEX.md
- M — mandate/items/MND-20261030-001-bug-preserve-admin-drafts-and-enable-read-only-audio-verification-with-bou.md
- M — mandate/items/MND-20261030-002-bug-repair-authentication-css-module-pure-selectors-blocking-the-r12b-prod.md

## 91. 6b4ec5487c57966b8ce1abe5d425239d2f26f208

docs: authorize finite browser cost and Gate C engineering successor

- A — docs/superpowers/plans/2026-10-30-r12b-browser-cost.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261030-003-architecture-isolate-synthetic-browser-qualification-and-reduce-discovery-wire-cost.md
- A — mandate/reports/2026-10-30-r12b-browser-cost-authorization.md
- A — mandate/reports/2026-10-30-r12b-browser-cost-proposal.json
- A — mandate/reports/2026-10-30-r12b-browser-cost-scope.json

## 92. 2c975f84bf18d04e49ea8c3c4282a87a1ac86e94

perf: compact validated Beginner Discovery wire metadata

- M — apps/api/src/ai-gateway/infrastructure/discovery-language-evaluation.adapter.spec.ts
- M — apps/api/src/ai-gateway/infrastructure/discovery-language-evaluation.adapter.ts
- A — apps/api/test/beginner-pilot/cost-benchmark.test.ts
- A — apps/api/test/beginner-pilot/cost-benchmark.ts
- M — apps/api/test/beginner-pilot/provider-calibration.test.ts
- M — apps/api/test/beginner-pilot/provider-calibration.ts
- A — docs/qualification/beginner-r12b-cost-benchmark.json
- A — docs/qualification/beginner-r12b-cost-engineering-report.md

## 93. da703ac83113ea8873aa4694944616e8ff9e807e

feat: prepare consent gated Gate C timing and aggregate tools

- A — apps/api/test/beginner-pilot/gate-c-session.test.ts
- A — apps/api/test/beginner-pilot/gate-c-session.ts
- A — docs/qualification/beginner-r12b-gate-c-operator.md
- A — docs/qualification/beginner-r12b-gate-c-orchestration-report.md
- A — docs/qualification/beginner-r12b-gate-c-tooling-verification.json

## 94. 7188c8b66f02fd737154708e71ecd32851b3bd4a

test: isolate actual Beginner browser qualification frontend

- A — apps/api/test/beginner-pilot/browser-cost-governance.test.ts
- A — apps/api/test/beginner-pilot/browser-simulation.test-server.ts
- A — apps/api/test/beginner-pilot/browser-simulation.test.ts
- A — apps/api/test/beginner-pilot/browser-simulation.ts
- A — docs/qualification/beginner-r12b-browser-cost-final-review.md
- A — tools/beginner-pilot/browser-qualification.mjs

## 95. 3e120a81239e623209b3ba61889947e9a97cae86

docs: close synthetic browser and cost engineering qualification

- M — apps/api/test/beginner-pilot/browser-simulation.test-server.ts
- M — apps/api/test/beginner-pilot/browser-simulation.test.ts
- M — apps/api/test/beginner-pilot/browser-simulation.ts
- M — docs/qualification/beginner-r12b-browser-cost-final-review.md
- A — docs/qualification/beginner-r12b-browser-qualification-report.md
- A — docs/qualification/beginner-r12b-browser-results.json
- M — docs/qualification/beginner-r12b-cost-engineering-report.md
- M — docs/qualification/beginner-r12b-gate-c-orchestration-report.md
- A — docs/qualification/beginner-r12b-synthetic-personas.json
- M — docs/superpowers/plans/2026-10-30-r12b-browser-cost.md
- M — mandate/INDEX.md
- M — mandate/items/MND-20261030-003-architecture-isolate-synthetic-browser-qualification-and-reduce-discovery-wire-cost.md

## 96. b9a0149913337fa65e812f9f5cbc2e6ae8b67453

docs: authorize finite R12b external evidence closure

- A — docs/superpowers/plans/2026-10-30-r12b-evidence-closure.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261030-004-architecture-close-r12b-external-evidence-using-ai-and-isolated-qualification.md
- A — mandate/reports/2026-10-30-r12b-evidence-closure-authorization.md
- A — mandate/reports/2026-10-30-r12b-evidence-closure-proposal.json
- A — mandate/reports/2026-10-30-r12b-evidence-closure-scope.json

## 97. d33c0e7b847d5a788ffd3bcb469f7b9f7a5c073a

test: reconcile R12b decimal costs without permitting live spend

- A — apps/api/test/beginner-pilot/cost-accounting-final.test.ts
- A — apps/api/test/beginner-pilot/cost-accounting-final.ts
- A — docs/qualification/beginner-r12b-cost-accounting-final.json
- A — docs/qualification/beginner-r12b-cost-accounting-final.md

## 98. 5b50ecdbf5fe77a2424d6eabbc854da9741514b1

test: freeze 128 source-bound AI oracle decisions

- A — apps/api/test/beginner-pilot/oracle-adjudication.test.ts
- A — apps/api/test/beginner-pilot/oracle-adjudication.ts
- A — docs/qualification/beginner-r12b-oracle-adjudication-final.json

## 99. 0442e10c4882b4a89eba9ae844e44e3cb7912596

test: bind 82 QA dispositions to current source and audio

- A — apps/api/test/beginner-pilot/qa-evidence-closure.test.ts
- A — apps/api/test/beginner-pilot/qa-evidence-closure.ts
- A — docs/qualification/beginner-r12b-expert-qa-final.html
- A — docs/qualification/beginner-r12b-expert-qa-final.json
- A — docs/qualification/beginner-r12b-expert-qa-final.md

## 100. 3dd61bc5e8fea10a72b9f10bb6f98ce3bb695c6a

test: qualify isolated PostgreSQL and real Web session persistence

- A — apps/api/test/beginner-pilot/disposable-db.config.ts
- A — apps/api/test/beginner-pilot/disposable-db.integration.spec.ts
- A — apps/api/test/beginner-pilot/disposable-db.test.ts
- A — apps/api/test/beginner-pilot/disposable-db.ts
- A — docs/qualification/beginner-r12b-db-integration-report.md

## 101. 3d106def773b8e9157b49a294f6e935b264eff60

docs: bind eight R12b lessons and preserve external release gates

- A — apps/api/test/beginner-pilot/evidence-closure-governance.test.ts
- A — docs/qualification/beginner-r12b-deployment-readiness.md
- A — docs/qualification/beginner-r12b-gate-c-final-report.md
- A — docs/qualification/beginner-r12b-lesson-qualification-final.json
- A — docs/qualification/beginner-r12b-power-loss-verification.md

## 102. 81b08176d4b9e0382fb28a00c9c7a29f541cd0ae

docs: close R12b engineering with explicit external evidence blockers

- A — docs/qualification/beginner-r12b-evidence-closure-final-review.md
- A — docs/qualification/beginner-r12b-external-evidence-closure-report.md
- A — docs/qualification/beginner-r12b-final-commit-audit.md
- M — docs/superpowers/plans/2026-10-30-r12b-evidence-closure.md
- M — mandate/INDEX.md
- M — mandate/items/MND-20261030-004-architecture-close-r12b-external-evidence-using-ai-and-isolated-qualification.md

## 103. b08e96c2e12079d07d58b13b691a70f6f1627636

docs: reconcile the final R12b audit receipt and whitespace result

- M — docs/qualification/beginner-r12b-external-evidence-closure-report.md
- M — docs/qualification/beginner-r12b-final-commit-audit.md

## 104. bb7b81f79cb061663eae581a5e9c4cbf29a79f51

chore: authorize bounded BCD offline qualification

- A — docs/superpowers/plans/2026-10-30-r12b-bcd.md
- M — mandate/INDEX.md
- A — mandate/items/MND-20261030-005-architecture-complete-bcd-offline-speech-local-model-and-external-evidence-boundari.md
- A — mandate/reports/2026-10-30-r12b-bcd-authorization.md
- A — mandate/reports/2026-10-30-r12b-bcd-proposal.json
- A — mandate/reports/2026-10-30-r12b-bcd-scope.json

## 105. c1742812fd0a84df4d6ec8dc8e275d347888f92b

feat: execute source-bound offline speech qualification

- A — docs/qualification/beginner-r12b-bcd-offline-speech.json
- A — docs/qualification/beginner-r12b-bcd-offline-speech.md
- A — tools/qualification/beginner-r12b-offline-speech.ps1
- A — tools/qualification/beginner-r12b-offline-speech.test.ps1

## 106. 4efe92d4bc6e032fcb26aa7e6425e6e449558290

fix: reject contradictory Gate C evidence and bind sessions

- A — apps/api/test/beginner-pilot/gate-c-evidence-hardening.test.ts
- A — apps/api/test/beginner-pilot/gate-c-session-kit.test.ts
- A — apps/api/test/beginner-pilot/gate-c-session-kit.ts
- M — apps/api/test/beginner-pilot/gate-c-session.ts
- A — docs/qualification/beginner-r12b-gate-c-session-kit.json
- A — docs/qualification/beginner-r12b-gate-c-session-kit.md

## 107. 2aa3228e4718de37f60a16898883a8a085b3d630

feat: validate source-bound external expert submissions

- A — apps/api/test/beginner-pilot/external-expert-intake.test.ts
- A — apps/api/test/beginner-pilot/external-expert-intake.ts
- A — docs/qualification/beginner-r12b-external-review-template.json
- A — docs/qualification/beginner-r12b-external-review-template.md

## 108. 20c12c413e0dbd3f8eb78c288f7082b181e738d4

feat: execute zero-cost local calibration with retained failures

- A — apps/api/test/beginner-pilot/bcd-cost-options.test.ts
- A — apps/api/test/beginner-pilot/bcd-cost-options.ts
- A — apps/api/test/beginner-pilot/bcd-local-calibration.test.ts
- A — apps/api/test/beginner-pilot/bcd-local-calibration.ts
- A — docs/qualification/beginner-r12b-local-calibration.json
- A — docs/qualification/beginner-r12b-local-calibration.md
- A — docs/qualification/beginner-r12b-provider-options.json
- A — docs/qualification/beginner-r12b-provider-options.md

## Final self-relative BCD closure commit

The commit containing the completed plan, current005 lifecycle/INDEX, bcd-governance.test.ts and the four required final artifacts plus independent review is the final local audit unit. Resolve with: `git log -1 --format=%H -- docs/qualification/beginner-r12b-bcd-commit-inventory.md`. Its exact files are shown by `git show --name-status --format=fuller <resolved-sha>`. It is not included in its own SHA enumeration.

## Audit findings

Stable patch IDs: 0 duplicate groups. Known key/private-key signatures in full main..HEAD textual diff: 0/0/0. No new migration or production endpoint/config/package/lock change in the BCD delta. The only existing executable source change is the approved Gate C qualification harness. Existing application contracts remain unchanged.

The full net diff retains three approval-bound blank-EOF diagnostics from004; their bytes and approval hashes remain frozen. New/staged diff checks pass. Full semantic inspection of historical103 commits is attributed to retained audits, not falsely represented as a fresh review of every old generated line.
