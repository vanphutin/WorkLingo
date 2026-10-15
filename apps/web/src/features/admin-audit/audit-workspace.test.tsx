import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminAuditPageDto } from '@worklingo/contracts';
import { ApiError } from '../../lib/api/api-client';
import { adminAuditClient } from '../../lib/api/admin-audit-client';
import { AuditWorkspace } from './audit-workspace';
import { LocaleProvider } from '../../i18n/provider';

const mockFirstPage: AdminAuditPageDto = {
  items: [
    {
      action: 'PUBLISH_PATH',
      actorDisplayName: 'Super Admin',
      actorId: '11111111-1111-4111-8111-111111111111',
      createdAt: '2026-10-12T01:00:00.000Z',
      id: '22222222-2222-4222-8222-222222222222',
      metadata: { ip: '127.0.0.1' },
      newState: { status: 'PUBLISHED' },
      oldState: { status: 'DRAFT' },
      resourceId: '33333333-3333-4333-8333-333333333333',
      resourceType: 'LearningPath',
    },
    {
      action: 'UPDATE_LEVEL',
      actorDisplayName: 'Content Lead',
      actorId: '44444444-4444-4444-8444-444444444444',
      createdAt: '2026-10-12T00:30:00.000Z',
      id: '55555555-5555-4555-8555-555555555555',
      metadata: null,
      newState: { name: 'Intermediate B2' },
      oldState: { name: 'Intermediate B1' },
      resourceId: '66666666-6666-4666-8666-666666666666',
      resourceType: 'Level',
    },
  ],
  nextCursor: 'next_cursor_token_123',
};

const mockSecondPage: AdminAuditPageDto = {
  items: [
    {
      action: 'CREATE_MISSION',
      actorDisplayName: 'Content Lead',
      actorId: '44444444-4444-4444-8444-444444444444',
      createdAt: '2026-10-12T00:00:00.000Z',
      id: '77777777-7777-4777-8777-777777777777',
      metadata: null,
      newState: { title: 'First Mission' },
      oldState: null,
      resourceId: '88888888-8888-4888-8888-888888888888',
      resourceType: 'Mission',
    },
  ],
  nextCursor: null,
};

describe('AuditWorkspace', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminAuditClient, 'getEvents').mockResolvedValue(mockFirstPage);
  });

  afterEach(() => {
    cleanup();
  });

  it('localizes audit labels and counts while retaining diagnostic codes and payloads', async () => {
    render(<LocaleProvider initialLocale="vi"><AuditWorkspace /></LocaleProvider>);
    expect(await screen.findByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nhật ký kiểm toán' })).toBeInTheDocument();
    expect(screen.getByLabelText('Loại tài nguyên')).toBeInTheDocument();
    expect(screen.getByText('Đang hiển thị 2 sự kiện')).toBeInTheDocument();
    expect(screen.getByText('PUBLISH_PATH')).toBeInTheDocument();
    expect(screen.getAllByText(/"status": "PUBLISHED"/)[0]).toBeInTheDocument();
  });

  it('renders audit events with action, actor display name, and privacy safety', async () => {
    render(<AuditWorkspace />);

    expect(await screen.findByText('PUBLISH_PATH')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('UPDATE_LEVEL')).toBeInTheDocument();
    expect(screen.getByText('Content Lead')).toBeInTheDocument();

    // Verify actor email is NEVER rendered
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it('applies filters on submit and reloads audit events', async () => {
    const filterSpy = vi.spyOn(adminAuditClient, 'getEvents').mockResolvedValue({
      items: [mockFirstPage.items[0]!],
      nextCursor: null,
    });

    render(<AuditWorkspace />);
    await screen.findByText('PUBLISH_PATH');

    fireEvent.change(screen.getByLabelText(/Action/i), {
      target: { value: 'PUBLISH_PATH' },
    });
    fireEvent.change(screen.getByLabelText(/Resource Type/i), {
      target: { value: 'LearningPath' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Apply Filters/i }));

    await waitFor(() => {
      expect(filterSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PUBLISH_PATH',
          resourceType: 'LearningPath',
        }),
      );
    });
  });

  it('navigates to next page using cursor pagination', async () => {
    const getEventsSpy = vi
      .spyOn(adminAuditClient, 'getEvents')
      .mockResolvedValueOnce(mockFirstPage)
      .mockResolvedValueOnce(mockSecondPage);

    render(<AuditWorkspace />);
    await screen.findByText('PUBLISH_PATH');

    const nextButton = screen.getByRole('button', { name: /Next Page/i });
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(getEventsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: 'next_cursor_token_123',
        }),
      );
    });

    expect(await screen.findByText('CREATE_MISSION')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next Page/i })).toBeDisabled();
  });

  it('handles error state gracefully with retry button', async () => {
    vi.spyOn(adminAuditClient, 'getEvents').mockRejectedValueOnce(
      new ApiError({
        code: 'NETWORK_ERROR',
        message: 'Could not connect to audit server',
        status: 0,
      }),
    );

    render(<AuditWorkspace />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Connection failed. Check your connection and try again.',
    );
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });
});
