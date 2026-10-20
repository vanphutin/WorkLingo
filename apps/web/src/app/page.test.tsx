import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../lib/api/api-client';

import HomePage from './page';

vi.mock('../lib/api/api-client', () => ({ apiClient: { getCurrentUser: vi.fn() } }));

beforeEach(() => {
  vi.mocked(apiClient.getCurrentUser).mockRejectedValue(new Error('Unauthenticated'));
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('HomePage', () => {
  it('exposes the real home link, locale and theme controls in public navigation', async () => {
    render(<HomePage />);
    await screen.findByRole('link', { name: 'Log in' });
    const nav = screen.getByRole('navigation', { name: 'Public navigation' });
    expect(within(nav).getByRole('link', { name: 'WorkLingo' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('combobox', { name: 'Interface language' })).toBeVisible();
    expect(within(nav).getByRole('button', { name: /Color theme:/ })).toBeVisible();
  });
  it('introduces WorkLingo as the primary page heading', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'WorkLingo' }),
    ).toBeInTheDocument();
  });

  it('offers both returning and new users a clear next step', async () => {
    render(<HomePage />);

    expect(await screen.findByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Create free account' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('replaces login actions with the learner workspace when a session already exists', async () => {
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue({
      displayName: 'An Nguyen', email: 'an@example.test',
      id: '828a1927-c4fa-487f-93d5-96c556667869',
      onboardingStatus: 'COMPLETE', roles: ['LEARNER'],
    });

    render(<HomePage />);

    expect(await screen.findByRole('link', { name: 'Open dashboard' }))
      .toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create free account' })).not.toBeInTheDocument();
  });
});
