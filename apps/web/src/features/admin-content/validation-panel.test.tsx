import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/provider';
import { ValidationPanel } from './validation-panel';

afterEach(cleanup);

it('explains missing dialogue genders to Vietnamese lesson authors', () => {
  render(<LocaleProvider initialLocale="vi"><ValidationPanel
    isValidating={false} canPublish={false} lastValidatedRevision={1} currentDraftRevision={1}
    onValidate={vi.fn()} onSelectIssue={vi.fn()}
    issues={[{ code: 'DIALOGUE_MISSING_GENDER', severity: 'error', message: 'Speaker needs explicit gender.',
      range: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 10, offset: 9 } } }]}
  /></LocaleProvider>);
  expect(screen.getByText(/với hơn hai nhân vật/i)).toHaveTextContent('bắt buộc khai báo nhãn cho từng người');
});
