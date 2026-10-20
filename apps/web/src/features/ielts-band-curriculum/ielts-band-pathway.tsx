'use client';

import type { IeltsBandPathwayDto } from '@worklingo/contracts';
import Link from 'next/link';
import { useT, useLocalePreference } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { formatNumber, type Translator } from '../../i18n/translator';
import type { UiLocale } from '../../i18n/locale';
import { ieltsBandMessages } from '../../i18n/messages/ieltsBand';
import { useEffect, useState } from 'react';
import { ieltsBandClient } from '../../lib/api/ielts-band-client';
import '../ielts-bridge/ielts-bridge.css';
import '../ielts-mock/exam-experience.css';
import './ielts-band-pathway.css';


// Only these server-generated criteria are UI copy. Unknown authored text stays intact.
function systemCriterion(value: string, t: Translator<typeof ieltsBandMessages>, locale: UiLocale): string | null {
  const sessions = /^Complete at least (\d+) integrated sessions\.$/u.exec(value);
  if (sessions) return t('criterionSessions', { count: formatNumber(locale, Number(sessions[1])) });
  const samples = /^Collect at least (\d+) evaluated (listening|reading|writing|speaking) samples\.$/u.exec(value);
  if (samples) return t('criterionSamples', { count: formatNumber(locale, Number(samples[1])), skill: t(samples[2] as 'listening' | 'reading' | 'writing' | 'speaking') });
  const rate = /^Reach (\d+)% recent correctness in (listening|reading|writing|speaking)\.$/u.exec(value);
  if (rate) return t('criterionRate', { rate: formatNumber(locale, Number(rate[1]) / 100, { style: 'percent', maximumFractionDigits: 0 }), skill: t(rate[2] as 'listening' | 'reading' | 'writing' | 'speaking') });
  return null;
}

function PathwayDetails({ journey, onChange }: { readonly journey: IeltsBandPathwayDto; readonly onChange: (journey: IeltsBandPathwayDto) => void }) {
  const t = useT('ieltsBand', ieltsBandMessages);
  const { locale } = useLocalePreference();
  const [target, setTarget] = useState(journey.targetBand); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  const run = async (work: () => Promise<IeltsBandPathwayDto>) => { setBusy(true); setError(null); try { onChange(await work()); } catch (cause) { setError(cause); } finally { setBusy(false); } };
  return <section className="bridge-stage-card band-pathway-card"><p className="bridge-kicker">{t('versionEvidence', { version: formatNumber(locale, journey.curriculumVersion) })}</p><h2 lang="en">{journey.currentStageTitle}</h2><div className="band-target"><strong>{t('target', { band: formatNumber(locale, journey.targetBand) })}</strong><span>{t('targetDisclaimer')}</span></div><div className="band-skill-grid">{journey.proficiency.map((item) => <article key={item.skill}><span>{t(item.skill)}</span><strong>{t(item.descriptor)}</strong><small>{t('samplesConfidence', { count: item.sampleCount, confidence: t(item.confidence) })}</small></article>)}</div><p><strong>{t('evidence')}</strong> {t('performance', { sessions: formatNumber(locale, journey.practicePerformance.completedSessions), blocks: formatNumber(locale, journey.practicePerformance.evaluatedBlocks) })}{journey.practicePerformance.recentCorrectRate === null ? '' : t('recentCorrectness', { rate: formatNumber(locale, journey.practicePerformance.recentCorrectRate, { style: 'percent', maximumFractionDigits: 0 }) })}</p>{journey.unmetCriteria.length > 0 ? <div><h3>{t('strengthen')}</h3><ul>{journey.unmetCriteria.map((criterion) => <li key={criterion}>{systemCriterion(criterion, t, locale) ?? <span lang="en">{criterion}</span>}</li>)}</ul></div> : null}{journey.remediation.length > 0 ? <div><h3>{t('remediation')}</h3><ul>{journey.remediation.map((item) => <li key={`${item.skill}-${item.title}`}><strong lang="en">{item.title}:</strong> <span lang="en">{item.action}</span></li>)}</ul></div> : null}<div><h3>{t('recommended')}</h3><ul>{journey.recommendedPracticeFormats.map((format) => <li key={format} lang="en">{format}</li>)}</ul></div>{error ? <p className="bridge-error" role="alert">{localizedError(error, locale)}</p> : null}<div className="band-actions"><label>{t('updateTargetLabel')}<select value={target} onChange={(event) => setTarget(Number(event.target.value))}>{[3, 4, 5, 6, 7, 8, 9].map((band) => <option key={band} value={band}>{t('band', { band: formatNumber(locale, band) })}</option>)}</select></label><button type="button" disabled={busy || target === journey.targetBand} onClick={() => void run(() => ieltsBandClient.updateTarget({ expectedRevision: journey.revision, targetBand: target }))}>{t('updateTarget')}</button><button className="bridge-primary" type="button" disabled={busy} onClick={() => void run(() => ieltsBandClient.evaluate({ expectedRevision: journey.revision }))}>{busy ? t('evaluating') : t('evaluate')}</button></div></section>;
}

