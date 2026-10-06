# WorkLingo Lesson Format 1.0

Format 1.0 is the plain-text authoring contract used by the local Content Admin pipeline:

```text
raw source -> parser/AST -> semantic validator -> preview -> immutable LessonVersion
```

The backend parser is authoritative. It preserves the submitted `rawSource` and returns stable diagnostics with exact source locations; the web editor does not parse a second copy of the format.

## Canonical template

```text
FORMAT: WorkLingoLesson/1.0

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

The items in order #8492 arrived damaged, and key accessories were missing.
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
Why did David write the email?

OPTIONS:
A. To ask for a discount
B. To report damaged items and missing accessories
C. To praise the support team

ANSWER:
B

EXPLANATION:
David reports both damaged items and missing accessories.

EVIDENCE:
complaint-email:3
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
A. A canceled-flight refund
B. A manager's help with a delayed order
C. Store opening hours

ANSWER:
B

EXPLANATION:
The customer asks to speak to a manager about the delayed order.
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
```

## Syntax rules

- The first non-empty line must be exactly `FORMAT: WorkLingoLesson/1.0`.
- Section and field names are ASCII and case-sensitive.
- Top-level sections are `LESSON`, `WORD_BANK`, `CONTENT`, `AUDIO_SCRIPT`, and `ACTIVITY`.
- `LANGUAGE_BLOCK` is valid only inside a `WORD_BANK` and uses double brackets.
- Every opening section except `LESSON` has a matching closing tag.
- Slugs use lowercase kebab-case. A slug identifies the item referenced by other sections.
- `<<<` and `>>>` delimit multiline `text` and `script` values. Each delimiter occupies its own line.
- Pipe-separated lists trim surrounding spaces and preserve order.
- LF and CRLF input are accepted. Unknown fields are errors; the parser never guesses or silently repairs input.

## Supported fields and enums

| Section | Fields |
|---|---|
| `LESSON` | `slug`, `title`, `level`, `duration_minutes`, `objective` |
| `WORD_BANK <slug>` | `title`; one or more nested `LANGUAGE_BLOCK` sections |
| `LANGUAGE_BLOCK <slug>` | required `expression`, `meaning_vi`; optional `pronunciation`, `collocations`, `grammar_pattern`; repeatable `example`, `common_error` |
| `CONTENT <slug>` | `type`, `text` |
| `AUDIO_SCRIPT <slug>` | optional `speaker`; required `script` |
| `ACTIVITY <slug>` | `learning_block`, `activity_type`, `response_type`, `skills`, optional `content_refs`, `language_block_refs`, `audio_ref`, `rubric`, `prompt`; structured `QUESTION`, `OPTIONS`, `ANSWER`, `EXPLANATION`, `EVIDENCE` blocks |

Supported enum values:

| Field | Values |
|---|---|
| `CONTENT.type` | `email`, `dialogue` |
| `learning_block` | `activate`, `read_decode`, `listen_reason`, `respond` |
| `activity_type` and `skills` | `reading`, `listening`, `speaking`, `writing` |
| `response_type` | `multiple_choice`, `short_text`, `shadowing` |

Additional semantic rules:

- A lesson must cover all four skills across its activities.
- Each activity's `skills` must include its own `activity_type`.
- `read_decode` accepts reading; `listen_reason` accepts listening; `respond` accepts speaking or writing.
- A listening activity must reference an existing `AUDIO_SCRIPT` through `audio_ref`.
- A multiple-choice activity needs at least two `A. Text` options and `ANSWER` must name one option label.
- `EVIDENCE` uses `content-slug` or `content-slug:line`. A supplied line must exist in that content block.
- The current implementation accepts at most 500,000 source characters, 200 sections, 50 activities, 10 options per activity, and 100 returned issues.

## Source locations and diagnostics

Every AST node and issue contains a half-open range:

```json
{
  "start": { "line": 12, "column": 1, "offset": 241 },
  "end": { "line": 12, "column": 18, "offset": 258 }
}
```

`line` and `column` are one-based. `offset` is zero-based in the original JavaScript string. `start` is inclusive and `end` is exclusive. These coordinates let the Admin UI focus the exact source location even when validation fails.

- `error` blocks publish. Parser errors use stable `PARSE_*` codes; semantic validation errors use `VAL_*` codes.
- `warning` does not block publish. Current warning codes use `WARN_*`, for example missing recommended explanation/evidence or unused content/language/audio.
- Diagnostics are returned in source order. If more than 100 are found, `issuesTruncated` is `true`.

Invalid example:

```text
FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: Broken_Lesson
title: Broken lesson
level: foundation
duration_minutes: 60
objective: Demonstrate invalid input.

[ACTIVITY listen-without-audio]
learning_block: listen_reason
activity_type: listening
response_type: multiple_choice
skills: listening

QUESTION:
What did you hear?

OPTIONS:
A. One
B. Two

ANSWER:
C
[/ACTIVITY]
```

This source fails because the lesson slug is not kebab-case, the answer label is missing, the listening activity has no `audio_ref`, and the complete lesson does not cover all four skills.

## Draft, audio, and publish lifecycle

The authoring state is `DRAFT -> VALIDATED -> PUBLISHED -> ARCHIVED`. Editing a valid draft returns it to `DRAFT`; published/archived imports and versions are read-only.

Validation is bound to both `draftRevision` and `sourceHash`. Publish succeeds only when:

1. the expected revision and hash still match;
2. the latest validation belongs to that same hash and has no errors;
3. each listening `audio_ref` has a `READY` artifact generated from the current script hash;
4. the idempotency key has not been reused with another request.

Fake TTS output is always labeled:

> Audio mô phỏng — chưa phải giọng đọc phát hành

Publishing creates a new immutable `LessonVersion`, archives the prior current version atomically, updates the lesson pointer, and records audit/idempotency data. Archiving the current version clears that pointer, so new sessions wait for another publish. A learner session keeps the `lessonVersionId` captured when that session was created, so publishing N+1 never changes a session already using N.

## Local Content Admin operation

1. Run `pnpm setup:local`. It creates the ignored root `.env` when necessary and replaces the example password placeholder with a generated local password.
2. Read `WORKLINGO_ADMIN_EMAIL` and `WORKLINGO_ADMIN_PASSWORD` from your local `.env`. Do not commit or paste those values into documentation.
3. Run `pnpm dev`, sign in at `/login`, then open `/admin/content`.
4. Create an import, paste Format 1.0 source, validate, preview, generate required fake audio, and publish.

The generated audio and other local artifacts stay under `WORKLINGO_DATA_DIR`; no cloud storage or live speech provider is used in Increment 2.
