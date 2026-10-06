import { describe, expect, it } from 'vitest';
import { MasteryCalculator } from './mastery-calculator';
import { TestClock } from './clock.port';
import type { MasteryRecordInput } from './mastery.types';

describe('MasteryCalculator (deterministic SRS)', () => {
  const clock = new TestClock(new Date('2026-10-06T12:00:00Z'));

  it('initializes mastery record on first correct evidence', () => {
    const calculator = new MasteryCalculator(clock);
    const result = calculator.calculateNextState({
      currentRecord: null,
      score: 1.0,
      eventType: 'CORRECT_RECALL',
    });

    expect(result.state).toBe('LEARNING');
    expect(result.score).toBeGreaterThanOrEqual(0.8);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.intervalDays).toBe(1.0);
    expect(result.nextReviewAt).toEqual(new Date('2026-10-07T12:00:00Z'));
  });

  it('marks NEEDS_ATTENTION with reset interval on first failed evidence', () => {
    const calculator = new MasteryCalculator(clock);
    const result = calculator.calculateNextState({
      currentRecord: null,
      score: 0.0,
      eventType: 'INCORRECT_ATTEMPT',
    });

    expect(result.state).toBe('NEEDS_ATTENTION');
    expect(result.score).toBeLessThanOrEqual(0.3);
    expect(result.intervalDays).toBe(1.0);
  });

  it('expands interval on repeated successes and transitions to STABLE', () => {
    const calculator = new MasteryCalculator(clock);
    let current: MasteryRecordInput = {
      score: 0.8,
      confidence: 0.5,
      intervalDays: 1.0,
      state: 'LEARNING',
    };

    // First expansion: 1 -> 3 days
    current = calculator.calculateNextState({
      currentRecord: current,
      score: 1.0,
      eventType: 'CORRECT_RECALL',
    });
    expect(current.intervalDays).toBe(3.0);
    expect(current.state).toBe('LEARNING');

    // Second expansion: 3 -> 7 days (becomes STABLE when interval >= 7 and score >= 0.85)
    current = calculator.calculateNextState({
      currentRecord: current,
      score: 1.0,
      eventType: 'CORRECT_RECALL',
    });
    expect(current.intervalDays).toBe(7.0);
    expect(current.state).toBe('STABLE');
  });

  it('demotes stable item to NEEDS_ATTENTION and resets interval upon failure', () => {
    const calculator = new MasteryCalculator(clock);
    const stableItem: MasteryRecordInput = {
      score: 0.95,
      confidence: 0.9,
      intervalDays: 14.0,
      state: 'STABLE',
    };

    const failed = calculator.calculateNextState({
      currentRecord: stableItem,
      score: 0.2,
      eventType: 'INCORRECT_ATTEMPT',
    });

    expect(failed.state).toBe('NEEDS_ATTENTION');
    expect(failed.intervalDays).toBe(1.0);
    expect(failed.score).toBeLessThan(stableItem.score);
  });
});
