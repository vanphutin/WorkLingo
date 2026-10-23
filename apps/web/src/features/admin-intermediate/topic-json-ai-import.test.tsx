import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TopicJsonTransfer } from './topic-json-transfer';
import { createIntermediateLessonDraft } from './lesson-model';
import { createTopicJsonTemplate } from './topic-json';
afterEach(cleanup);
it('fills the JSON buffer from AI and requires explicit apply, preserving selected minutes', async () => {
  const apply = vi.fn();
  const json = { ...createTopicJsonTemplate(), durationMinutes: 90 };
  render(<TopicJsonTransfer draft={createIntermediateLessonDraft('reading')} dirty={false} disabled={false}
    incoming={{ id: 'generation-1', source: JSON.stringify(json, null, 2) }} onApply={apply} onDirtyChange={vi.fn()} />);
  expect(await screen.findByLabelText('Topic JSON')).toHaveValue(JSON.stringify(json, null, 2));
  expect(apply).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Topic JSON'), { target: { value: JSON.stringify({ ...json, title: 'Edited AI JSON' }) } });
  expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Apply JSON to form' }));
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ title: 'Edited AI JSON', durationMinutes: 90 }));
});
