# IELTS Orientation — local Admin operation

1. Sign in as Content Admin and open `/admin/ielts-orientation`.
2. Edit the title, description and 3–20 slides. Every slide requires a stable kebab-case slug, body,
   and transcript. Knowledge checks require 2–6 options, one answer, and an explanation.
3. Optionally upload image or narration files. Images: PNG/JPEG/WebP/GIF. Audio:
   MP3/Ogg/WAV/WebM. Each file is limited to 20 MB and stored below `WORKLINGO_DATA_DIR`.
4. Save the draft, then validate. Resolve every path-addressed issue before publishing.
5. Publish once validation succeeds. Existing learners keep their pinned version; edits require a
   new validated publish. Archive removes the current release for new starts without mutating history.

Do not paste credentials, API keys, learner data, or unlicensed media into orientation content.
Transcript text is mandatory even when narration exists so captions and browser-speech fallback work.
