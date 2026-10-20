import { afterEach, expect, it, vi } from 'vitest';
import { themeInitScript } from './theme';

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.reduceTransparency;
  vi.restoreAllMocks();
});

it('restores both appearance preferences before paint without touching an entered draft', () => {
  localStorage.setItem('worklingo:theme:v1', 'dark');
  localStorage.setItem('worklingo:reduce-transparency:v1', 'reduce');
  const input = document.createElement('input');
  input.value = 'An unfinished answer';
  document.body.append(input);
  new Function(themeInitScript)();
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.documentElement.dataset.reduceTransparency).toBe('true');
  expect(input.value).toBe('An unfinished answer');
  input.remove();
});

it.each(['invalid', 'false', 'null'])('ignores malformed stored appearance preferences: %s', (value) => {
  localStorage.setItem('worklingo:theme:v1', value);
  localStorage.setItem('worklingo:reduce-transparency:v1', value);
  new Function(themeInitScript)();
  expect(document.documentElement.dataset.theme).toBeUndefined();
  expect(document.documentElement.dataset.reduceTransparency).toBeUndefined();
});

it('restores transparency even when reading the theme preference is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
    if (key === 'worklingo:theme:v1') throw new Error('Blocked');
    return key === 'worklingo:reduce-transparency:v1' ? 'reduce' : null;
  });
  expect(() => new Function(themeInitScript)()).not.toThrow();
  expect(document.documentElement.dataset.reduceTransparency).toBe('true');
});

it('keeps theme usable when only transparency storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
    if (key === 'worklingo:reduce-transparency:v1') throw new Error('Blocked');
    return key === 'worklingo:theme:v1' ? 'light' : null;
  });
  expect(() => new Function(themeInitScript)()).not.toThrow();
  expect(document.documentElement.dataset.theme).toBe('light');
});
