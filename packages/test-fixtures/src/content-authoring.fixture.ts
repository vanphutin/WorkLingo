export const canonicalLessonSource = `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: handling-customer-complaints
title: Handling Customer Complaints
level: foundation
duration_minutes: 60
objective: Understand and respond to a customer complaint effectively.

[WORD_BANK customer-service]
title: Customer Service

[[LANGUAGE_BLOCK apologize]]
expression: apologize
meaning_vi: xin lỗi
pronunciation: /əˈpɒlədʒaɪz/
collocations: sincerely apologize | apologize for the delay
grammar_pattern: apologize for + noun/V-ing
example: We sincerely apologize for the inconvenience.
example: Please apologize to the customer for the delay.
common_error: Do not use "apologize about the delay".
common_error: Remember that apologize is followed by for.
[[/LANGUAGE_BLOCK]]

[[LANGUAGE_BLOCK resolve-issue]]
expression: resolve the issue
meaning_vi: giải quyết vấn đề
pronunciation: /rɪˈzɒlv ði ˈɪʃuː/
collocations: quickly resolve | resolve the issue promptly
grammar_pattern: resolve + noun
example: Our team will resolve the issue today.
common_error: Do not say "solve the issue".
[[/LANGUAGE_BLOCK]]

[/WORD_BANK]

[CONTENT complaint-email]
type: email
text:
<<<
Dear Support Team,

I am writing to report a serious problem with my recent order #8492.
The items arrived damaged, and the package was missing key accessories.
Please contact me as soon as possible to resolve this issue.

Sincerely,
David Miller
>>>
[/CONTENT]

[AUDIO_SCRIPT complaint-call]
speaker: customer
script:
<<<
Hello, I am calling regarding my delayed order. I would like to speak to a manager to resolve this issue immediately.
>>>
[/AUDIO_SCRIPT]

[ACTIVITY activate-warmup]
learning_block: activate
activity_type: writing
response_type: short_text
skills: writing
language_block_refs: apologize

QUESTION:
Write a sentence to apologize to a customer for a delayed delivery.
[/ACTIVITY]

[ACTIVITY reading-comprehension]
learning_block: read_decode
activity_type: reading
response_type: multiple_choice
skills: reading
content_refs: complaint-email
language_block_refs: apologize | resolve-issue

QUESTION:
Why did David Miller write the email to the support team?

OPTIONS:
A. To ask for a discount on a new purchase
B. To report damaged items and missing accessories
C. To praise the customer service team

ANSWER:
B

EXPLANATION:
David states that his items arrived damaged and accessories were missing.

EVIDENCE:
complaint-email:4
[/ACTIVITY]

[ACTIVITY listening-comprehension]
learning_block: listen_reason
activity_type: listening
response_type: multiple_choice
skills: listening
audio_ref: complaint-call
language_block_refs: resolve-issue

QUESTION:
What is the caller requesting?

OPTIONS:
A. A refund for a canceled flight
B. To speak to a manager about a delayed order
C. Information about store operating hours

ANSWER:
B

EXPLANATION:
The customer asks to speak with a manager regarding a delayed order.
[/ACTIVITY]

[ACTIVITY speaking-practice]
learning_block: respond
activity_type: speaking
response_type: shadowing
skills: speaking
language_block_refs: apologize | resolve-issue

QUESTION:
Practice speaking: "We sincerely apologize for the delay and will resolve the issue immediately."
[/ACTIVITY]
`;

export const invalidLessonSources = {
  unsupportedFormat: `FORMAT: InvalidLesson/9.9

[LESSON]
slug: invalid-format
title: Invalid Format
level: foundation
duration_minutes: 60
objective: Test unsupported format.
`,

  missingFormatHeader: `[LESSON]
slug: missing-format
title: Missing Format Header
level: foundation
duration_minutes: 60
objective: Missing format header.
`,

  unclosedSection: `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: unclosed-section
title: Unclosed Section
level: foundation
duration_minutes: 60
objective: Test unclosed section.

[WORD_BANK unclosed-bank]
title: Unclosed Bank
`,

  mismatchedSection: `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: mismatched-section
title: Mismatched Section
level: foundation
duration_minutes: 60
objective: Test mismatched closing tag.

[CONTENT some-content]
type: email
text:
<<<
Hello
>>>
[/WORD_BANK]
`,

  unclosedMultiline: `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: unclosed-multiline
title: Unclosed Multiline
level: foundation
duration_minutes: 60
objective: Test unclosed multiline block.

[CONTENT email-doc]
type: email
text:
<<<
This multiline block never closes properly with >>>
[/CONTENT]
`,

  unknownField: `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: unknown-field
title: Unknown Field
unknown_key: unexpected value
level: foundation
duration_minutes: 60
objective: Test unknown field.
`,

  duplicateScalarField: `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: duplicate-field
title: First Title
title: Second Title
level: foundation
duration_minutes: 60
objective: Test duplicate scalar field.
`,

  invalidIdentifier: `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: INVALID_SLUG_UPPERCASE
title: Invalid Slug
level: foundation
duration_minutes: 60
objective: Test uppercase invalid identifier.
`,

  missingReference: `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: missing-ref
title: Missing Ref
level: foundation
duration_minutes: 60
objective: Test missing content and language block reference.

[ACTIVITY act-1]
learning_block: read_decode
activity_type: reading
response_type: multiple_choice
skills: reading
content_refs: non-existent-content
language_block_refs: non-existent-block

QUESTION:
Question?

OPTIONS:
A. Option 1
B. Option 2

ANSWER:
A
[/ACTIVITY]
`,

  invalidAnswer: `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: invalid-answer
title: Invalid Answer
level: foundation
duration_minutes: 60
objective: Test invalid answer option.

[ACTIVITY act-1]
learning_block: read_decode
activity_type: reading
response_type: multiple_choice
skills: reading

QUESTION:
Question?

OPTIONS:
A. Option 1
B. Option 2

ANSWER:
Z
[/ACTIVITY]
`,

  missingSkillCoverage: `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: missing-skill
title: Missing Skill Coverage
level: foundation
duration_minutes: 60
objective: Test missing speaking and listening coverage.

[ACTIVITY act-1]
learning_block: activate
activity_type: writing
response_type: short_text
skills: writing

QUESTION:
Warmup?
[/ACTIVITY]

[ACTIVITY act-2]
learning_block: read_decode
activity_type: reading
response_type: multiple_choice
skills: reading

QUESTION:
Question?

OPTIONS:
A. Option 1
B. Option 2

ANSWER:
A
[/ACTIVITY]
`,

  listeningWithoutAudio: `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: listening-no-audio
title: Listening Without Audio
level: foundation
duration_minutes: 60
objective: Test listening activity without audio ref.

[ACTIVITY act-listen]
learning_block: listen_reason
activity_type: listening
response_type: multiple_choice
skills: listening

QUESTION:
Listen?

OPTIONS:
A. 1
B. 2

ANSWER:
A
[/ACTIVITY]
`,

  staleAudioMetadata: `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: stale-audio
title: Stale Audio
level: foundation
duration_minutes: 60
objective: Test stale audio script.

[AUDIO_SCRIPT script-1]
speaker: customer
script:
<<<
Old script before modification.
>>>
[/AUDIO_SCRIPT]

[ACTIVITY act-listen]
learning_block: listen_reason
activity_type: listening
response_type: multiple_choice
skills: listening
audio_ref: script-1

QUESTION:
Listen?

OPTIONS:
A. 1
B. 2

ANSWER:
A
[/ACTIVITY]
`,
};
