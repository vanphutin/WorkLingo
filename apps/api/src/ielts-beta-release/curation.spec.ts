import { describe, expect, it } from 'vitest';
import { INITIAL_IELTS_BAND_CURRICULUM, ieltsBandCurriculumContentSchema, ieltsBridgeModuleContentSchema } from '@worklingo/contracts';
import { IELTS_BRIDGE_SEEDS } from '../ielts-bridge/infrastructure/seed-ielts-bridge.js';
import { curateBand, curateBridge } from './curation.js';
import { conversion } from './content.js';

describe('curation rather than blind fixture publication', () => {
  it('provides distinct objective practice and concrete productive prompts for all four skills', () => {
    for (const original of IELTS_BRIDGE_SEEDS) {
      const content = curateBridge(original);
      expect(() => ieltsBridgeModuleContentSchema.parse(content)).not.toThrow();
      const prompts = content.stages.flatMap((stage) => 'prompt' in stage.task ? [stage.task.prompt] : []);
      expect(new Set(prompts).size).toBe(prompts.length);
      expect(content).not.toEqual(original);
    }
  });
  it('retains the seven-stage evidence gates and gives skill-specific remediation', () => {
    const curriculum = curateBand(INITIAL_IELTS_BAND_CURRICULUM);
    expect(() => ieltsBandCurriculumContentSchema.parse(curriculum)).not.toThrow();
    expect(curriculum.stages.map((stage) => stage.exitCriteria)).toEqual(INITIAL_IELTS_BAND_CURRICULUM.stages.map((stage) => stage.exitCriteria));
    expect(new Set(curriculum.stages.flatMap((stage) => stage.remediationPaths.map((item) => item.action))).size).toBe(28);
  });
  it('uses published average reference points while distinguishing listening and reading', () => {
    const listening = conversion('listening'); const reading = conversion('reading');
    expect(listening[16]?.mockBand).toBe(5); expect(reading[15]?.mockBand).toBe(5);
    for (const scale of [listening, reading]) {
      expect(scale[23]?.mockBand).toBe(6); expect(scale[30]?.mockBand).toBe(7); expect(scale[35]?.mockBand).toBe(8);
    }
    expect(listening[15]?.mockBand).toBe(4.5);
  });
});
