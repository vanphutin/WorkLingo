import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VocabularyPublicationReview } from '@worklingo/contracts';
import { apiClient, ApiError } from '../../lib/api/api-client';
import { VocabularyReview } from './vocabulary-review';
const id = '11111111-1111-4111-8111-111111111111';
const review: VocabularyPublicationReview = { importId: id, draftRevision: 1, sourceHash: 'hash-1', reviewHash: 'review-1', topic: null,
  entries: [{ sourceSlug: 'book', sourceBankSlug: 'words', expression: 'book', meaning: 'đặt bàn', pronunciation: '/bʊk/', candidates: [{ id, expression: 'book', meaning: 'sách', pronunciation: '/bʊk/', originBankName: 'Library', contextCount: 0, contexts: [] }] },
    { sourceSlug: 'confirm', sourceBankSlug: 'words', expression: 'confirm', meaning: 'xác nhận', pronunciation: '', candidates: [] }] };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Vocabulary prepublication review', () => {
  it('defaults only unmatched terms to new and clears choices when the source changes', async () => {
    const load = vi.spyOn(apiClient, 'getVocabularyPublicationReview').mockResolvedValue(review); const onChange = vi.fn();
    const view = render(<VocabularyReview importId={id} draftRevision={1} sourceHash="hash-1" disabled={false} onChange={onChange} />);
    fireEvent.click(await screen.findByRole('radio', { name: 'Use existing meaning: sách' }));
    expect(onChange).toHaveBeenLastCalledWith({ reviewHash: 'review-1', choices: [{ sourceSlug: 'book', action: 'reuse', languageBlockId: id }, { sourceSlug: 'confirm', action: 'new' }] });
    load.mockResolvedValue({ ...review, draftRevision: 2, sourceHash: 'hash-2' });
    view.rerender(<VocabularyReview importId={id} draftRevision={2} sourceHash="hash-2" disabled={false} onChange={onChange} />);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(await screen.findByRole('radio', { name: 'Use existing meaning: sách' })).not.toBeChecked();
  });
  it('keeps review incomplete on failure and lets the administrator retry', async () => {
    vi.spyOn(apiClient, 'getVocabularyPublicationReview').mockRejectedValueOnce(new ApiError({ code: 'NETWORK_ERROR', message: 'offline', status: 0 })).mockResolvedValue(review);
    const onChange = vi.fn(); render(<VocabularyReview importId={id} draftRevision={1} sourceHash="hash-1" disabled={false} onChange={onChange} />);
    expect(await screen.findByRole('alert')).toBeVisible(); expect(onChange).toHaveBeenLastCalledWith(null);
    fireEvent.click(screen.getByRole('button', { name: 'Check vocabulary again' }));
    expect(await screen.findByRole('radio', { name: 'Create a new meaning: đặt bàn' })).not.toBeChecked();
  });
  it('ignores an older pending preflight after a new revision arrives', async () => {
    let finish!: (value: VocabularyPublicationReview) => void;
    vi.spyOn(apiClient, 'getVocabularyPublicationReview').mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce({ ...review, draftRevision: 2, sourceHash: 'hash-2', entries: [] });
    const onChange = vi.fn(); const view = render(<VocabularyReview importId={id} draftRevision={1} sourceHash="hash-1" disabled={false} onChange={onChange} />);
    view.rerender(<VocabularyReview importId={id} draftRevision={2} sourceHash="hash-2" disabled={false} onChange={onChange} />);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ reviewHash: 'review-1', choices: [] }));
    await act(async () => { finish(review); });
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({ reviewHash: 'review-1', choices: [] });
  });
});
