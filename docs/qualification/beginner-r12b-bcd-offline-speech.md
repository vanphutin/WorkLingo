# Beginner R1.2b offline speech evidence

MND-20261030-005; reviewer WORKLINGO-AI-REVIEWER-001 (AI).
Actual attempts: 24/24; transcribed: 21; timeouts: 0. Human expert verification 0; phonetic verification 0. All 24 phonetic dispositions remain NEEDS_EVIDENCE.

Windows en-US MS-1033-80-DESK with unconstrained DictationGrammar; no script hints, microphone or cloud calls. Original WAVs remain unchanged. Derived PCM16 mono16k WAVs and per-item traces stay in approved private runtime. JSON binds each result to the exact script, source, bundle and original/derived audio SHA256 and pins engine/model files.

Per-child timeout: 12s; one process at a time, no retries. Child environment cleared and populated only with explicit Windows/temp paths. Adaptation is disabled before recognition; unsupported settings fail closed. Closed-set grammar is never used.

A timeout or recognition mismatch is not evidence of a defective recording. ASR cannot certify final consonants, stress, connected speech, noise, or intelligibility for Vietnamese adult beginners. Preserve the existing 82 reviewer decisions and obtain genuine independent auditory evidence.

| Item | Status | Last stage | Transcript |
|---|---|---|---|
| mg01-l1-audio-a | TRANSCRIBED | COMPLETE | Hello I am rarely I am from New York |
| mg01-l1-audio-b | TRANSCRIBED | COMPLETE | Hello I am jack I am from London |
| mg01-l1-audio-c | TRANSCRIBED | COMPLETE | Hello Sam I am Nola you are Sam |
| mg01-l2-audio-1 | TRANSCRIBED | COMPLETE | Hello I am and ED I am from Hong Kong |
| mg01-l2-audio-2 | TRANSCRIBED | COMPLETE | Hello temp I am cam your attempt |
| mg01-l2-audio-3 | TRANSCRIBED | COMPLETE | Hello I am am a I am from New York |
| mg01-l3-audio-1 | TRANSCRIBED | COMPLETE | Hello Adam I am Sam I am from London you are Adam |
| mg01-l3-audio-2 | TRANSCRIBED | COMPLETE | Hello I am a I am from Hong Kong |
| mg01-l3-audio-3 | TRANSCRIBED | COMPLETE | Hello Joe I am then you are from Los Angeles I am from New York |
| mg01-l4-audio-1 | TRANSCRIBED | COMPLETE | Hello camp I am Leo I am from Los Angeles |
| mg01-l4-audio-2 | TRANSCRIBED | COMPLETE | Hello I am Adam I am from Hong Kong |
| mg01-l4-audio-3 | TRANSCRIBED | COMPLETE | Hell out Eva I am Nola you are from London I am from Los Angeles |
| mg02-l1-audio-1 | ERROR | RECOGNIZE_FILE | Hello then two bucks please a bank please |
| mg02-l1-audio-2 | TRANSCRIBED | COMPLETE | Hello camp up and please two bags please |
| mg02-l1-audio-3 | TRANSCRIBED | COMPLETE | Hello Joe this is an array sir but but please |
| mg02-l2-audio-1 | ERROR | RECOGNIZE_FILE | Hello me a upend please two bags please |
| mg02-l2-audio-2 | TRANSCRIBED | COMPLETE | Hello Adam three bucks please a bank please |
| mg02-l2-audio-3 | TRANSCRIBED | COMPLETE | Hell out Eva two pence please unblock please |
| mg02-l3-audio-1 | ERROR | RECOGNIZE_FILE | Hello me a this is a bad two pence please |
| mg02-l3-audio-2 | TRANSCRIBED | COMPLETE | Hello Joe that is abut upend please |
| mg02-l3-audio-3 | TRANSCRIBED | COMPLETE | Hello Adam three bags please two bucks please |
| mg02-l4-audio-1 | TRANSCRIBED | COMPLETE | Hello Sam this is a pen three bucks please |
| mg02-l4-audio-2 | TRANSCRIBED | COMPLETE | Hello camp that is a bad bug but please |
| mg02-l4-audio-3 | TRANSCRIBED | COMPLETE | Hello may two bags please upend please |
Observed results: 24/24 contain transcript segments; 21 clean completions and 3 retained recognition errors after partial output. There are 3 exact normalized matches and 21 mismatch candidates. The three error items are mg02-l1-audio-1, mg02-l2-audio-1 and mg02-l3-audio-1; each later Recognize call reported no audio input. No retry was performed. Segment-local engine audio positions are not full-recording forced alignment.

Verification: guard suite observed RED 0 passed/7 failed before implementation; GREEN 7 passed/0 failed. All 24 original WAV SHA256 and 8 source SHA256 match pinned prior packet. No source, audio or historical disposition correction was made. Broader repository verification is coordinated by the parent BCD task.


Independent review found and coordinator fixed malformed trailing WAV bytes and stale trace reuse in future runs (each RED to GREEN; final guard suite9/9). Original24 results above were executed with runner SHA256 0dbf41c9d82ea0310d5f12293b49231ae34112d724e151c6fb49ff3664f77869. The final guards were applied retrospectively to retained evidence; ASR was not rerun and no new acoustic result is claimed. Final runner SHA256 58be79abf846a560da7f7d227e02c3cff48d42b446b6d68096a526439b109753.
