import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReferenceOptions } from './reference-options';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('preserves the chosen program when searching a different page of topics', async () => {
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    const searching = new URL(path, 'http://localhost').searchParams.get('search');
    return new Response(JSON.stringify({ programs: searching ? [] : [{ id: '11111111-1111-4111-8111-111111111111', name: 'Chosen program' }], topics: searching ? [{ id: '22222222-2222-4222-8222-222222222222', name: 'Another topic' }] : [], page: 1, limit: 25 }));
  }));
  render(<form aria-label="Filters"><ReferenceOptions /></form>);
  await screen.findByRole('option', { name: 'Chosen program' });
  fireEvent.change(screen.getByLabelText('Program'), { target: { value: '11111111-1111-4111-8111-111111111111' } });
  fireEvent.change(screen.getByLabelText('Find programs and topics'), { target: { value: 'another' } });
  await screen.findByRole('option', { name: 'Another topic' });
  await waitFor(() => expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('programId')).toBe('11111111-1111-4111-8111-111111111111'));
});
