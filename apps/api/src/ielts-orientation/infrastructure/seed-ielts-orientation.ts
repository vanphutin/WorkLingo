import { orientationContentSchema, type OrientationContent } from '@worklingo/contracts';

const slide = (
  id: string,
  slug: string,
  title: string,
  body: string,
  transcript: string,
  question: OrientationContent['slides'][number]['question'] = null,
) => ({ id, slug, title, body, transcript, imageAssetId: null, audioAssetId: null, question });

export const IELTS_ORIENTATION_SEED = orientationContentSchema.parse({
  title: 'Welcome to IELTS',
  description: 'A short, guided introduction to the IELTS test and your WorkLingo pathway.',
  slides: [
    slide('41000000-0000-4000-8000-000000000001', 'welcome-to-ielts', 'Welcome to IELTS',
      'Start with the shape and purpose of the test before learning exam strategies.',
      'Welcome to IELTS. In this orientation, you will understand the test, its four skills, band scores, and how WorkLingo will help you prepare.'),
    slide('41000000-0000-4000-8000-000000000002', 'what-is-ielts', 'What is IELTS?',
      'IELTS measures how effectively you understand and communicate in English. It tests Listening, Reading, Writing and Speaking.',
      'IELTS is an international English language test. It measures practical comprehension and communication across Listening, Reading, Writing, and Speaking.'),
    slide('41000000-0000-4000-8000-000000000003', 'academic-and-general', 'Academic and General Training',
      'Both versions share Listening and Speaking. Reading and Writing reflect different purposes and contexts.',
      'IELTS Academic is commonly used for higher education and professional registration. General Training is often used for migration and everyday workplace contexts. Listening and Speaking are shared.', {
        slug: 'shared-skills-check', prompt: 'Which skills are shared by IELTS Academic and General Training?',
        options: ['Listening and Speaking', 'Reading and Writing', 'Writing only'], answerIndex: 0,
        explanation: 'Academic and General Training use the same Listening and Speaking tests.',
      }),
    slide('41000000-0000-4000-8000-000000000004', 'four-skills', 'One score, four skills',
      'Each skill receives a band score. Your overall band is calculated from all four skill scores.',
      'IELTS reports a band for each of the four skills and an overall band. Strong performance in one skill does not replace the need to develop the others.'),
    slide('41000000-0000-4000-8000-000000000005', 'listening-and-reading', 'Listening and Reading',
      'You identify details, follow ideas, understand purpose, and reason from spoken or written information—not just match keywords.',
      'Listening and Reading require accurate comprehension. WorkLingo will train you to connect details, logic, speaker or writer purpose, and inference instead of relying only on keywords.'),
    slide('41000000-0000-4000-8000-000000000006', 'writing-tasks', 'Writing Tasks',
      'Task 1 presents information or a practical situation. Task 2 asks you to develop and support a position clearly.',
      'IELTS Writing has two tasks. The exact Task 1 differs between Academic and General Training. Task 2 requires a clear, developed response supported by relevant ideas.'),
    slide('41000000-0000-4000-8000-000000000007', 'speaking-parts', 'Speaking Parts 1, 2 and 3',
      'You answer familiar questions, speak at length from a prompt, then discuss connected ideas in greater depth.',
      'The Speaking test is an interview. Part 1 begins with familiar topics. Part 2 gives you preparation time and a longer turn. Part 3 develops a deeper discussion.'),
    slide('41000000-0000-4000-8000-000000000008', 'band-scores', 'Band Scores 0 to 9',
      'Band scores describe demonstrated performance. WorkLingo treats them as evidence targets, not shortcuts or guarantees.',
      'IELTS uses a band scale from zero to nine. Progress comes from stronger language and task performance. WorkLingo will not invent an official score from incomplete evidence.', {
        slug: 'band-evidence-check', prompt: 'What should determine progress toward a higher band?',
        options: ['Keyword tricks', 'Demonstrated language and task performance', 'Time spent online'], answerIndex: 1,
        explanation: 'Reliable progress is based on demonstrated performance, not shortcuts or online time.',
      }),
    slide('41000000-0000-4000-8000-000000000009', 'your-worklingo-path', 'Your WorkLingo pathway',
      'Next, IELTS Bridge will introduce question types through explanation, guided examples, supported practice and gradual timing.',
      'You now know the structure of IELTS. Your next stage will not throw you directly into a difficult full test. WorkLingo will introduce question types, strategies, guided examples, feedback, review, and timed practice step by step.'),
  ],
});

interface OrientationSeedDatabase {
  ieltsOrientation: {
    upsert(input: {
      where: { slug: string };
      update: Record<string, never>;
      create: { slug: string; draftContent: OrientationContent };
    }): Promise<unknown>;
  };
}

export async function seedIeltsOrientation(database: OrientationSeedDatabase): Promise<void> {
  await database.ieltsOrientation.upsert({
    where: { slug: 'ielts-orientation' },
    update: {},
    create: { slug: 'ielts-orientation', draftContent: IELTS_ORIENTATION_SEED },
  });
}
