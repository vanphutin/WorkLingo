# Speaker-aware dialogue audio

The user requests spoken dialogue without speaker labels, distinct stable voices per character, and male/female voices selected from explicit author metadata. This extends the authorized audio/dashboard work in its existing worktree. Continue autonomously; do not generate paid audio, mutate published lessons or replace active learner snapshots.

Author syntax inside existing CONTENT dialogue / AUDIO_SCRIPT text: `An (nam): Hello.` and `Lan (nữ): Hi.`; accept English `(male)` / `(female)` and case/Unicode-normalized Vietnamese. A declaration on a speaker's first turn applies to later bare-name turns. More than two distinct characters requires every character's gender; two unannotated legacy characters remain compatible, without guessing genders from names. Conflicting, empty or unsupported annotations are validation errors. Speaker labels remain in the transcript and never in synthesized text. Preserve speaker names spoken inside actual sentences.

Shared parser contract exported by @worklingo/content-format:
`type SpeakerGender = 'male' | 'female'`;
`DialogueSpeaker { id: string; name: string; gender: SpeakerGender | null }`;
`DialogueTurn { speaker: string | null; text: string }` (speaker is a normalized stable ID);
`DialogueScript { isDialogue: boolean; speakers: readonly DialogueSpeaker[]; turns: readonly DialogueTurn[]; issues: readonly {code: string; message: string}[] }`;
`parseDialogue(text: string, options?: { forceDialogue?: boolean }): DialogueScript`.
Conservative auto detection: two or more speaker labels, or explicit gender annotation; ordinary single-colon narration remains untouched unless forceDialogue is true. Continuation lines retain their speaker; preserve narration and punctuation. Detect ambiguous malformed headings rather than dropping text.

Browser playback uses actual available English voices only. Browser voices have no standard gender field: use explicit male/female markers and a documented small catalog of known Microsoft voices; unknown voice gender stays unknown. Assign explicitly gendered speakers first, then unspecified speakers, with distinct voice IDs. Never substitute the opposite/unknown gender for a declared gender. If insufficient matching/distinct enabled voices, show an actionable message. Keep each speaker's voice stable across turns and replay; the first compatible speaker may use a saved preference. One owner controls the complete turn queue; stop, navigation, unmount, restart and native-media replacement cancel the queue. Pause/resume, speed and volume apply throughout. Late callbacks cannot advance canceled playback.

Recover known speech errors before a turn starts using at most three distinct eligible voice attempts, preferring local voices and respecting other speakers' assignments/gender. Never replay earlier turns. Show actual browser error codes when recovery fails, and do not retry permission errors. Preserve this turn's preceding error-recovery regression tests.

Azure generation uses the same parser, one SSML request with ordered voice elements and escaped dialogue text. Use documented English male/female catalog choices; preserve configured default for narration. Validate scripts before network generation. Record actual speaker/voice assignments and version the generation configuration to avoid reusing old single-voice artifacts. Simulation must stay labeled simulation. Existing published audio remains immutable.

Update author scaffolds/help with the syntax and validation rule. Tests must cover legacy dialogue, repeated speakers, declarations, invalid labels, ordinary colon text, unique gender voice allocation, queue lifecycle, recovery, SSML escaping, and no external calls during verification.
