# Speaking evaluation specification

Status: IMPLEMENTED existing recording/STT integration extended with acoustic evidence and shared assessment admission. Actual provider audio calibration/accent qualification BLOCKED. HUMAN_VALIDATED: NOT_RUN.

Reuse Recording consent, owner access, object storage, checksum, retention and deletion markers. Existing transcription jobs call SpeechToTextPort/Microsoft Speech; detailed words/confidence/acoustic provider outputs must retain source identity. Assessment does not infer pronunciation from transcript correctness.

Local validateAssessmentAudio supports mono signed 16-bit little-endian PCM RIFF/WAVE, 8–48 kHz, at most 10 MiB and 100 ms–120 s. It validates chunk structure, lengths, encoding, checksum and at least 60 ms of active energy in 20 ms windows at RMS 0.01. This is an energy gate, not a speech classifier: tones/noise/music can pass. Unsupported compressed formats need actual existing decoding/provider support or explicit failure.

Required linguistic dimensions: task, meaning/relevance, grammar, vocabulary and communication. Pronunciation, intelligibility and fluency require verified nonsynthetic acoustic dimensions, matching recording checksum, duration and audio evidence timestamps. Missing mandatory acoustics returns NOT_SCORABLE with null total. Alignment, transcript confidence and word recognition alone cannot prove phoneme accuracy.

Available word/phoneme/syllable/stress/prosody evidence must be preserved when the provider actually supplies it. Unavailable dimensions stay unassessed. Accent scenarios are not observations and no reference accent should become a universal correctness requirement. Learner feedback exposes timestamps for audio playback only where retained, authorized source audio exists.

Deleted/requested-deletion/expired recordings are rejected at context admission; availability is rechecked under a Recording row lock held through fenced result persistence, serializing concurrent committed deletion. Historical result reads do not require currently available source audio. Source erasure and immutable audit retention remain a governance limitation requiring explicit policy. Synthetic benchmark cases have no actual recordings/checksums and cannot qualify Speaking.
