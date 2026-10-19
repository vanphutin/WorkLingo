import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createIntermediateLessonDraft } from './lesson-model';
import { TopicLessonOutline } from './topic-lesson-outline';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('marks the visible question instead of a large containing section as current', () => {
  let notify!: IntersectionObserverCallback;
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { notify = callback; }
    observe() {} disconnect() {}
  });
  render(<>
    <TopicLessonOutline prefix="topic" draft={createIntermediateLessonDraft('reading')} hasReview={false} canSave />
    <section id="topic-listening" /><fieldset id="topic-listening-question-1" />
  </>);
  fireEvent.click(screen.getByText('Lesson outline', { selector: 'summary' }));
  act(() => notify([
    { isIntersecting: true, target: document.getElementById('topic-listening')!, boundingClientRect: new DOMRect(0, -6000, 100, 7000), intersectionRatio: 1, intersectionRect: new DOMRect(), rootBounds: null, time: 0 },
    { isIntersecting: true, target: document.getElementById('topic-listening-question-1')!, boundingClientRect: new DOMRect(0, 24, 100, 900), intersectionRatio: 1, intersectionRect: new DOMRect(), rootBounds: null, time: 0 },
  ], {} as IntersectionObserver));
  const outline = screen.getByRole('navigation', { name: 'Lesson outline' });
  expect(within(outline).getByRole('link', { name: 'Listening question 1' })).toHaveAttribute('aria-current', 'location');
  expect(within(outline).getByRole('link', { name: '1 listening questions' })).not.toHaveAttribute('aria-current');
});
