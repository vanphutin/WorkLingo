import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StructuredFields, type FieldSpec } from './structured-fields';

afterEach(cleanup);
it('edits labeled nested values without dropping fields not described by the form', () => {
  const change = vi.fn();
  const spec: FieldSpec = { type: 'object', label: ['Pack', 'Gói'], fields: {
    title: { type: 'text', label: ['Title', 'Tiêu đề'] },
    phrases: { type: 'array', label: ['Phrases', 'Cụm từ'], item: { type: 'text', label: ['Phrase', 'Cụm từ'] }, create: () => '' },
  } };
  render(<StructuredFields spec={spec} value={{ title: 'Old', phrases: [], retained: { mediaId: 'keep-me' } }} onChange={change} locale="en" />);
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New' } });
  expect(change).toHaveBeenLastCalledWith({ title: 'New', phrases: [], retained: { mediaId: 'keep-me' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Phrases' }));
  expect(change).toHaveBeenLastCalledWith({ title: 'Old', phrases: [''], retained: { mediaId: 'keep-me' } });
});
it('labels controls in Vietnamese and supports nullable media identifiers', () => {
  const change = vi.fn();
  render(<StructuredFields spec={{ type: 'text', label: ['Audio asset ID', 'ID tệp âm thanh'], nullable: true }} value="asset" onChange={change} locale="vi" />);
  fireEvent.change(screen.getByLabelText('ID tệp âm thanh'), { target: { value: '' } });
  expect(change).toHaveBeenCalledWith(null);
});
it('opens complex array entries on demand and preserves their content while collapsed', () => {
  const change = vi.fn();
  const spec: FieldSpec = { type: 'array', label: ['Questions', 'Câu hỏi'], create: () => ({ prompt: '' }), item: { type: 'object', label: ['Question', 'Câu hỏi'], fields: { prompt: { type: 'text', label: ['Prompt', 'Đề bài'] } } } };
  render(<StructuredFields spec={spec} value={[{ prompt: 'First' }, { prompt: 'Second' }, { prompt: 'Third' }, { prompt: 'Fourth' }]} locale="en" onChange={change} />);
  expect(screen.queryByLabelText('Prompt')).not.toBeInTheDocument();
  const entry = screen.getByText('Questions 1').closest('details')!;
  entry.open = true;
  fireEvent(entry, new Event('toggle'));
  expect(screen.getByLabelText('Prompt')).toHaveValue('First');
  fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'Edited' } });
  expect(change).toHaveBeenCalledWith([{ prompt: 'Edited' }, { prompt: 'Second' }, { prompt: 'Third' }, { prompt: 'Fourth' }]);
});
it('progressively opens a large skill section without losing its data', () => {
  const change = vi.fn();
  render(<StructuredFields spec={{ type: 'object', label: ['Listening', 'Nghe'], collapsible: true, fields: { transcript: { type: 'text', label: ['Transcript', 'Lời thoại'] } } }} value={{ transcript: 'Retained transcript', mediaId: 'audio' }} locale="en" onChange={change} />);
  expect(screen.queryByLabelText('Transcript')).not.toBeInTheDocument();
  const entry = screen.getByText('Listening').closest('details')!;
  entry.open = true; fireEvent(entry, new Event('toggle'));
  expect(screen.getByLabelText('Transcript')).toHaveValue('Retained transcript');
  fireEvent.change(screen.getByLabelText('Transcript'), { target: { value: 'New transcript' } });
  expect(change).toHaveBeenCalledWith({ transcript: 'New transcript', mediaId: 'audio' });
});
