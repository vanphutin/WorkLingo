import { describe, expect, it } from 'vitest';
import { formatDate, formatLevel, percent } from './evidence-format';

describe('localized learning evidence formatting', () => {
  it('formats known level labels in Vietnamese while preserving unknown identifiers', () => {
    expect(formatLevel('FOUNDATION_1', 'vi')).toBe('Nền tảng 1');
    expect(formatLevel('custom_level-v3', 'vi')).toBe('custom_level-v3');
  });
  it('uses Vietnamese numeric grouping without changing the rounded score', () => {
    expect(percent(12.3456, 'vi')).toBe('1.235%');
    expect(percent(0, 'vi')).toBe('0%');
  });
  it('renders the same instant using Vietnamese month labels', () => {
    expect(formatDate('2026-10-07T09:00:00.000Z', 'vi')).toBe('7 thg 10, 2026');
  });
});
