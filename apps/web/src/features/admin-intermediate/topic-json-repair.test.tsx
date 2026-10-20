import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';
import { ApiError, apiClient } from '../../lib/api/api-client';
import { IntermediateLessonEditor } from './intermediate-lesson-editor';
import { createTopicJsonTemplate } from './topic-json';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const template = createTopicJsonTemplate();
const broken = JSON.stringify({ ...template, writingModel: 'Dear guest,\n\nYour booking is confirmed.' });
const repaired = JSON.stringify({ ...template, writingModel: 'Dear guest, Your booking is confirmed.' });
const proposal = { source: repaired, explanation: 'Only model line breaks were replaced with spaces.', provider: 'discovery', model: 'fixture' };
function open(source: string) {
  render(<IntermediateLessonEditor category="reading" topic />);
  fireEvent.click(screen.getByText('Import a topic from JSON', { selector: 'summary' }));
  fireEvent.change(screen.getByLabelText('Topic JSON'), { target: { value: source } });
}
it('identifies the bad field and keeps the AI proposal separate until explicitly accepted', async () => {
  const save = vi.spyOn(apiClient, 'createContentImport');
  const repair = vi.spyOn(intermediateTopicClient, 'repairJson').mockResolvedValue(proposal);
  open(broken);
  expect(screen.getByRole('alert')).toHaveTextContent('writingModel: This field supports one line');
  fireEvent.click(screen.getByRole('button', { name: 'Ask AI to propose a JSON repair' }));
  expect(await screen.findByLabelText('Proposed JSON — not applied')).toHaveValue(repaired);
  expect(screen.getByLabelText('Topic JSON')).toHaveValue(broken);
  expect(screen.getByLabelText('Lesson title')).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed repair' }));
  expect(screen.getByLabelText('Lesson title')).toHaveValue(template.title);
  expect(screen.getByLabelText('Writing model response')).toHaveValue('Dear guest, Your booking is confirmed.');
  expect(screen.getByLabelText('Topic JSON')).toHaveValue(repaired);
  expect(repair).toHaveBeenCalledTimes(1);
  expect(save).not.toHaveBeenCalled();
});
it('refuses a provider candidate that changes an answer', async () => {
  const json = JSON.parse(repaired); json.readingQuestions[0].answerIndex = 1;
  vi.spyOn(intermediateTopicClient, 'repairJson').mockResolvedValue({ ...proposal, source: JSON.stringify(json) });
  open(broken);
  fireEvent.click(screen.getByRole('button', { name: 'Ask AI to propose a JSON repair' }));
  const repair = screen.getByRole('region', { name: 'Ask AI to propose a JSON repair' });
  expect(await within(repair).findByRole('alert')).toHaveTextContent('could not be verified');
  expect(screen.queryByLabelText('Proposed JSON — not applied')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Topic JSON')).toHaveValue(broken);
});
it('reports unavailable AI without retrying or replacing the JSON', async () => {
  const repair = vi.spyOn(intermediateTopicClient, 'repairJson').mockRejectedValue(new ApiError({ status: 503, code: 'TOPIC_JSON_REPAIR_UNAVAILABLE', message: 'Unavailable' }));
  open(broken);
  fireEvent.click(screen.getByRole('button', { name: 'Ask AI to propose a JSON repair' }));
  await screen.findByRole('link', { name: 'AI settings' });
  expect(screen.getByLabelText('Topic JSON')).toHaveValue(broken);
  expect(repair).toHaveBeenCalledTimes(1);
});
it('requires confirmation to replace manual edits made while AI was processing', async () => {
  let finish!: (value: typeof proposal) => void;
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  vi.spyOn(intermediateTopicClient, 'repairJson').mockReturnValue(new Promise(resolve => { finish = resolve; }));
  open(broken);
  fireEvent.click(screen.getByRole('button', { name: 'Ask AI to propose a JSON repair' }));
  fireEvent.change(screen.getByLabelText('Lesson title'), { target: { value: 'Manual title' } });
  finish(proposal);
  await screen.findByLabelText('Proposed JSON — not applied');
  fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed repair' }));
  expect(window.confirm).toHaveBeenCalledOnce();
  expect(screen.getByLabelText('Lesson title')).toHaveValue('Manual title');
  expect(screen.getByLabelText('Topic JSON')).toHaveValue(broken);
});
it('locates incomplete JSON and refuses to ask AI to invent missing content', async () => {
  const repair = vi.spyOn(intermediateTopicClient, 'repairJson');
  open('{\n  "title": "unfinished');
  expect(screen.getByRole('alert')).toHaveTextContent('Line 2, column');
  expect(screen.getByRole('button', { name: 'Ask AI to propose a JSON repair' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Go to JSON error' }));
  await waitFor(() => expect(screen.getByLabelText('Topic JSON')).toHaveFocus());
  expect(repair).not.toHaveBeenCalled();
});
