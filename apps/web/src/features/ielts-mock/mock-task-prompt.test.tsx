import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MockTaskPrompt } from './mock-task-prompt';
it('renders authored Task 1 data as an accessible table without inventing values',()=>{
  render(<MockTaskPrompt prompt={'Summarise the data.\n\nMain mode | 2016 | 2024\nPrivate car | 52% | 31%\nBus or rail | 26% | 35%\n\nEach column totals 100%.'} />);
  expect(screen.getByRole('columnheader',{name:'2016'})).toBeVisible();
  expect(screen.getByRole('cell',{name:'52%'})).toBeVisible();
  expect(screen.getByRole('cell',{name:'35%'})).toBeVisible();
  expect(screen.getByText('Each column totals 100%.')).toBeVisible();
});
