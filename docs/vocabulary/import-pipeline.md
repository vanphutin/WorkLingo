# Import pipeline and operational handoff

Acquire → validate source → parse layout → detect topics → extract rows →
normalize → reconcile → review → publish. See api-boundary.md for exact endpoints
and packages/contracts/src/vocabulary-library.contracts.ts for input schemas.

1. Keep the source PENDING until explicit permission scope/reference is recorded.
   Document authorization separately from synthetic development fixture rights.
2. Acquire an authorized file outside Git. Compute its SHA-256 and measured page
   count. Register immutable document metadata; never substitute reference pages.
3. Use scripts/vocabulary/extract_pdf.py with its authorization arguments to obtain
   native geometry. Feed geometry through parseVocabularyLayout. OCR-only or
   unknown pages remain explicit exceptions requiring independent inspection.
   Convert an authorized native-geometry file into a new manifest (never overwrites
   an existing output file):

   ```powershell
   pnpm --filter @worklingo/api exec tsx src/vocabulary-operations/cli.ts parse-layout path/to/layout.json path/to/manifest.json
   ```

   Exit 2 preserves the manifest and reports exceptions/incompleteness; it does not
   authorize staging. Inspect the exception locations and reconcile the source.
4. Validate/dry-run the manifest CLI. Retain per-page inventory and all unresolved
   fragments. Compare geometry enumeration to parsed rows; inspect high-risk
   rendered pages and manually reconcile all legitimate rows.
5. POST batches with documentId, parserVersion and the complete independent
   inventory. Metadata may register as BLOCKED_BY_RIGHTS without storing content.
6. POST stage chunks (maximum 250 rows) with current revision. Persist checkpoint
   and batch ID; resume using the same document/parser identity. Identical retries
   are safe; changed source payload/inventory is a conflict, not an update.
7. GET the paginated batch rows. Explicitly review every occurrence to an eligible
   existing sense or create an appropriate entry/sense. Rejections require a
   documented non-vocabulary reason; uncertain legitimate entries stay unresolved.
8. Publish only after every page/key reconciles, exceptions are resolved, rights
   remain approved, and human review is complete. Publication atomically freezes
   ordered membership. No automatic program assignment occurs.
9. Assign approved collection members to real program IDs with rationale. Bind a
   specific published collection version to the intended curriculum target.
10. Rollback retires visibility/archives a snapshot; it does not delete provenance,
    members, legacy identities or learner records. Corrected content uses a new
    document/parser/collection version as appropriate.

No operational command in this feature runs production migrations or restores
the application DB. Use the existing backup/restore tooling in a separate empty
target before any later rollout. Deploy, production migration and publication of
third-party content require separate authorization.
