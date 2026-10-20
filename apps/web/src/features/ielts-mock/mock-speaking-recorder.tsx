'use client';

import type { IeltsMockAttemptDto, IeltsMockRecordingDto } from '@worklingo/contracts';
import { useEffect, useRef, useState } from 'react';
import { useAudioRecorder } from '../learning-session/use-audio-recorder';
import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { ieltsMockMessages } from '../../i18n/messages/ieltsMock';
import { ieltsMockClient } from '../../lib/api/ielts-mock-client';
import { normalizeRecordingWav } from './recording-wav';

export function MockSpeakingRecorder({ attemptId, part, paused, saved, onSaved }: { readonly attemptId: string; readonly part: IeltsMockAttemptDto['sectionContent']['speaking'][number]; readonly paused: boolean; readonly saved?: IeltsMockRecordingDto | undefined; readonly onSaved: (recording: IeltsMockRecordingDto) => void }) {
  const t = useT('ieltsMock', ieltsMockMessages);
  const { locale } = useLocalePreference();
  const recorder = useAudioRecorder();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const pending = useRef<{ blob: Blob; id: string } | null>(null);
  useEffect(() => {
    if (recorder.status !== 'recording') return;
    if (paused) { recorder.stop(); return; }
    const timer = window.setTimeout(recorder.stop, part.responseSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [recorder.status, recorder.stop, part.responseSeconds, paused]);
  const upload = async () => {
    if (!recorder.blob || !consent) return;
    if (pending.current?.blob !== recorder.blob) pending.current = { blob: recorder.blob, id: crypto.randomUUID() };
    setBusy(true); setError(null);
    try {
      const file = await normalizeRecordingWav(recorder.blob, part.responseSeconds);
      const form = new FormData(); form.set('audio', file, 'speaking.wav'); form.set('part', String(part.part)); form.set('clientRecordingId', pending.current.id); form.set('consent', 'true');
      onSaved(await ieltsMockClient.uploadRecording(attemptId, form)); recorder.discard();
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  };
  return <section><h3 lang="en">{part.title}</h3><ul lang="en">{part.prompts.map(prompt => <li key={prompt}>{prompt}</li>)}</ul><p>{t('recordingTime', { seconds: part.responseSeconds })}</p>
    {saved ? <><p role="status">{t('recordingSaved')}</p><audio controls preload="none" aria-label={t('recordedPart', { part: part.part })} src={`/api/v1/me/ielts-mocks/attempts/${attemptId}/recordings/${saved.id}/content`} /></> : <>
      <label><input type="checkbox" checked={consent} disabled={busy || recorder.status === 'recording'} onChange={event => setConsent(event.target.checked)} />{t('recordingConsent')}</label>
      {!recorder.supported ? <p role="alert">{t('recorderUnsupported')}</p> : null}
      <button type="button" disabled={!consent || paused || busy || !recorder.supported || ['recording', 'requesting'].includes(recorder.status)} onClick={() => void recorder.start()}>{t('recordAnswer')}</button>
      {recorder.status === 'recording' ? <button type="button" onClick={recorder.stop}>{t('stopRecording')}</button> : null}
      {recorder.previewUrl ? <><audio controls src={recorder.previewUrl} aria-label={t('previewRecording')} /><button type="button" disabled={busy} onClick={recorder.discard}>{t('discardRecording')}</button><button type="button" disabled={busy || paused || !consent} onClick={() => void upload()}>{t('uploadAnswer')}</button></> : null}
    </>}
    {recorder.error ? <p role="alert">{recorder.error}</p> : null}{error ? <p role="alert">{localizedError(error, locale)}</p> : null}
  </section>;
}
