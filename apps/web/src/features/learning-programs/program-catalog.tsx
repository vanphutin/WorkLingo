'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { programsMessages } from '../../i18n/messages/programs';
import { localizedError } from '../../i18n/errors';
import { formatNumber, translate } from '../../i18n/translator';
import type { UiLocale } from '../../i18n/locale';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type {
  LearningProgramCatalogDto,
  LearningProgramCatalogItemDto,
  LearningProgramAvailabilityStatusDto,
  LearningProgramIconKeyDto,
  ProgramContextDto,
} from '@worklingo/contracts';

import { learningProgramClient } from '../../lib/api/learning-program-client';
import { ApiError } from '../../lib/api/api-client';
import './program-catalog.css';

const statusKeys = {
  AVAILABLE: 'available', BETA: 'beta', COMING_SOON: 'comingSoon', DISABLED: 'disabled', IN_DEVELOPMENT: 'inDevelopment',
} as const satisfies Record<LearningProgramAvailabilityStatusDto, keyof typeof programsMessages.en>;

// These are product discovery labels, not lesson content. Retain unknown authored copy.
function programText(value: string, locale: UiLocale): string {
  const key = (Object.keys(programsMessages.en) as (keyof typeof programsMessages.en)[])
    .find((key) => programsMessages.en[key] === value);
  return key ? translate(locale, 'programs', programsMessages)(key) : value;
}

const ICON_LABELS: Readonly<Record<LearningProgramIconKeyDto, string>> = {
  beginner: 'A',
  intermediate: 'B',
  toeic: 'T',
  ielts: 'I',
};

function ProgramIcon({ iconKey }: { readonly iconKey: LearningProgramIconKeyDto }) {
  return (
    <span className={`program-icon program-icon-${iconKey}`} aria-hidden="true">
      {ICON_LABELS[iconKey]}
    </span>
  );
}

function ProgramAction({ program, pending, onActivate }: {
  readonly program: LearningProgramCatalogItemDto;
  readonly pending: boolean;
  readonly onActivate: () => void;
}) {
  const t = useT('programs', programsMessages);
  const { locale } = useLocalePreference();
  if (program.isSelectable && program.destination) {
    return (
      <button
        type="button"
        className="program-action program-action-primary"
        onClick={onActivate}
        disabled={pending}
        aria-label={t('openAria', { name: programText(program.name, locale) })}
      >
        {t('continue', { name: programText(program.name, locale) })}
      </button>
    );
  }

  return (
    <button
      className="program-action program-action-disabled"
      type="button"
      disabled
      aria-label={t('unavailableAria', { name: programText(program.name, locale) })}
    >{t('notAvailable')}</button>
  );
}

