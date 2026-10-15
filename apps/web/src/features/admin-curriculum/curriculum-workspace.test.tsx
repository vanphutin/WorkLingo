import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminCurriculumTreeDto } from '@worklingo/contracts';
import { ApiError } from '../../lib/api/api-client';
import { adminCurriculumClient } from '../../lib/api/admin-curriculum-client';
import { CurriculumWorkspace } from './curriculum-workspace';
import { LocaleProvider } from '../../i18n/provider';

const intermediateProgram = {
  availabilityStatus: 'AVAILABLE',
  id: '10000000-0000-4000-8000-000000000002',
  name: 'Intermediate',
  slug: 'intermediate',
} as const;
const ieltsProgram = {
  availabilityStatus: 'IN_DEVELOPMENT',
  id: '10000000-0000-4000-8000-000000000004',
  name: 'IELTS',
  slug: 'ielts',
} as const;

const mockTree: AdminCurriculumTreeDto = {
  paths: [
    {
      archiveBlockers: ['Active learners enrolled'],
      id: '11111111-1111-4111-8111-111111111111',
      levels: [
        {
          archiveBlockers: [],
          cefrReference: 'A1',
          code: 'BEG_1',
          id: '22222222-2222-4222-8222-222222222222',
          isPlayable: true,
          missions: [
            {
              archiveBlockers: [],
              id: '33333333-3333-4333-8333-333333333333',
              isPlayable: true,
              lessons: [
                {
                  currentPublishedVersionId: '44444444-4444-4444-8444-444444444444',
                  currentPublishedVersionNumber: 1,
                  hasAudio: true,
                  id: '55555555-5555-4555-8555-555555555555',
                  order: 1,
                  slug: 'hello-world',
                  title: 'Hello World',
                },
              ],
              levelId: '22222222-2222-4222-8222-222222222222',
              objective: 'Learn basic greeting',
              order: 1,
              playabilityReasons: [],
              purpose: 'LEARNING',
              revision: 2,
              slug: 'greetings',
              status: 'PUBLISHED',
              title: 'Greetings Mission',
            },
            {
              archiveBlockers: [],
              id: '33333333-3333-4333-8333-333333333334',
              isPlayable: false,
              lessons: [],
              levelId: '22222222-2222-4222-8222-222222222222',
              objective: 'Incomplete mission',
              order: 2,
              playabilityReasons: ['Mission has no published lessons with audio'],
              purpose: 'LEARNING',
              revision: 1,
              slug: 'incomplete-mission',
              status: 'DRAFT',
              title: 'Incomplete Mission',
            },
          ],
          name: 'Beginner 1',
          order: 1,
          pathId: '11111111-1111-4111-8111-111111111111',
          playabilityReasons: [],
          revision: 1,
          status: 'PUBLISHED',
        },
      ],
      name: 'General English',
      program: intermediateProgram,
      revision: 3,
      slug: 'general-english',
      status: 'PUBLISHED',
    },
  ],
  programs: [
    {
      availabilityStatus: 'COMING_SOON',
      id: '10000000-0000-4000-8000-000000000001',
      name: 'Beginner',
      slug: 'beginner',
    },
    intermediateProgram,
    {
      availabilityStatus: 'COMING_SOON',
      id: '10000000-0000-4000-8000-000000000003',
      name: 'TOEIC',
      slug: 'toeic',
    },
    ieltsProgram,
  ],
};

