import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MasteryOverview } from './mastery-overview';
import { emptyMasteryMap, masteryMap, memoryHealth } from './test-fixtures';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function evidenceNetwork(map: unknown = masteryMap) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(
    url.endsWith('/memory-health') ? memoryHealth : map,
  )));
}

describe('Mastery and Memory Health', () => {
  it('shows four skills with scored zero distinct from unassessed evidence and displays the review queue', async () => {
    evidenceNetwork();
    render(<MasteryOverview />);
    const health = await screen.findByRole('region', { name: 'Memory Health' });
    expect(await within(health).findByRole('article', { name: 'Reading memory health' })).toHaveTextContent('0%');
    expect(within(health).getByRole('article', { name: 'Speaking memory health' })).toHaveTextContent('Unassessed');
    const map = await screen.findByRole('region', { name: 'Mastery Map' });
    expect(await within(map).findByRole('article', { name: 'Reading mastery: follow up' })).toHaveTextContent('0%');
    expect(within(map).getByRole('article', { name: 'Listening mastery: follow up' })).toHaveTextContent('Unassessed');
    expect(within(map).getByText('Check on progress')).toBeInTheDocument();
    const queue = screen.getByRole('region', { name: 'Review queue' });
    expect(within(queue).getByText('follow up')).toBeInTheDocument();
    expect(within(queue).getByText(/needs attention/i)).toBeInTheDocument();
  });
  it('shows honest empty map and review states', async () => {
    evidenceNetwork(emptyMasteryMap);
    render(<MasteryOverview />);
    expect(await screen.findByText(/no language blocks are available/i)).toBeInTheDocument();
    expect(screen.getByText(/no reviews are scheduled/i)).toBeInTheDocument();
  });
  it('loads independently, keeps health visible when the map fails and retries the failed panel', async () => {
    let finishMap: (response: Response) => void = () => undefined;
    let mapRequests = 0;
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/memory-health')) return Promise.resolve(Response.json(memoryHealth));
      mapRequests++;
      if (mapRequests === 1) return new Promise<Response>((resolve) => { finishMap = resolve; });
      return Promise.resolve(Response.json(masteryMap));
    }));
    render(<MasteryOverview />);
    expect(screen.getByText(/loading mastery map/i)).toBeInTheDocument();
    expect(await screen.findByRole('article', { name: 'Reading memory health' })).toHaveTextContent('0%');
    await act(async () => finishMap(Response.json({ message: 'Unavailable' }, { status: 503 })));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to load mastery map/i);
    fireEvent.click(screen.getByRole('button', { name: /retry mastery map/i }));
    expect(await screen.findByRole('article', { name: 'Reading mastery: follow up' })).toHaveTextContent('0%');
  });
});
