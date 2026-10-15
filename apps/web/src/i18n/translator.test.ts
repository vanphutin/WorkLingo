import { describe, expect, it } from 'vitest';
import { normalizeLocale, resolveLocale, formatLocale } from './locale';
import { translate, formatNumber, formatDate } from './translator';

const messages = {
  en: { greeting: 'Hello {name}', count: '{count, plural, one {# lesson} other {# lessons}}', fallback: 'Try again' },
  vi: { greeting: 'Xin chào {name}', count: '{count, plural, other {# bài học}}' },
};

describe('UI internationalization', () => {
  it('uses Vietnamese by default and rejects speech locales as UI preferences', () => {
    expect(normalizeLocale(undefined)).toBe('vi');
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('en-US')).toBe('vi');
    expect(normalizeLocale('EN')).toBe('vi');
    expect(formatLocale('vi')).toBe('vi-VN');
  });
  it('prefers a current switch, then account preference, then cookie, then default', () => {
    expect(resolveLocale({ current: 'en', account: 'vi', cookie: 'vi' })).toBe('en');
    expect(resolveLocale({ account: 'vi', cookie: 'en' })).toBe('vi');
    expect(resolveLocale({ cookie: 'en' })).toBe('en');
    expect(resolveLocale({ cookie: 'en-US' })).toBe('vi');
  });
  it('interpolates names and handles ICU plural categories', () => {
    expect(translate('vi', 'test', messages)('greeting', { name: 'An' })).toBe('Xin chào An');
    expect(translate('en', 'test', messages)('count', { count: 1 })).toBe('1 lesson');
    expect(translate('en', 'test', messages)('count', { count: 2 })).toBe('2 lessons');
    expect(translate('vi', 'test', messages)('count', { count: 2 })).toBe('2 bài học');
  });
  it('falls back to the English message and exposes missing keys without crashing', () => {
    expect(translate('vi', 'test', messages)('fallback')).toBe('Try again');
    // A malformed runtime key can still arrive from untyped integrations.
    expect(translate('vi', 'test', messages)('missing' as 'greeting')).toBe('test.missing');
  });
  it('formats numbers and the same instant in an explicitly chosen timezone', () => {
    expect(formatNumber('vi', 1234.5)).toBe('1.234,5');
    expect(formatNumber('en', 0.25, { style: 'percent' })).toBe('25%');
    const instant = new Date('2026-10-14T23:30:00Z');
    expect(formatDate('vi', instant, { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' })).toBe('15/10/2026');
    expect(instant.toISOString()).toBe('2026-10-14T23:30:00.000Z');
  });
});