describe('CurriculumWorkspace', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminCurriculumClient, 'getTree').mockResolvedValue(mockTree);
  });

  afterEach(() => {
    cleanup();
  });
  it('keeps status styling keyed to machine states when the displayed label is Vietnamese', async () => {
    render(<LocaleProvider initialLocale="vi"><CurriculumWorkspace /></LocaleProvider>);
    const badges = await screen.findAllByText('Đã xuất bản', { selector: '.status-badge' });
    for (const badge of badges) expect(badge).toHaveClass('status-PUBLISHED');
  });

  it('renders curriculum tree with path, level, mission, and playability indicators', async () => {
    render(<CurriculumWorkspace />);

    expect(await screen.findByText('General English')).toBeInTheDocument();
    expect(screen.getByText(/Program: Intermediate/)).toBeInTheDocument();
    expect(screen.getByText(/Beginner 1/)).toBeInTheDocument();
    expect(screen.getByText('Greetings Mission')).toBeInTheDocument();
    expect(screen.getByText(/Hello World/)).toBeInTheDocument();

    // Archive blocker indicator
    expect(screen.getByText(/Active learners enrolled/)).toBeInTheDocument();

    // Playability warning
    expect(screen.getByText(/Mission has no published lessons with audio/)).toBeInTheDocument();
  });

  it('creates a new path and reloads tree', async () => {
    const createSpy = vi.spyOn(adminCurriculumClient, 'createPath').mockResolvedValue({
      archiveBlockers: [],
      id: '99999999-9999-4999-8999-999999999999',
      levels: [],
      name: 'IELTS Prep',
      program: ieltsProgram,
      revision: 1,
      slug: 'ielts-prep',
      status: 'DRAFT',
    });

    render(<CurriculumWorkspace />);
    await screen.findByText('General English');

    fireEvent.click(screen.getByRole('button', { name: /New Path/i }));

    const programSelect = screen.getByLabelText(/Learning Program/i);
    expect(programSelect).toHaveValue(intermediateProgram.id);
    expect(screen.getByRole('option', { name: /IELTS.*In development/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Path Name/i), { target: { value: 'IELTS Prep' } });
    fireEvent.change(screen.getByLabelText(/Slug/i), { target: { value: 'ielts-prep' } });
    fireEvent.change(programSelect, { target: { value: ieltsProgram.id } });

    fireEvent.click(screen.getByRole('button', { name: /Create Path/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'IELTS Prep',
          programId: ieltsProgram.id,
          slug: 'ielts-prep',
        }),
      );
    });
  });

  it('preserves the selected program after a recoverable create error', async () => {
    vi.spyOn(adminCurriculumClient, 'createPath').mockRejectedValue(
      new ApiError({ code: 'API_ERROR', message: 'Please try again', status: 503 }),
    );

    render(<CurriculumWorkspace />);
    await screen.findByText('General English');
    fireEvent.click(screen.getByRole('button', { name: /New Path/i }));
    fireEvent.change(screen.getByLabelText(/Path Name/i), { target: { value: 'IELTS Retry' } });
    fireEvent.change(screen.getByLabelText(/Slug/i), { target: { value: 'ielts-retry' } });
    const programSelect = screen.getByLabelText(/Learning Program/i);
    fireEvent.change(programSelect, { target: { value: ieltsProgram.id } });
    fireEvent.click(screen.getByRole('button', { name: /Create Path/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Please try again');
    expect(programSelect).toHaveValue(ieltsProgram.id);
  });

  it('displays conflict error without crashing when publish fails with 409', async () => {
    const firstPath = mockTree.paths[0]!;
    const draftTree: AdminCurriculumTreeDto = {
      paths: [
        {
          ...firstPath,
          status: 'DRAFT',
        },
      ],
      programs: mockTree.programs,
    };
    vi.spyOn(adminCurriculumClient, 'getTree').mockResolvedValue(draftTree);

    vi.spyOn(adminCurriculumClient, 'publishPath').mockRejectedValue(
      new ApiError({
        code: 'CURRICULUM_REVISION_CONFLICT',
        message: 'Path revision has changed on the server',
        status: 409,
      }),
    );

    render(<CurriculumWorkspace />);
    await screen.findByText('General English');

    const publishButton = screen.getByRole('button', { name: /Publish Path General English/i });
    fireEvent.click(publishButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This information has changed. Reload and try again.',
    );
    expect(screen.getByText('General English')).toBeInTheDocument();
  });

  it('supports reordering missions via accessible move buttons', async () => {
    const reorderSpy = vi.spyOn(adminCurriculumClient, 'reorderMissions').mockResolvedValue([]);

    render(<CurriculumWorkspace />);
    await screen.findByText('Greetings Mission');

    const moveDownBtn = screen.getByRole('button', {
      name: /Move mission Greetings Mission down/i,
    });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(reorderSpy).toHaveBeenCalledWith(
        '22222222-2222-4222-8222-222222222222',
        expect.objectContaining({
          orderedIds: [
            '33333333-3333-4333-8333-333333333334',
            '33333333-3333-4333-8333-333333333333',
          ],
        }),
      );
    });
  });
});
