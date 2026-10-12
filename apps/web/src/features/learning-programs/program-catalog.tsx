'use client';

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

const STATUS_LABELS: Readonly<Record<LearningProgramAvailabilityStatusDto, string>> = {
  AVAILABLE: 'Available',
  BETA: 'Beta',
  COMING_SOON: 'Coming soon',
  DISABLED: 'Unavailable',
  IN_DEVELOPMENT: 'In development',
};

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
  if (program.isSelectable && program.destination) {
    return (
      <button
        type="button"
        className="program-action program-action-primary"
        onClick={onActivate}
        disabled={pending}
        aria-label={`Open ${program.name} program`}
      >
        Continue with {program.name}
      </button>
    );
  }

  return (
    <button
      className="program-action program-action-disabled"
      type="button"
      disabled
      aria-label={`${program.name} program unavailable`}
    >
      Not available yet
    </button>
  );
}

export function ProgramCatalog() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<LearningProgramCatalogDto | null>(null);
  const [context, setContext] = useState<ProgramContextDto | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const activationPending = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
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
      } catch {
        if (isActive) setHasError(true);
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
          setActivationError('Learning context changed. Review the updated program and try again.');
        } catch {
          setNeedsRefresh(true);
          setActivationError('Unable to refresh learning context. Reload programs before trying again.');
        }
      } else {
        setActivationError(error instanceof ApiError ? error.message : 'Unable to open learning program. Try again.');
      }
    } finally {
      activationPending.current = false;
      setIsActivating(false);
    }
  }

  return (
    <main className="program-catalog-page">
      <header className="program-catalog-header">
        <p className="program-catalog-kicker">Workplace English pathways</p>
        <h1>Choose your learning program</h1>
        <p>
          Start with the pathway that matches your current foundation. New exam programs will
          open only when their learning experience is ready.
        </p>
      </header>

      {context?.activeProgram && <p>Active program: <strong>{context.activeProgram.name}</strong></p>}
      {isActivating && <p role="status" aria-live="polite">Opening your learning program…</p>}
      {activationError && <div role="alert">
        <p>{activationError}</p>
        {needsRefresh && <button type="button" className="program-retry" onClick={() => setRequestKey((key) => key + 1)}>Reload programs</button>}
      </div>}

      {isLoading ? (
        <section className="program-catalog-state" role="status" aria-live="polite">
          <h2>Loading learning programs</h2>
          <p>Checking the pathways available to your account.</p>
        </section>
      ) : hasError ? (
        <section className="program-catalog-state program-catalog-error" role="alert">
          <h2>Unable to load learning programs</h2>
          <p>Check your connection and try again.</p>
          <button
            type="button"
            className="program-retry"
            onClick={() => setRequestKey((key) => key + 1)}
          >
            Try again
          </button>
        </section>
      ) : catalog?.programs.length === 0 ? (
        <section className="program-catalog-state" role="status">
          <h2>No learning programs are available</h2>
          <p>Please check again later.</p>
        </section>
      ) : (
        <ul className="program-list" aria-label="Learning programs">
          {catalog?.programs.map((program) => (
            <li className={`program-card program-card-${program.slug}`} key={program.slug}>
              <div className="program-card-heading">
                <ProgramIcon iconKey={program.iconKey} />
                <div>
                  <p className="program-proficiency">{program.proficiencyLabel}</p>
                  <h2>{program.name}</h2>
                </div>
                <span className={`program-status program-status-${program.availabilityStatus}`}>
                  {STATUS_LABELS[program.availabilityStatus]}
                </span>
              </div>
              <p className="program-description">{program.description}</p>
              <p className="program-goal">
                <strong>Learning goal:</strong> {program.learningGoal}
              </p>
              <dl className="program-content-summary">
                <div>
                  <dt>Published paths</dt>
                  <dd>{program.publishedPathCount}</dd>
                </div>
                <div>
                  <dt>Published levels</dt>
                  <dd>{program.publishedLevelCount}</dd>
                </div>
              </dl>
              <ProgramAction program={program} pending={isActivating || needsRefresh} onActivate={() => { void activate(program); }} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
