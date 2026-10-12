import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EngagementSummaryDto } from '@worklingo/contracts';

import { EngagementPanel } from './engagement-panel';

const mockEngagement: EngagementSummaryDto = {
  consistency: {
    bestStreakWeeks: 4,
    currentStreakWeeks: 2,
  },
  currentWeek: {
    completedDays: 2,
    effectiveTargetNextWeek: null,
    remainingDays: 1,
    status: 'ACTIVE',
    targetChangeAppliesImmediately: true,
    targetDays: 3,
    timezone: 'Asia/Ho_Chi_Minh',
    weekStartKey: '2026-10-12',
  },
  evidenceOfProgress: {
    completedReviewsCount: 4,
    completedSessions: 6,
    distinctStudyDays: 3,
    evaluatedBlocksCount: 5,
    skills: {
      listening: {
        change: -0.01,
        currentAverage: 0.79,
        currentSamples: 2,
        previousAverage: 0.8,
        previousSamples: 2,
        status: 'STEADY',
      },
      reading: {
        change: 0.1,
        currentAverage: 0.85,
        currentSamples: 3,
        previousAverage: 0.75,
        previousSamples: 2,
        status: 'IMPROVING',
      },
      speaking: {
        change: -0.15,
        currentAverage: 0.65,
        currentSamples: 2,
        previousAverage: 0.8,
        previousSamples: 2,
        status: 'NEEDS_ATTENTION',
      },
      writing: {
        change: null,
        currentAverage: 0.7,
        currentSamples: 1,
        previousAverage: null,
        previousSamples: 0,
        status: 'INSUFFICIENT_EVIDENCE',
      },
    },
  },
};

afterEach(cleanup);

describe('EngagementPanel', () => {
  it('renders neutral consistency streak and distinct learning day progress', () => {
    render(<EngagementPanel engagement={mockEngagement} onUpdateTarget={vi.fn()} />);

    expect(screen.getByText(/2 of 3 learning days/i)).toBeInTheDocument();
    expect(screen.getByText(/2-week consistency/i)).toBeInTheDocument();
    expect(screen.getByText(/Best: 4 weeks/i)).toBeInTheDocument();
  });

  it('renders target selector with options 2 through 5 and handles target change', () => {
    const updateTarget = vi.fn();
    render(<EngagementPanel engagement={mockEngagement} onUpdateTarget={updateTarget} />);

    const select = screen.getByLabelText(/Weekly learning target/i);
    expect(select).toHaveValue('3');

    const options = screen.getAllByRole('option');
    const optionValues = options.map((opt) => opt.getAttribute('value'));
    expect(optionValues).toEqual(['2', '3', '4', '5']);

    fireEvent.change(select, { target: { value: '4' } });
    expect(updateTarget).toHaveBeenCalledWith(4);
  });

  it('displays next-week effective copy when target change applies next week', () => {
    const deferredEngagement: EngagementSummaryDto = {
      ...mockEngagement,
      currentWeek: {
        ...mockEngagement.currentWeek,
        effectiveTargetNextWeek: 4,
        targetChangeAppliesImmediately: false,
      },
    };

    render(<EngagementPanel engagement={deferredEngagement} onUpdateTarget={vi.fn()} />);

    expect(
      screen.getByText(/Target will update to 4 days next week/i),
    ).toBeInTheDocument();
  });

  it('renders all four skill evidence summaries with sample counts, signed deltas, and insufficient evidence', () => {
    render(<EngagementPanel engagement={mockEngagement} onUpdateTarget={vi.fn()} />);

    // Reading: +10% or +0.10, Improving, 3 samples
    expect(screen.getByText(/Reading/i)).toBeInTheDocument();
    expect(screen.getByText(/\+10\.0%/i)).toBeInTheDocument();
    expect(screen.getByText(/Improving/i)).toBeInTheDocument();

    // Writing: Insufficient evidence (1 sample)
    expect(screen.getByText(/Writing/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Insufficient evidence/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/1 recent sample/i)).toBeInTheDocument();
  });

  it('renders an independent retry state when engagement loading fails', () => {
    const retry = vi.fn();
    render(
      <EngagementPanel
        engagement={null}
        error="Unable to load engagement progress"
        onRetry={retry}
        onUpdateTarget={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: /Unable to load engagement progress/i })).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);
    expect(retry).toHaveBeenCalled();
  });
});