export function IeltsBandPathway() {
  const t = useT('ieltsBand', ieltsBandMessages);
  const { locale } = useLocalePreference();
  const [availability, setAvailability] = useState<Awaited<ReturnType<typeof ieltsBandClient.availability>> | null>(null); const [journey, setJourney] = useState<IeltsBandPathwayDto | null>(null); const [target, setTarget] = useState(6); const [clientJourneyId] = useState(() => crypto.randomUUID()); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  useEffect(() => { void ieltsBandClient.availability().then((value) => { setAvailability(value); setJourney(value.journey); setTarget(value.journey?.targetBand ?? (value.targetBands.includes(6) ? 6 : value.targetBands[0] ?? 6)); }).catch((cause) => setError(cause)); }, []);
  if (!availability && !error) return <main className="bridge-shell exam-surface pathway-page bridge-state"><p role="status">{t('loading')}</p></main>;
  return <main className="bridge-shell exam-surface pathway-page"><header className="bridge-heading"><div><p className="bridge-kicker">{t('curriculum')}</p><h1>{t('title')}</h1><p>{t('description')}</p></div></header>{error ? <p className="bridge-error" role="alert">{localizedError(error, locale)}</p> : null}{availability && !availability.eligible ? <section className="bridge-stage-card"><h2>{t('locked')}</h2><p>{availability.lockedReason === 'BRIDGE_REQUIRED' ? t('bridgeRequired') : t('notPublished')}</p></section> : null}{availability?.eligible && journey ? <PathwayDetails journey={journey} onChange={setJourney} /> : null}{availability?.eligible && !journey ? <section className="bridge-stage-card"><h2>{t('destination')}</h2><p>{t('destinationDisclaimer')}</p><label className="band-select">{t('targetLabel')}<select value={target} onChange={(event) => setTarget(Number(event.target.value))}>{availability.targetBands.map((band) => <option key={band} value={band}>{t('band', { band: formatNumber(locale, band) })}</option>)}</select></label><button className="bridge-primary" type="button" disabled={busy} onClick={() => { setBusy(true); setError(null); void ieltsBandClient.start({ clientJourneyId, targetBand: target }).then(setJourney).catch((cause) => setError(cause)).finally(() => setBusy(false)); }}>{busy ? t('starting') : t('start')}</button></section> : null}</main>;
}

export function IeltsBandDashboardCard() {
  const t = useT('ieltsBand', ieltsBandMessages);
  const { locale } = useLocalePreference();
  const [availability, setAvailability] = useState<Awaited<ReturnType<typeof ieltsBandClient.availability>> | null>(null); const [failed, setFailed] = useState<unknown>(null);
  useEffect(() => { void ieltsBandClient.availability().then(setAvailability).catch(setFailed); }, []);
  return <section className="dashboard-card" aria-labelledby="band-pathway-heading"><span className="card-tag">{t('progression')}</span><h2 id="band-pathway-heading" className="section-title">{t('dashboardTitle')}</h2>{!availability && !failed ? <p role="status">{t('checking')}</p> : null}{failed ? <p className="form-error">{localizedError(failed, locale)}</p> : null}{availability?.eligible ? <><p>{availability.journey ? <><span lang="en">{availability.journey.currentStageTitle}</span> · {t('target', { band: formatNumber(locale, availability.journey.targetBand) })}</> : t('chooseDescription')}</p><Link className="primary-action-button" href="/ielts/pathway">{availability.journey ? t('continue') : t('startPathway')}</Link></> : null}{availability && !availability.eligible ? <p>{t(availability.lockedReason === 'CURRICULUM_NOT_PUBLISHED' ? 'notPublished' : 'unlock')}</p> : null}</section>;
}
