import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CurriculumRoadmapDto } from '@worklingo/contracts';

import { CurriculumRoadmap } from './curriculum-roadmap';

const roadmap: CurriculumRoadmapDto = {
  programId: '11111111-1111-4111-8111-111111111111',
  enrollmentId: '22222222-2222-4222-8222-222222222222',
  items: [
    {
      missionId: '33333333-3333-4333-8333-333333333333', revisionId: '44444444-4444-4444-8444-444444444444',
      title: 'Handle a workplace request', state: 'in_progress', unmetPrerequisites: [], reviewDue: false,
      activeSessionId: '55555555-5555-4555-8555-555555555555',
      objectives: [{ slug: 'clarify', statement: 'Clarify a request', skills: ['speaking'], required: true, completed: false }],
    },
    {
      missionId: '66666666-6666-4666-8666-666666666666', revisionId: '77777777-7777-4777-8777-777777777777',
      title: 'Report an issue', state: 'locked', unmetPrerequisites: ['prerequisite_incomplete:44444444-4444-4444-8444-444444444444'],
      reviewDue: true, activeSessionId: null,
      objectives: [{ slug: 'report', statement: 'Report an issue clearly', skills: ['writing'], required: true, completed: false }],
    },
  ],
};

afterEach(cleanup);

describe('CurriculumRoadmap', () => {
  it('shows authoritative states, unmet prerequisites, pending objectives, review due, and an owned resume link', () => {
    render(<CurriculumRoadmap roadmap={roadmap} />);
    expect(screen.getByRole('article', { name: 'Handle a workplace request' })).toHaveTextContent('In progress');
    expect(screen.getByText('Clarify a request').closest('li')).toHaveTextContent('Pending evaluation');
    expect(screen.getByRole('link', { name: /resume handle a workplace request/i }))
      .toHaveAttribute('href', '/sessions/55555555-5555-4555-8555-555555555555');
    expect(screen.getByRole('article', { name: 'Report an issue' })).toHaveTextContent('Locked');
    expect(screen.getByText(/complete the required earlier curriculum/i)).toBeInTheDocument();
    expect(screen.getByText('Review due')).toBeInTheDocument();
  });

  it('renders loading, empty, and recoverable error states', () => {
    const retry = vi.fn();
    const { rerender } = render(<CurriculumRoadmap roadmap={null} isLoading />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading curriculum roadmap/i);
    rerender(<CurriculumRoadmap roadmap={null} error="Roadmap unavailable" onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: /retry curriculum roadmap/i }));
    expect(retry).toHaveBeenCalledOnce();
    rerender(<CurriculumRoadmap roadmap={{ ...roadmap, items: [] }} />);
    expect(screen.getByText(/no published curriculum is available/i)).toBeInTheDocument();
  });
});
