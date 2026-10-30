# Beginner R1.2b technical QA evidence

Read-only measurements of all 24 current WAVs; 82 item status rows remain source-bound and professionally unadjudicated. No listening, provider request, private write or readiness change.

Packet SHA256: `95b6cda8e0eac8ac7c6875e298aace095d3041466a5bd7793068249d5c727a5f`. Duplicate WAV checksum groups: 0. All 24 hashes, script bindings, source bindings and PCM integrity checks passed.

Signal threshold: amplitude >0.01 full scale. Clipping threshold: absolute PCM sample >=32760. Silence/pace warnings require interpretation and do not establish phonetic quality. All professional evidence remains NEEDS_EVIDENCE; preserved Gate A owner sound QA is separate.

| Item | Duration s | Leading silence s | Trailing silence s | Internal silence s | Clipped samples | Warnings |
|---|---:|---:|---:|---:|---:|---|
| mg01-l1-audio-a | 6.118 | 0.201 | 1.034 | 1.180 | 0 | EDGE_SILENCE |
| mg01-l1-audio-b | 5.971 | 0.201 | 1.000 | 1.172 | 0 | EDGE_SILENCE |
| mg01-l1-audio-c | 6.473 | 0.186 | 1.016 | 1.180 | 0 | EDGE_SILENCE |
| mg01-l2-audio-1 | 7.044 | 0.201 | 0.980 | 1.167 | 0 | EDGE_SILENCE |
| mg01-l2-audio-2 | 6.370 | 0.201 | 1.013 | 1.156 | 0 | EDGE_SILENCE |
| mg01-l2-audio-3 | 6.002 | 0.201 | 1.033 | 1.162 | 0 | EDGE_SILENCE |
| mg01-l3-audio-1 | 8.710 | 0.202 | 1.013 | 1.157 | 0 | EDGE_SILENCE |
| mg01-l3-audio-2 | 6.074 | 0.201 | 0.980 | 1.162 | 0 | EDGE_SILENCE |
| mg01-l3-audio-3 | 9.368 | 0.200 | 1.032 | 1.162 | 0 | EDGE_SILENCE |
| mg01-l4-audio-1 | 7.118 | 0.203 | 1.032 | 1.159 | 0 | EDGE_SILENCE |
| mg01-l4-audio-2 | 6.103 | 0.201 | 0.980 | 1.163 | 0 | EDGE_SILENCE |
| mg01-l4-audio-3 | 9.280 | 0.201 | 1.032 | 1.172 | 0 | EDGE_SILENCE |
| mg02-l1-audio-1 | 7.532 | 0.201 | 1.008 | 1.150 | 0 | EDGE_SILENCE |
| mg02-l1-audio-2 | 7.633 | 0.203 | 1.029 | 1.156 | 0 | EDGE_SILENCE |
| mg02-l1-audio-3 | 7.179 | 0.200 | 1.025 | 1.179 | 0 | EDGE_SILENCE |
| mg02-l2-audio-1 | 7.618 | 0.202 | 1.029 | 1.156 | 0 | EDGE_SILENCE |
| mg02-l2-audio-2 | 7.591 | 0.202 | 1.008 | 1.161 | 0 | EDGE_SILENCE |
| mg02-l2-audio-3 | 7.574 | 0.201 | 1.025 | 1.157 | 0 | EDGE_SILENCE |
| mg02-l3-audio-1 | 7.250 | 0.202 | 1.026 | 1.181 | 0 | EDGE_SILENCE |
| mg02-l3-audio-2 | 7.002 | 0.200 | 1.028 | 1.167 | 0 | EDGE_SILENCE |
| mg02-l3-audio-3 | 7.841 | 0.202 | 1.023 | 1.159 | 0 | EDGE_SILENCE |
| mg02-l4-audio-1 | 7.282 | 0.186 | 1.034 | 1.174 | 0 | EDGE_SILENCE |
| mg02-l4-audio-2 | 7.046 | 0.203 | 1.025 | 1.169 | 0 | EDGE_SILENCE |
| mg02-l4-audio-3 | 7.530 | 0.203 | 1.028 | 1.155 | 0 | EDGE_SILENCE |

Full per-file hashes, source/script/request bindings and 82 individual status rows are in [JSON](beginner-r12b-qa-evidence.json).

Actual read-only command passed: 27 candidates, 24 current/selected, 3 historical, 27 prior calls, 4324 counted characters, USD0; contentReady=false. No new request or private write. Node audio suite: 60 passed.

The original transition failure reflects later authorized semantic source corrections, not newline differences alone. Verification independently checks current source against the exact successor baseline and extracts unchanged scripts; retained recordings keep their original whole-source/script/request provenance. JSON records old/current whole-source hashes separately. Only exact LF/CRLF representations match frozen raw hashes; content mutations remain rejected. Production and setup stay denied after Gate A closure.
