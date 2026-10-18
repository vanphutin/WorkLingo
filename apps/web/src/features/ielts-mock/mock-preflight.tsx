'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { ieltsMockMessages } from '../../i18n/messages/ieltsMock';

export function MockPreflight({ busy, strict, onStart, onCancel }: { readonly busy: boolean; readonly strict: boolean; readonly onStart: () => void; readonly onCancel: () => void }) {
  const t = useT('ieltsMock', ieltsMockMessages);
  const { locale } = useLocalePreference();
  const [sound, setSound] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [rules, setRules] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const checkSound = async () => {
    let context: AudioContext | undefined;
    try {
      context = new AudioContext(); await context.resume();
      const tone = context.createOscillator(); const gain = context.createGain(); gain.gain.value = 0.08;
      tone.connect(gain); gain.connect(context.destination); tone.start(); tone.stop(context.currentTime + 0.4);
      await new Promise<void>(resolve => { tone.onended = () => resolve(); });
      if (active.current) setSound(true);
    } catch (cause) { if (active.current) setError(cause); } finally { await context?.close(); }
  };
  const checkMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      if (active.current) setMicrophone(true);
    } catch (cause) { if (active.current) setError(cause); }
  };
  return <section className="bridge-stage-card" aria-labelledby="mock-preflight-title"><h2 id="mock-preflight-title">{t('preflight')}</h2>
    <p>{t(strict ? 'simulationRules' : 'practiceRules')}</p>
    <button type="button" disabled={busy} onClick={() => void checkSound()}>{t('checkAudio')}{sound ? ' ✓' : ''}</button>{' '}
    <button type="button" disabled={busy} onClick={() => void checkMicrophone()}>{t('checkMicrophone')}{microphone ? ' ✓' : ''}</button>
    {sound && microphone ? <p role="status">{t('equipmentReady')}</p> : null}
    <label><input type="checkbox" checked={rules} onChange={event => setRules(event.target.checked)} />{t('acceptRules')}</label>
    {error ? <p role="alert">{localizedError(error, locale)}</p> : null}
    <button type="button" disabled={busy || !sound || !microphone || !rules} onClick={onStart}>{t('confirmStart')}</button>{' '}
    <button type="button" disabled={busy} onClick={onCancel}>{t('cancelPreflight')}</button>
  </section>;
}
