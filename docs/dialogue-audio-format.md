# Dialogue audio author format

Write speaker declarations inside the existing `CONTENT` text (`type: dialogue`)
or `AUDIO_SCRIPT` script block. No new storage fields or database migration are
needed. The original transcript, including labels, stays unchanged.

```text
[AUDIO_SCRIPT visitor-call]
script:
<<<
An (nam): Hello, Linh. Can you help our visitor?
Linh (nữ): Yes, An. Please ask them to wait here.
An: Thank you. I will tell them.
>>>
[/AUDIO_SCRIPT]
```

Use `(nam)` / `(nữ)` or `(male)` / `(female)`. Case and Unicode composition are
normalized, so `(NAM)`, `(Female)` and decomposed `nữ` work. Whitespace around the
annotation and before the colon is allowed: `An (nam) : Hello.` A declaration
applies to that speaker's later bare-name turns. Keep each character's name
consistent; name matching normalizes Unicode, letter case and whitespace.

Every character needs an explicit gender when there are **more than two distinct
characters**, including characters introduced without an annotation. Repeating
the same gender is valid; conflicting, empty or unsupported annotations block
publication and playback. Put each speaker's declaration on their first turn.

Existing two-character lessons such as `An: Hello.` / `Linh: Hi.` remain valid.
Playback can assign two distinct available voices, but both characters' genders
remain **unknown** (`null`). Those assignments do not guarantee correct gender.
Add explicit annotations for gender matching. Names, pronouns and the legacy
section-level `speaker:` field do not cause the parser to infer gender.

Only the label at the start of a turn is removed from its speech text. In
`An (male): Hello, Linh!`, the spoken text remains `Hello, Linh!`; names inside
sentences and punctuation are preserved.

## Continuations, narration and detection

An unlabelled line continues the previous speaker's turn. Blank lines within a
turn are preserved. A heading may have its utterance on the next line; a turn
with no utterance at all is invalid.

Text before the first speaker is narration. To distinguish narration between
turns from a continuation, use a standalone bracketed direction such as
`[The visitor enters.]`, a balanced parenthetical direction without a colon such
as `(The visitor enters.)`, or a `Narrator:` / `Narration:` line. These are retained
verbatim with `speaker: null`, and subsequent unlabelled lines remain narration
until the next speaker label. The caller decides how to render or voice narration.

Automatic detection requires at least two recognizable speaker labels (including
repeated labels for one speaker), or an explicit annotation. A clearly malformed
label or annotation attempt is also reported rather than silently spoken. A lone bare
label, such as `An: Hello.`, stays ordinary text in automatic mode. Known dialogue
contexts use `{ forceDialogue: true }`; author validation does so for `CONTENT`
with `type: dialogue`, while `AUDIO_SCRIPT` uses automatic detection.

Bare labels are short names or roles: one word, or up to four title-cased words,
with letters, digits after a leading letter, apostrophes, periods and hyphens.
An explicit annotation also permits longer names. Names already recognized
elsewhere in the script also match other letter cases and later bare labels.
Common prose headings (`Note:`, `Reminder:`, `Subject:`, `From:`, `To:`, etc.),
URLs, times and sentence-like colon prefixes are not character labels. Ordinary
single-colon prose is returned unchanged. Use clear labels and explicit
declarations to avoid ambiguity between a character and a prose heading.

## Shared consumer interface

`@worklingo/content-format` exports:

```ts
type SpeakerGender = 'male' | 'female';
interface DialogueSpeaker { id: string; name: string; gender: SpeakerGender | null }
interface DialogueTurn { speaker: string | null; text: string }
interface DialogueScript {
  isDialogue: boolean;
  speakers: readonly DialogueSpeaker[];
  turns: readonly DialogueTurn[];
  issues: readonly { code: string; message: string }[];
}
parseDialogue(text: string, options?: { forceDialogue?: boolean }): DialogueScript;
```

Speaker IDs are Unicode NFKC-normalized, whitespace-collapsed, lowercase name
strings. Speaker order follows first appearance; `name` keeps the normalized
first spelling for display. `turn.speaker` is the ID string, never a speaker
object or array index. `null` means narration. Ordinary text has no speakers and
one narration turn containing the exact input (empty input has no turns).
Dialogue line endings become `\n` and surrounding turn whitespace is trimmed.

**Check `issues` before consuming any turns for speech or synthesis.** Invalid
headings remain in diagnostic turns to prevent text loss; they are not safe
speech output. Reject the entire invalid script before speech or network calls.
The parser does not select voices, escape SSML/XML, perform I/O or modify content.

| Code | Author correction |
| --- | --- |
| `DIALOGUE_INVALID_LABEL` | Use a nonempty name and balanced parentheses followed by one colon. |
| `DIALOGUE_INVALID_GENDER` | Use a nonempty `nam`, `nữ`, `male` or `female` annotation. |
| `DIALOGUE_CONFLICTING_GENDER` | Give the same character one consistent gender. |
| `DIALOGUE_EMPTY_TURN` | Add an utterance on this or a following continuation line. |
| `DIALOGUE_MISSING_GENDER` | Declare the gender of every character in a script with more than two characters. |

Author validation exposes these codes with severity `error`, the owning section's
source range and `content.<slug>.text` or `audio_script.<slug>.script` as the path.
Parser messages use line numbers relative to the supplied dialogue text; the
shared issue contract contains only `code` and `message`. Existing lesson AST and
normalized transcript shapes are unchanged.

## Voice selection and publication

Browser playback reserves one distinct enabled English voice per character.
Declared genders take precedence over the learner's saved voice; that preference
applies to the first compatible character only. Replay preserves surviving
assignments and successful recovery voices. A missing voice does not reassign
other characters. A failed turn may try up to three compatible voices before it
starts; playback never restarts earlier turns automatically.

The browser catalog recognizes explicit Male/Female voice names and a small set
of known Windows/Azure English voices. Other voice genders remain unknown. A
missing compatible voice or too few distinct voices produces a visible error.
The browser never invents voices or changes pitch to impersonate a different
gender. [Web Speech voice metadata](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice)
does not include a standardized gender property.

Azure generation uses ordered escaped `voice` elements in one SSML request, as
supported by [Azure SSML](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice).
The built-in English catalog contains Guy/Davis/Tony (male) and Jenny/Aria/Sara
(female); generation rejects requests exceeding distinct compatible capacity.
The output records actual speaker/voice assignments and `azure-dialogue-v1` in
generation configuration. Catalog gender references come from Microsoft's
[voice support table](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=text-to-speech).

Existing published audio and frozen learner versions remain unchanged. To add
gender metadata or replace an existing recording, edit the source, validate it,
generate/review a new candidate and publish a new version through the existing
authoring workflow. The authored customer-visit seed now declares An (nam) and
Linh (nữ); existing local database snapshots were not rewritten.
