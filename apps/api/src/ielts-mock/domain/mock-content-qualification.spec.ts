import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ieltsContentRoot } from '../../ielts-study/infrastructure/topic-content.js';
import { scoreObjectiveAnswer } from './ielts-mock-scoring.js';
import { expect, it } from 'vitest';
import { buildMock } from '../../ielts-beta-release/content.js';
import { qualifyIeltsMockPaper, type IeltsMockAudioManifest } from './mock-content-qualification.js';

it('cannot qualify the short single-type Beta paper as a full simulation', () => {
  const result = qualifyIeltsMockPaper(buildMock(), []);
  expect(result.qualifiedModes).not.toContain('EXAM_SIMULATION');
  expect(result.canPublish).toBe(false);
});
it('does not trust fake provenance or an unsupported extra accepted answer', async () => {
  const { readAuthoredMock } = await import('../infrastructure/authored-mock.js');
  const { paper, audioManifest } = await readAuthoredMock();
  expect(qualifyIeltsMockPaper(paper, audioManifest).issues).toEqual([]);
  const malformed=structuredClone(audioManifest);Object.assign(malformed[0]!,{provenance:null});
  expect(()=>qualifyIeltsMockPaper(paper,malformed)).not.toThrow();
  expect(qualifyIeltsMockPaper(paper,malformed).canPublish).toBe(false);
  const fake = audioManifest.map(entry => ({ ...entry, provenance: { ...entry.provenance, adapterName: 'fake-tts' } })) as IeltsMockAudioManifest;
  expect(qualifyIeltsMockPaper(paper, fake).qualifiedModes).not.toContain('EXAM_SIMULATION');
  const altered = structuredClone(paper);
  const short = altered.reading.passages.flatMap(passage => passage.questions).find(question => question.type === 'gap_fill' || question.type === 'short_answer')!;
  short.answerPolicy.acceptedAnswers.push('unsupported invention');
  expect(qualifyIeltsMockPaper(altered, audioManifest).canPublish).toBe(false);
});

it('accepts the evidenced short physical-constraint answer and aligns preview windows with new evidence', async () => {
  const paper=JSON.parse(await readFile(path.join(ieltsContentRoot,'mocks/academic-02/paper.json'),'utf8'));
  const reading7=paper.reading.passages.flatMap((p: {questions: Array<{order:number;answerPolicy:Parameters<typeof scoreObjectiveAnswer>[1]}>})=>p.questions).find((q:{order:number})=>q.order===7);
  expect(scoreObjectiveAnswer('space',reading7.answerPolicy)).toBe(true);
  const scripts=JSON.parse(await readFile(path.join(ieltsContentRoot,'mocks/academic-02/listening-scripts.json'),'utf8'));
  expect(scripts.parts[0].segments.find((s:{purpose?:string})=>s.purpose?.startsWith('Review')).questionOrders[0]).toBe(4);
  expect(scripts.parts[1].segments.find((s:{purpose?:string})=>s.purpose?.startsWith('Review')).questionOrders[0]).toBe(15);
  for (const part of scripts.parts) {
    let earlier='';
    for (const segment of part.segments) {
      if (segment.kind==='speech') earlier+=' '+segment.text;
      else if (segment.purpose.startsWith('Review')) for (const order of segment.questionOrders) {
        const question=paper.listening.parts[part.part-1].questions.find((q:{order:number})=>q.order===order);
        const quote=/“([^”]+)”/u.exec(question.explanation)![1]!;
        expect(earlier.includes(quote), 'Preview must precede first answer evidence: '+order).toBe(false);
      }
    }
  }
});