export function ProgramCatalog() {
  const t = useT('programs', programsMessages);
  const { locale } = useLocalePreference();
  const router = useRouter();
  const [catalog, setCatalog] = useState<LearningProgramCatalogDto | null>(null);
  const [context, setContext] = useState<ProgramContextDto | null>(null);
  const [activationError, setActivationError] = useState<{ key: 'contextChanged' | 'refreshError' | 'openError'; error?: unknown } | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const activationPending = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadFailure, setLoadFailure] = useState<unknown>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadCatalog() {
      try {
        setIsLoading(true);
        setHasError(false);
        const [nextCatalog, nextContext] = await Promise.all([
          learningProgramClient.getCatalog(), learningProgramClient.getContext(),
        ]);
        if (isActive) {
          setCatalog(nextCatalog);
          setContext(nextContext);
          setActivationError(null);
          setNeedsRefresh(false);
        }
      } catch (error) {
        if (isActive) { setHasError(true); setLoadFailure(error); }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadCatalog();
    return () => {
      isActive = false;
    };
  }, [requestKey]);

  async function activate(program: LearningProgramCatalogItemDto) {
    if (activationPending.current || needsRefresh || !program.isSelectable || !program.destination) return;
    if (program.destination === '/ielts') {
      router.push('/ielts');
      return;
    }
    activationPending.current = true;
    setIsActivating(true);
    setActivationError(null);
    try {
      const activated = await learningProgramClient.activateProgram({ programSlug: program.slug, expectedRevision: context?.enrollment?.revision ?? null });
      if (activated.activeProgram?.slug !== program.slug || !activated.enrollment) {
        throw new Error('Program activation returned an inconsistent context.');
      }
      setContext(activated);
      router.push(program.destination);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PROGRAM_CONTEXT_STALE') {
        try {
          setContext(await learningProgramClient.getContext());
          setActivationError({ key: 'contextChanged' });
        } catch (error) {
          setNeedsRefresh(true);
          setActivationError({ key: 'refreshError', error });
        }
      } else {
        setActivationError({ key: 'openError', error });
      }
    } finally {
      activationPending.current = false;
      setIsActivating(false);
    }
  }

  return (
    <main className="program-catalog-page">
      <header className="program-catalog-header">
        <p className="program-catalog-kicker">{t('kicker')}</p>
        <h1>{t('title')}</h1>
        <p>{t('introduction')}</p>
      </header>

      {context?.activeProgram && <p>{t('active')}{' '}<strong>{programText(context.activeProgram.name, locale)}</strong></p>}
      {isActivating && <p role="status" aria-live="polite">{t('opening')}</p>}
      {activationError && <div role="alert">
        <p>{t(activationError.key)}</p>
        {activationError.error !== undefined && <p>{localizedError(activationError.error, locale)}</p>}
        {needsRefresh && <button type="button" className="program-retry" onClick={() => setRequestKey((key) => key + 1)}>{t('reload')}</button>}
      </div>}

      {isLoading ? (
        <section className="program-catalog-state" role="status" aria-live="polite">
          <h2>{t('loading')}</h2>
          <p>{t('checking')}</p>
        </section>
      ) : hasError ? (
        <section className="program-catalog-state program-catalog-error" role="alert">
          <h2>{t('loadError')}</h2>
          <p>{t('connection')}</p>
          <p>{localizedError(loadFailure, locale)}</p>
          <button
            type="button"
            className="program-retry"
            onClick={() => setRequestKey((key) => key + 1)}
          >{t('retry')}</button>
        </section>
      ) : catalog?.programs.length === 0 ? (
        <section className="program-catalog-state" role="status">
          <h2>{t('empty')}</h2>
          <p>{t('checkLater')}</p>
        </section>
      ) : (
        <ul className="program-list" aria-label={t('list')}>
          {catalog?.programs.map((program) => (
            <li className={`program-card program-card-${program.slug}${context?.activeProgram?.slug === program.slug ? ' program-card-active' : ''}`} key={program.slug}>
              {context?.activeProgram?.slug === program.slug ? <p className="program-active-label">{t('yourActive')}</p> : null}
              <div className="program-card-heading">
                <ProgramIcon iconKey={program.iconKey} />
                <div>
                  <p className="program-proficiency">{programText(program.proficiencyLabel, locale)}</p>
                  <h2>{programText(program.name, locale)}</h2>
                </div>
                <span className={`program-status program-status-${program.availabilityStatus}`}>
                  {t(statusKeys[program.availabilityStatus])}
                </span>
              </div>
              <p className="program-description">{program.slug === 'ielts' && program.isSelectable ? t('ieltsBetaDescription') : programText(program.description, locale)}</p>
              <p className="program-goal">
                <strong>{t('goal')}</strong> {programText(program.learningGoal, locale)}
              </p>
              {program.slug === 'ielts' ? <p className="program-ielts-phases">{t('ieltsPhases')}</p> : <dl className="program-content-summary">
                <div>
                  <dt>{t('paths')}</dt>
                  <dd>{formatNumber(locale, program.publishedPathCount)}</dd>
                </div>
                <div>
                  <dt>{t('levels')}</dt>
                  <dd>{formatNumber(locale, program.publishedLevelCount)}</dd>
                </div>
              </dl>}
              <ProgramAction program={program} pending={isActivating || needsRefresh} onActivate={() => { void activate(program); }} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
