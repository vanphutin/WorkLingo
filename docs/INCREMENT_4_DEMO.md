# Increment 4 Local Demo

## Start

1. Run `pnpm setup:local` and confirm PostgreSQL is healthy.
2. Keep fake providers selected and set `JOB_WORKER_ENABLED=true` in the ignored `.env`.
3. Run `pnpm dev`, then open `http://127.0.0.1:3000`.
4. Use Chrome or Edge over localhost and allow microphone access only when the Speaking activity asks.

No Microsoft or OpenAI credential is required for this demo. Fake STT, language evaluation and TTS are deterministic. Files stay under `WORKLINGO_DATA_DIR`.

## Learner journey

1. Register, start the 60-minute Foundation session and complete Activate, Reading and Listening.
2. In Speaking, choose **Record response**. WorkLingo does not request microphone access before this action.
3. Stop, review playback, re-record or discard if needed, then accept consent policy `recording-v1` and send.
4. Reload while Teacher AI is processing. The saved attempt remains visible and polling resumes.
5. Read the score dimensions, strengths, improvements and corrected example. If a retained recording is no longer wanted, choose **Delete recording now**; transcript and feedback remain.
6. In Writing, type a response, wait for **Đã lưu bản nháp**, reload to verify restoration, then submit and wait for feedback.

If browser recording is unsupported, the UI offers clearly unscored text practice. It never presents that fallback as a speaking score.

## Audio and TTS journey

1. Open `/settings/audio`, choose Browser voice, play the test sentence manually, save and reload.
2. Choose Automatic to prefer immutable lesson audio with Browser Speech as an explicit fallback.
   Published lesson audio never autoplays.
3. Sign in as Content Admin, open `/admin/settings/audio` and keep Simulation audio for an offline demo.
4. In lesson Preview, use Browser Speech without creating a file, generate a fake candidate, inspect
   its simulation label, select the READY candidate and publish.
5. Existing learner sessions remain bound to their previous LessonVersion/audio; new sessions can use
   the newly published binding. Admin and Learner media endpoints support authenticated byte ranges.

Azure AI Speech F0 is optional and not part of the offline demo. Configure it only in ignored backend
environment values described in [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md). To recover from quota,
credential or network failure, return Admin to `fake-tts` and learners to Automatic.

## Failure and retry

Provider failures never roll back the saved attempt or session checkpoint. Retryable terminal failures expose **Thử đánh giá lại**. Automatic retries keep the learner state `queued`; `evaluation_failed` is used only after the durable job exhausts its automatic attempts.

The deterministic 429 switch is E2E-only: it requires `NODE_ENV=test`, `WORKLINGO_E2E_MODE=true`, the fake language provider and `WORKLINGO_TEST_FAKE_EVALUATION_FAILURES`. Normal local/deployed configuration rejects this failure injection.

## Retention and storage

- Recording maximum: 10 MiB and 120 seconds by default.
- Terminal recording retention: seven days by default; early learner deletion is supported and idempotent.
- Writing draft retention: 30 days by default; successful submission deletes the draft.
- Generated audio and recordings use local object storage. The database stores metadata, provenance and immutable evaluation evidence.

Cleanup is implemented as the durable `RETENTION_CLEANUP` job handler. Increment 4 does not yet add a wall-clock scheduler; local operations must enqueue/run that job from an operator or future scheduler integration.

## Verification

```powershell
pnpm --filter @worklingo/api ai:calibrate
pnpm verify
```

`pnpm verify` requires PostgreSQL on `127.0.0.1:5432`, the seeded Content Admin credentials in the ignored `.env`, and Playwright Chromium. See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for setup and troubleshooting.
