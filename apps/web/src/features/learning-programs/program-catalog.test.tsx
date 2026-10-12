import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LearningProgramCatalogDto } from '@worklingo/contracts';
import { ApiError } from '../../lib/api/api-client';
import { learningProgramClient } from '../../lib/api/learning-program-client';
import { ProgramCatalog } from './program-catalog';

const catalog: LearningProgramCatalogDto = {
  programs: [
    {
      availabilityStatus: 'COMING_SOON',
      description: 'Build essential English through guided four-skill practice.',
      destination: null,
      iconKey: 'beginner',
      isSelectable: false,
      learningGoal: 'Understand practical English in familiar situations.',
      name: 'Beginner',
      proficiencyLabel: 'Foundation / Pre-A1-A2',
      publishedLevelCount: 0,
      publishedPathCount: 0,
      slug: 'beginner',
    },
    {
      availabilityStatus: 'AVAILABLE',
      description: 'Use English confidently across everyday workplace situations.',
      destination: '/dashboard',
      iconKey: 'intermediate',
      isSelectable: true,
      learningGoal: 'Communicate, understand and respond effectively at work.',
      name: 'Intermediate',
      proficiencyLabel: 'Intermediate / B1-B2',
      publishedLevelCount: 2,
      publishedPathCount: 1,
      slug: 'intermediate',
    },
    {
      availabilityStatus: 'COMING_SOON',
      description: 'Prepare for TOEIC through practical workplace language.',
      destination: null,
      iconKey: 'toeic',
      isSelectable: false,
      learningGoal: 'Strengthen listening and reading.',
      name: 'TOEIC',
      proficiencyLabel: 'TOEIC-oriented',
      publishedLevelCount: 0,
      publishedPathCount: 0,
      slug: 'toeic',
    },
    {
      availabilityStatus: 'IN_DEVELOPMENT',
      description: 'Develop integrated English for a future IELTS pathway.',
      destination: null,
      iconKey: 'ielts',
      isSelectable: false,
      learningGoal: 'Build language evidence for IELTS preparation.',
      name: 'IELTS',
      proficiencyLabel: 'IELTS band-oriented',
      publishedLevelCount: 0,
      publishedPathCount: 0,
      slug: 'ielts',
    },
  ],
};

describe('ProgramCatalog', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(cleanup);

  it('keeps a usable heading while loading', () => {
    vi.spyOn(learningProgramClient, 'getCatalog').mockReturnValue(new Promise(() => undefined));

    render(<ProgramCatalog />);

    expect(screen.getByRole('heading', { name: 'Choose your learning program' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading learning programs');
  });

  it('renders cards in API order with explicit status and safe actions', async () => {
    vi.spyOn(learningProgramClient, 'getCatalog').mockResolvedValue(catalog);

    render(<ProgramCatalog />);

    const cards = await screen.findAllByRole('listitem');
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
      'Beginner',
      'Intermediate',
      'TOEIC',
      'IELTS',
    ]);
    expect(screen.getByRole('link', { name: 'Open Intermediate program' })).toHaveAttribute(
      'href',
      '/dashboard',
    );

    for (const name of ['Beginner', 'TOEIC', 'IELTS']) {
      const action = screen.getByRole('button', { name: `${name} program unavailable` });
      expect(action).toBeDisabled();
      fireEvent.keyDown(action, { key: 'Enter' });
      fireEvent.keyDown(action, { key: ' ' });
    }
    expect(screen.getAllByText(/Coming soon|In development|Available/)).toHaveLength(4);
  });

  it('shows an explicit beta label', async () => {
    vi.spyOn(learningProgramClient, 'getCatalog').mockResolvedValue({
      programs: catalog.programs.map((program) =>
        program.slug === 'intermediate'
          ? { ...program, availabilityStatus: 'BETA' as const }
          : program,
      ),
    });

    render(<ProgramCatalog />);

    expect(await screen.findByText('Beta')).toBeInTheDocument();
  });

  it('explains when no learning programs are available', async () => {
    vi.spyOn(learningProgramClient, 'getCatalog').mockResolvedValue({ programs: [] });

    render(<ProgramCatalog />);

    expect(await screen.findByText('No learning programs are available')).toBeInTheDocument();
  });

  it('shows a retryable error without removing the page heading', async () => {
    vi.spyOn(learningProgramClient, 'getCatalog')
      .mockRejectedValueOnce(
        new ApiError({ code: 'NETWORK_ERROR', message: 'offline', status: 0 }),
      )
      .mockResolvedValueOnce(catalog);

    render(<ProgramCatalog />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load learning programs');
    expect(screen.getByRole('heading', { name: 'Choose your learning program' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: 'Open Intermediate program' })).toBeInTheDocument();
  });
});
