import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { Field } from './vocabulary-ui';
afterEach(cleanup);
it('associates exact unique captions with populated select controls without including option text in the label', () => {
  render(<><Field label="Source title"><select><option value="">All</option><option value="source-1">Synthetic source</option></select></Field><Field label="Another source"><select><option>Different option</option></select></Field></>);
  const control = screen.getByLabelText('Source title', { exact: true }) as HTMLSelectElement;
  expect(control).toHaveAccessibleName('Source title');
  expect(control.labels).toHaveLength(1);
  expect(control.labels![0]).toHaveTextContent(/^Source title$/);
  expect(control.labels![0]).toHaveAttribute('for', control.id);
  expect(control.id).not.toBe(screen.getByLabelText('Another source', { exact: true }).id);
  expect(control.options).toHaveLength(2);
});
