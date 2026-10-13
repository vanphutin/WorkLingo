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
});
