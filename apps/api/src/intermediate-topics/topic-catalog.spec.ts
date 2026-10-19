import { describe, expect, it } from 'vitest';
import { intermediateTopicCatalog } from './topic-catalog.js';

const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
describe('Curated Intermediate topic catalog', () => {
  it('contains 150 independently named bilingual categories, not generated lessons', () => {
    expect(intermediateTopicCatalog).toHaveLength(150);
    expect(new Set(intermediateTopicCatalog.map(t => t.key)).size).toBe(150);
    for (const topic of intermediateTopicCatalog) {
      expect(topic.key).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
      expect(topic.name).not.toBe(topic.nameEn);
      expect(topic.description.length).toBeGreaterThan(20);
      expect(topic).not.toHaveProperty('questions');
    }
  });
  it('never registers a name or alias against two different categories', () => {
    const seen = new Map<string, string>();
    for (const topic of intermediateTopicCatalog) {
      for (const name of [topic.name, topic.nameEn, ...topic.aliases]) {
        const key = normalize(name);
        expect(seen.get(key) ?? topic.key, `${name} collides with ${seen.get(key)}`).toBe(topic.key);
        seen.set(key, topic.key);
      }
    }
  });
  it('maps Vietnamese, English, unaccented names and known Restaurant typo to one category', () => {
    const restaurant = intermediateTopicCatalog.find(t => t.key === 'restaurants')!;
    const names = [restaurant.name, restaurant.nameEn, ...restaurant.aliases].map(normalize);
    expect(names).toEqual(expect.arrayContaining(['nhà hàng', 'restaurant', 'restaurants', 'nha hang', 'restaurent']));
  });
});
