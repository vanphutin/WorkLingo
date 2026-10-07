import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBankPanel } from './error-bank-panel';
import { emptyErrorBank, errorItem } from './test-fixtures';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('Error Bank', () => {
  it('loads server pages, filters by skill and resets pagination when the filter changes', async () => {
    const network = vi.fn(async (url: string) => {
      if (url.includes('skill=writing')) return Response.json(emptyErrorBank);
      if (url.includes('page=2')) return Response.json({ items: [{ ...errorItem, canonicalForm: 'arrange a meeting' }], page: 2, limit: 20, total: 21, totalPages: 2 });
      return Response.json({ items: [errorItem], page: 1, limit: 20, total: 21, totalPages: 2 });
    });
    vi.stubGlobal('fetch', network);
    render(<ErrorBankPanel />);
    expect(await screen.findByText('follow up')).toBeInTheDocument();
    expect(screen.getByText(/2 occurrences/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(await screen.findByText('arrange a meeting')).toBeInTheDocument();
    expect(screen.queryByText('follow up')).not.toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/filter errors by skill/i), { target: { value: 'writing' } });
    expect(await screen.findByText(/no errors recorded for writing/i)).toBeInTheDocument();
    expect(network).toHaveBeenLastCalledWith('/api/v1/me/error-bank?skill=writing&page=1&limit=20', expect.any(Object));
  });
  it('shows loading, an error and retry without showing an empty state for a failed request', async () => {
    let finish: (response: Response) => void = () => undefined;
    const network = vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve; }))
      .mockResolvedValueOnce(Response.json(emptyErrorBank));
    vi.stubGlobal('fetch', network);
    render(<ErrorBankPanel />);
    expect(screen.getByText(/loading error bank/i)).toBeInTheDocument();
    await act(async () => finish(Response.json({ message: 'Unavailable' }, { status: 503 })));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to load error bank/i);
    expect(screen.queryByText(/no errors recorded/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry error bank/i }));
    expect(await screen.findByText(/no errors recorded yet/i)).toBeInTheDocument();
  });
  it('ignores an old response that arrives after a new skill filter', async () => {
    let finishOld: (response: Response) => void = () => undefined;
    const network = vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { finishOld = resolve; }))
      .mockResolvedValueOnce(Response.json(emptyErrorBank));
    vi.stubGlobal('fetch', network);
    render(<ErrorBankPanel />);
    fireEvent.change(screen.getByLabelText(/filter errors by skill/i), { target: { value: 'speaking' } });
    await screen.findByText(/no errors recorded for speaking/i);
    await act(async () => finishOld(Response.json({ items: [errorItem], page: 1, limit: 20, total: 1, totalPages: 1 })));
    await waitFor(() => expect(screen.queryByText('follow up')).not.toBeInTheDocument());
    expect(screen.getByText(/no errors recorded for speaking/i)).toBeInTheDocument();
  });
});
