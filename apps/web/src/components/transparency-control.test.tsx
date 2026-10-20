import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TransparencyControl, TransparencySync } from './transparency-control';
import { ThemeControl } from './theme-control';
import { LocaleProvider } from '../i18n/provider';
import type { ReactNode } from 'react';

function renderPreferences(children: ReactNode) {
  return render(<><TransparencySync />{children}</>);
}

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.reduceTransparency;
  delete document.documentElement.dataset.theme;
  localStorage.clear();
  vi.restoreAllMocks();
});

it('persists the checkbox and updates every mounted control without replacing a draft', () => {
  renderPreferences(<><TransparencyControl /><TransparencyControl /><input aria-label="Draft" defaultValue="Keep this answer" /></>);
  const controls = screen.getAllByRole('checkbox', { name: 'Reduce transparency' });
  fireEvent.click(controls[0]!);
  for (const control of controls) expect(control).toBeChecked();
  expect(localStorage.getItem('worklingo:reduce-transparency:v1')).toBe('reduce');
  expect(document.documentElement.dataset.reduceTransparency).toBe('true');
  expect(screen.getByLabelText('Draft')).toHaveValue('Keep this answer');
  fireEvent.click(controls[1]!);
  for (const control of controls) expect(control).not.toBeChecked();
  expect(document.documentElement.dataset.reduceTransparency).toBeUndefined();
  expect(localStorage.getItem('worklingo:reduce-transparency:v1')).toBeNull();
});

it('uses the pre-paint snapshot after mount and still works with blocked storage', () => {
  document.documentElement.dataset.reduceTransparency = 'true';
  localStorage.setItem('worklingo:reduce-transparency:v1', 'reduce');
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('Blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
  renderPreferences(<TransparencyControl />);
  const control = screen.getByRole('checkbox');
  expect(control).toBeChecked();
  fireEvent.click(control);
  expect(control).not.toBeChecked();
  fireEvent.click(control);
  expect(control).toBeChecked();
});

it('synchronizes other tabs while keeping the independent theme preference', () => {
  renderPreferences(<><TransparencyControl /><ThemeControl /></>);
  fireEvent.click(screen.getByRole('button', { name: /color theme: system/i }));
  fireEvent(window, new StorageEvent('storage', { key: 'worklingo:reduce-transparency:v1', newValue: 'reduce' }));
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(document.documentElement.dataset.theme).toBe('light');
  fireEvent(window, new StorageEvent('storage', { key: 'unrelated', newValue: 'other' }));
  expect(screen.getByRole('checkbox')).toBeChecked();
  fireEvent(window, new StorageEvent('storage', { key: 'worklingo:reduce-transparency:v1', newValue: 'invalid' }));
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  fireEvent(window, new StorageEvent('storage', { key: 'worklingo:reduce-transparency:v1', newValue: 'reduce' }));
  fireEvent(window, new StorageEvent('storage', { key: null, newValue: null }));
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(screen.getByRole('button', { name: /color theme: system/i })).toBeInTheDocument();
});

it('exposes a Vietnamese label and associated description', () => {
  renderPreferences(<LocaleProvider initialLocale="vi"><TransparencyControl /></LocaleProvider>);
  const control = screen.getByRole('checkbox', { name: 'Giảm độ trong suốt' });
  expect(control).toHaveAccessibleDescription(/bề mặt đặc/i);
});

it('keeps synchronization alive while no settings checkbox is mounted', () => {
  const view = renderPreferences(<input aria-label="Draft" defaultValue="Keep my answer" />);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  fireEvent(window, new StorageEvent('storage', { key: 'worklingo:reduce-transparency:v1', newValue: 'reduce' }));
  expect(document.documentElement.dataset.reduceTransparency).toBe('true');
  expect(screen.getByLabelText('Draft')).toHaveValue('Keep my answer');
  view.rerender(<><TransparencySync /><TransparencyControl /></>);
  expect(screen.getByRole('checkbox')).toBeChecked();
  view.rerender(<TransparencySync />);
  fireEvent(window, new StorageEvent('storage', { key: null, newValue: null }));
  expect(document.documentElement.dataset.reduceTransparency).toBeUndefined();
  view.rerender(<><TransparencySync /><TransparencyControl /></>);
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});

it('reconciles a storage change that happened between the head script and root hydration', () => {
  localStorage.setItem('worklingo:reduce-transparency:v1', 'reduce');
  expect(document.documentElement.dataset.reduceTransparency).toBeUndefined();
  renderPreferences(<TransparencyControl />);
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(document.documentElement.dataset.reduceTransparency).toBe('true');
});
