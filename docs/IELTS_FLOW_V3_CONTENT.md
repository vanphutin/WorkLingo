# IELTS Flow V3 content

The catalogue is original fictional teaching material, authored for this project.
It is not copied IELTS examination content and has no external band calibration.

The twelve topic folders under `content/ielts/topics/` each contain a reviewable
WorkLingoLesson/1.1 source and a topic manifest. Together they contain 144 independent
IELTS chunks, Vietnamese meanings, pronunciation, collocations, examples and usage
errors. Each chunk appears in both a planning proposal and a different discussion.
Reading and listening questions cite exact source lines. Productive activities
include distinct model responses and observable rubrics. The real session planner
qualifies 90, 120 and 150 minutes; each response block includes speaking and writing.

`content/ielts/mocks/academic-02/` contains a new original Academic paper, its complete
Listening scripts, actual audio metadata and review status. There are 40 Listening
and 40 Reading questions, using gap fill, multiple choice and matching. Reading
passages contain 740, 738 and 732 words. Task 1 provides a fictional transport table;
Task 2 addresses public decisions and local participation. Speaking requires three
real consented recordings and teacher assessment before an overall estimate exists.

The four Listening files total approximately 1,790 seconds (29 minutes 50 seconds).
The timeline contains instructions and bounded question-linked reading/checking
windows; these are identified individually in `audio-manifest.json`. Speech uses
offline Microsoft David, Zira and Mark voices. Speaker names and gender select the
voice and are not spoken turn labels. The twelve topic discussions also have actual
offline speech files. No paid TTS, transcription or evaluation provider is needed to
prepare these files or persist Speaking answers.

Run `pnpm --filter @worklingo/api exec tsx scripts/prepare-ielts-flow-v3.ts` on Windows
with the named System.Speech voices installed to prepare files under the ignored
`content/ielts/.prepared/` directory. The preparer caches exact segment/rate inputs.
Checksums, byte sizes, parsed PCM durations, source hashes, transcript hashes and
voice provenance bind prepared files to their source. Actual-byte checks run during
release and V2 mock publication. Ordinary unit tests use the tracked manifest so a
clean checkout does not falsely require private generated files.

Independent content review found predictable topic option positions, misleading
recall wording, a missing Reading alternative, two preview boundaries, one unsupported
housing option and an overreaching Science task. These were corrected with regressions.
Model-supported application is explicitly described as guided practice, not retrieval.

**Qualification:** the project owner confirmed the four actual tracks in this
conversation: “Đã nghe kiểm tra, audio ổn”. `qualification.json` records that human
audition against the unchanged source fingerprint. Automated content/media checks
and independent text review are separate evidence. Consult the execution review
for the actual local publication and activation status.
The older short Beta paper remains unchanged and is not relabelled as a qualified
full simulation.

Format references checked on 2026-10-15: [Academic format](https://ielts.org/take-a-test/test-types/ielts-academic-test)
and [scoring guidance](https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail).
The product's 30/60/60/14 minute simulation policy is a local implementation choice;
it does not claim to reproduce every official administration condition.
