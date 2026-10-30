# Source-bound reviewer workflow and content audit

24/24 WAV and 8/8 source hashes match the frozen QA template. Coverage: 24 audio, 41 lexical contexts, 11 IPA pairs, 6 support groups, 82 prior AI proposals preserved. Human expert verification 0; actual phonetic verification 0.

Open beginner-r12b-finalization-reviewer-workbench.html locally or through a loopback static server. It displays one item at a time with full authored context, exact hashes, distinct prior AI analysis and blank human fields. Choose the exact WAV for that item; SHA256 is checked locally before playback. Recipient ENG-REVIEWER-001 is never inserted into reviewer identity fields.

Drafts stay in memory only; navigation retains incomplete forms. Export before closing. Import merges exact matching decisions and refuses stale bindings or conflicts. Required rationale, evidence reference+SHA256, actual UTC time, reviewer provenance, confidence and limitations are validated. Audio PASS additionally requires verified playback and an explicit self-reported listening attestation. Imported audio PASS must be reverified before re-export. Exported JSON uses the unchanged external-expert-intake schema and full-template digest; validate privately with its existing CLI. Structural acceptance does not authenticate identity or promote readiness.

Three old ASR errors (mg02-l1-audio-1, mg02-l2-audio-1, mg02-l3-audio-1) retain transcript segments, then report no input on a later recognition call. They remain errors and audition candidates; no new recording is justified by ASR alone. The old attempts are not retried or relabeled.

Master library provenance remains missing: 41 authored-inline contexts have no accessible authorized snapshot or actual master entry IDs. Historical documentation describes A1-C1 imports, not C2 or Pre-A1 evidence. No ID, level or license is invented. IPA text checks do not certify stress, final consonants or actual auditory accuracy. Review the exact context and obtain genuine expert evidence.

UI: minimal high-contrast editorial workspace, native keyboard controls, wrapping hashes, local audio with no autoplay, responsive single-column layout, no external fonts/network/storage. Testing results are recorded by the coordinator. No genuine reviewer decision was entered during engineering verification.
