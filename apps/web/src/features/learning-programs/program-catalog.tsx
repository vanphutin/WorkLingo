'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type {
  LearningProgramCatalogDto,
  LearningProgramCatalogItemDto,
  LearningProgramAvailabilityStatusDto,
  LearningProgramIconKeyDto,
} from '@worklingo/contracts';

import { learningProgramClient } from '../../lib/api/learning-program-client';
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

function ProgramAction({ program }: { readonly program: LearningProgramCatalogItemDto }) {
  if (program.isSelectable && program.destination) {
    return (
      <Link
        className="program-action program-action-primary"
        href={program.destination}
        aria-label={`Open ${program.name} program`}
      >
        Continue with {program.name}
      </Link>
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
  const [catalog, setCatalog] = useState<LearningProgramCatalogDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadCatalog() {
      try {
        setIsLoading(true);
        setHasError(false);
        const nextCatalog = await learningProgramClient.getCatalog();
        if (isActive) setCatalog(nextCatalog);
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
              <ProgramAction program={program} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
