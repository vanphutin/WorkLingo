---
{
  "schema_version": 1,
  "id": "MND-20261030-007",
  "status": "implementing",
  "created": "2026-10-30",
  "updated": "2026-10-30T07:16:18.420Z",
  "title": "Preserve all eight activities when creating Beginner learner sessions",
  "type": "bug",
  "owner": "WorkLingo owner",
  "priority": "P1",
  "confidence": "high",
  "effort": "s",
  "impact": 4,
  "problem": "Actual isolatedP01learnerUIcreates45minuteBeginnerwithgenericplannerandonlyfouractivities: skipsreading2/3andlistening2/3. AvailabledurationgenericmayofferunsupportedBeginnerdurations.",
  "value": "Give actuallearners all eight authoredactivities in the exact45minutepinnedBeginnerplan while preservinglegacyplans.",
  "scope": [
    "Finiteallowlist: mandate/reports/2026-10-30-r12b-planner-fix-scope.json SHA256 e257779abff0ef01675abccbeb42a940b620721f88fb0d7c31d4643aa5376cc8.",
    "Dispatch learnercreation toexistingBeginnerplanner byexactformat; availabilityonly45 forvalidBeginner; preservelegacy/placement/IELTS andidempotency."
  ],
  "dedupe_key": "r12b:learner-session:generic-dispatch-drops-four-beginner-activities:36bab10",
  "evidence": [
    {
      "kind": "code",
      "reference": "apps/api/src/learning-sessions/application/session-creation.service.ts:72",
      "observation": "CallsplanFoundationSessionunconditionally instead ofexistingplanBeginnerSession."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/learning-sessions/domain/beginner-session-planner.ts:10",
      "observation": "Existingdedicatedboundaryselects3reading3listening1speaking1writing45minuteexactversion."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-30-r12b-planner-fix-authorization.md:1",
      "observation": "Actualcurrenthumanmissionauthorizesfixes fromrealbrowser; coordinatorverifiedspecificcurrentinstruction."
    }
  ],
  "acceptance": [
    "Testfirstall8sourceBeginnercreationretains8orderedIDsandexactversion45; actualpreviousfailureREDthenGREEN.",
    "AvailabledurationvalidBeginner45only; invalidsnapshot/durationrejectbeforepersistence, genericlegacyplacementIE LTSregressionsunchanged.",
    "Actualisolated3×8browserjourneys64assessedactivitieseachafterfix, failuresretained; no content/humangate change; lint/typecheck/build/review."
  ],
  "risk": {
    "level": "medium",
    "breaking": false,
    "data_change": false,
    "external_effect": false,
    "rollback": "Revert only scopedfourlocalproduction/testfiles; retain allfailedsessionreceipts; no sharedDB/historyrewrite."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-30-r12b-finalization.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner (direct current instruction)",
    "reference": "mandate/reports/2026-10-30-r12b-planner-fix-authorization.md:1",
    "at": "2026-10-30T07:16:17.772Z",
    "proposal_hash": "c02b4c2ad5190d7a7bdb8f9603d98f99b8febe889f8031c4ba4f7c0048bd2e5a"
  },
  "verification": [],
  "history": [
    {
      "at": "2026-10-30T07:16:16.468Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-30T07:16:17.125Z",
      "actor": "WorkLingo owner delegated coordinator",
      "from": "captured",
      "to": "triaged",
      "reason": "Confirmed actual P01 session drops4Beginneractivities; exact4filedependencyfix.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-30T07:16:17.772Z",
      "actor": "WorkLingo product owner (direct current instruction)",
      "from": "triaged",
      "to": "approved",
      "reason": "Actualautonomouslocalbrowserfixmission verified; finite4filescope restores authored8activitybehavior; no criteriaorcontentchange.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-30-r12b-planner-fix-authorization.md:1"
    },
    {
      "at": "2026-10-30T07:16:18.420Z",
      "actor": "WorkLingo owner delegated engineering coordinator",
      "from": "approved",
      "to": "implementing",
      "reason": "Execute linked finiteplan with disjointownership and testfirst; no routinedecisionquestion peractualhuman.",
      "event": "transition",
      "reference": null
    }
  ]
}
---

## Observed root cause

P01actual browser saw1of4activities and afterreading1 jumpedlistening1; E2Eexpectedreading2failed. SessionCreationServicecalls genericplanFoundationSession. DedicatedexactBeginnerplannerisalreadyused inAdminpreviewbutnotlearnercreation. Availabilitymustmatchactualsupported45minuteBeginnerplan, notgeneral45/60/90path.

## Scope

ExactallowlistSHAe257779abff0ef01675abccbeb42a940b620721f88fb0d7c31d4643aa5376cc8; fourfilesonly. Addtestbeforefix, dispatchformat-specificplanner, protectlegacyandinvaliddurationbeforewrite. Existing006additiveworkandindependentmodelpilotcontinue; nonewprovidercall/content/schemachange.

## Authority

Coordinatorverifiedactualhumanautonomousbrowser/fixrequest; fullmissionexplicitlyallowssafeintegrationfixesandlocalcommits. Doesnotwaiveexpert/realhuman/releasegates.
