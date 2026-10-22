'use client';
import { cloneElement, useEffect, useId, useState, type ReactElement } from 'react';
import { ZodError } from 'zod';
import { useLocalePreference, useT } from '../../i18n/provider';
import { adminVocabularyMessages } from '../../i18n/messages/adminVocabulary';
import { localizedError } from '../../i18n/errors';
import { ApiError } from '../../lib/api/api-client';

export const useVocabularyT = () => useT('adminVocabulary', adminVocabularyMessages);
export function useLoad<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ loading: true });
    void loader().then(data => { if (active) setState({ data, loading: false }); }, error => { if (active) setState({ error, loading: false }); });
    return () => { active = false; };
  }, [loader, attempt]);
  return { ...state, refresh: () => setAttempt(value => value + 1) };
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError(undefined); setSaved(false);
    try { await action(); setSaved(true); } catch (failure) { setError(failure); } finally { setBusy(false); }
  }
  return { busy, error, saved, run };
}
export function ErrorNotice({ error }: { error: unknown }) {
  const t = useVocabularyT(); const { locale } = useLocalePreference();
  const text = error instanceof ZodError ? t('invalidInput') : error instanceof ApiError && error.code === 'BLOCKED_BY_RIGHTS' ? t('blocked') : error instanceof ApiError && error.code === 'VOCABULARY_STALE' ? t('stale') : error instanceof Error && error.message === 'VOCABULARY_INCOMPLETE' ? t('invalidManifest') : localizedError(error, locale);
  return <p className="admin-error-state" role="alert">{text}</p>;
}
export function ActionFeedback({ action }: { action: ReturnType<typeof useAction> }) { const t = useVocabularyT(); return <>{action.error ? <ErrorNotice error={action.error} /> : null}{action.busy ? <p role="status">{t('loading')}</p> : action.saved ? <p role="status">{t('saved')}</p> : null}</>; }
export function LoadFeedback({ state }: { state: { loading: boolean; error?: unknown; refresh: () => void } }) {
  const t = useVocabularyT(); return <>{state.loading ? <p role="status">{t('loading')}</p> : null}{state.error ? <div><ErrorNotice error={state.error} /><button type="button" onClick={state.refresh}>{t('retry')}</button></div> : null}</>;
}
export function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  return <div className="vocab-field"><label htmlFor={id}>{label}</label>{cloneElement(children, { id })}</div>;
}
export function Pager({ page, total, limit = 25, change, busy = false }: { page: number; total: number; limit?: number; change: (page: number) => void; busy?: boolean }) {
  const t = useVocabularyT(); return <div className="vocab-pager"><button type="button" disabled={busy || page <= 1} onClick={() => change(page - 1)}>{t('previous')}</button><span aria-live="polite">{t('page', { page, total })}</span><button type="button" disabled={busy || page * limit >= total} onClick={() => change(page + 1)}>{t('next')}</button></div>;
}
export function Status({ status }: { status: keyof typeof adminVocabularyMessages.en }) { const t = useVocabularyT(); return <span className="admin-context-status" data-status={status}>{t(status)}</span>; }
export const formText = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
