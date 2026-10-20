import { describe, expect, it } from 'vitest';
import * as format from './index.js';

describe('Foundation authoring scaffolds', () => {
  it.each(format.foundationCategories)('%s is editable, complete in structure, but not publishable', (category) => {
    const template = format.getFoundationTemplate(category);
    expect(template).toMatchObject({ id: `foundation-${category}`, version: 1 });
    const parsed = format.parseLessonSource(template.source);
    expect(parsed.issues).toEqual([]);
    expect(parsed.document.foundation?.category).toBe(category);
    expect(parsed.document.activities.map((a) => a.activityType)).toEqual(['reading', 'listening', 'speaking', 'writing']);
    const result = format.analyzeLessonSource(template.source);
    expect(result.canPublish).toBe(false);
    expect(result.normalizedDraft).toBeNull();
    expect(result.issues.some((i) => i.code === 'VAL_INCOMPLETE_TEMPLATE')).toBe(true);
  });

  it('models gender declarations and bare-name continuation in the listening scaffold', () => {
    const template = format.getFoundationTemplate('listening');
    const parsed = format.parseLessonSource(template.source);
    const dialogue = format.parseDialogue(parsed.document.audioScripts[0]!.script);
    expect(dialogue.isDialogue).toBe(true);
    expect(dialogue.issues).toEqual([]);
    expect(dialogue.speakers).toEqual([
      { id: 'an', name: 'An', gender: 'male' },
      { id: 'lan', name: 'Lan', gender: 'female' },
    ]);
    expect(dialogue.turns.map((turn) => turn.speaker)).toEqual(['an', 'lan', 'an']);
  });
});
