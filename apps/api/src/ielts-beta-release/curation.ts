import { ieltsBandCurriculumContentSchema, ieltsBridgeModuleContentSchema, orientationContentSchema,
  type IeltsBandCurriculumContent, type IeltsBridgeModuleContent, type OrientationContent } from '@worklingo/contracts';

type Choice = readonly [prompt: string, options: string[], answerIndex: number, explanation: string];
const exercises: Record<string, Choice[]> = {
  listening: [
    ['Transcript: “Please send the form by email; a paper copy is not necessary.” Form: submission method?', ['post', 'email', 'in person'], 1, '“By email” specifies the method; paper is explicitly unnecessary.'],
    ['Transcript: “The old price was fifteen pounds, but this course now costs thirty pounds.” Form: current fee?', ['fifteen pounds', 'thirty pounds', 'forty pounds'], 1, '“Now” contrasts the current thirty-pound fee with the old price.'],
    ['Transcript: “The bus leaves at nine. Arrive at the library at eight forty-five to register.” Form: registration location?', ['station', 'bus', 'library'], 2, 'The form asks WHERE to register, not when the bus leaves. The location is the library.'],
  ],
  reading: [
    ['Passage: “The centre opens at ten on weekdays.” Statement: “On weekdays the centre opens at ten.”', ['TRUE', 'FALSE', 'NOT GIVEN'], 0, 'The statement directly agrees with the opening time in the passage.'],
    ['Passage: “The pilot ran for six months and was not extended.” Statement: “The pilot continued after six months.”', ['TRUE', 'FALSE', 'NOT GIVEN'], 1, '“Was not extended” directly contradicts continued operation.'],
    ['Passage: “Residents borrowed forty tools during June.” Statement: “Most borrowers were retired.”', ['TRUE', 'FALSE', 'NOT GIVEN'], 2, 'A loan count says nothing about borrowers’ employment status. Neither agreement nor contradiction is justified.'],
  ],
  writing: [
    ['Prompt: “Why do some adults avoid training, and how can access be improved?” Which outline covers both requirements?', ['Describe training history', 'Explain barriers, then match solutions to those barriers', 'List benefits without barriers'], 1, 'Both why and how must be addressed; matching solutions to barriers gives the essay a clear logic.'],
    ['Task 1 table: repair-course participation rises from 6% in 2018 to 23% in 2024. Which statement reports evidence accurately?', ['Participation almost quadrupled', 'Participation fell', 'Government advertising caused the rise'], 0, '23 is nearly four times 6. The table gives no evidence of the cause.'],
  ],
  speaking: [
    ['Question: “How often do you use your local library?” Which answer responds directly?', ['Libraries have a long history.', 'About twice a month, usually to borrow novels.', 'I might learn another language.'], 1, 'The answer gives a frequency and a relevant detail.'],
    ['Question: “Would you like to learn to repair things?” Which answer develops a relevant reason?', ['Yes, because fixing a simple fault could save money and reduce waste.', 'There are many kinds of transport.', 'Repair is a word in English.'], 0, 'The answer responds to the preference question and explains its reason.'],
  ],
};

export function curateBridge(value: IeltsBridgeModuleContent): IeltsBridgeModuleContent {
  const choices = exercises[value.skill]!;
  const stages = value.stages.map((stage) => {
    const index = ['easy_practice', 'increased_practice', 'timed_practice'].indexOf(stage.type);
    if (index < 0 || index >= choices.length) return stage;
    const [prompt, options, answerIndex, explanation] = choices[index]!;
    return { ...stage, task: { kind: 'single_choice' as const, prompt, options, answerIndex },
      instruction: 'Read the supplied text and question. Choose one option, then submit your answer to receive feedback.',
      feedback: { correct: explanation, incorrect: `Check the task and the complete evidence. ${explanation}` } };
  }).map((stage) => {
    if (value.skill === 'writing' && (stage.type === 'independent_practice' || stage.type === 'timed_practice')) {
      const timed = stage.type === 'timed_practice';
      return { ...stage, instruction: 'Plan a relevant response. A teacher must review writing quality; this exercise does not award an official band.',
        task: { kind: 'short_text' as const, minWords: timed ? 50 : 40,
          prompt: timed ? 'In two minutes, outline both views and your opinion: Should local governments or employers pay for adult digital-skills courses? Include one reason and one example for each view.'
            : 'Plan a causes-and-solutions essay: Many adults want practical training but do not attend. Identify two plausible barriers and propose a solution linked to each barrier. Explain the links.',
          rubric: { criteria: ['Cover every requested part', 'Link reasons and examples', 'Distinguish evidence from assumptions'], modelAnswer: timed
            ? 'Public funding can reach adults outside employment, for example unemployed jobseekers. Employer funding can target current workplace needs, such as spreadsheet training. I would combine a public basic entitlement with employer support for specialist skills.'
            : 'Working hours can clash with class times, so evening or flexible sessions could improve access. Fees may exclude low-income adults, so targeted subsidies could help. Both proposals address a stated barrier rather than merely advertising the courses.' } } };
    }
    if (value.skill === 'speaking' && stage.type === 'timed_practice') return { ...stage,
      task: { kind: 'spoken_response' as const, prompt: 'Do you prefer learning practical skills from a person or from a video? Give a direct answer, a reason and a recent example.', preparationSeconds: 15, responseSeconds: 60,
        rubric: { criteria: ['Respond directly', 'Develop a reason with an example', 'Use intelligible connected speech'], modelAnswer: 'I prefer learning from a person because I can ask questions immediately. Last month my neighbour showed me how to mend a bag, and she helped me correct the tension when my first stitches were too loose.' } } };
    return stage;
  });
  return ieltsBridgeModuleContentSchema.parse({ ...value, stages });
}

const bandSkills = [
  ['Identify familiar dates and final preferences after a correction.', 'Locate one explicit fact in a short paragraph.', 'Write linked sentences about a familiar activity.', 'Answer familiar questions with one relevant detail.'],
  ['Follow short exchanges and distinguish an accepted option from a rejected one.', 'Separate stated facts from missing information.', 'Plan a paragraph with a point and one supporting example.', 'Explain a familiar preference with a reason and an example.'],
  ['Follow the sequence of a briefing and complete accurate notes.', 'Compare statements with a passage and justify disagreement.', 'Develop a paragraph with relevant support and accurate basic linking.', 'Maintain a connected response while repairing unclear wording.'],
  ['Track changes of plan in an educational conversation.', 'Follow an argument across paragraphs and identify limits of evidence.', 'Cover every instruction and organise an overview or balanced response.', 'Sustain a long turn using a sequence and supporting details.'],
  ['Recognise paraphrased explanations and speaker qualifications.', 'Distinguish association from a supported causal explanation.', 'Select precise comparisons and develop a qualified argument.', 'Discuss an abstract issue with reasons, examples and qualifications.'],
  ['Integrate detail with the speaker’s position across an extended discussion.', 'Evaluate how examples support a writer’s qualified position.', 'Control cohesion and vocabulary without overstating the supplied evidence.', 'Respond flexibly to counterarguments with precise supporting language.'],
  ['Interpret nuanced stance and revise an inference when later evidence changes it.', 'Evaluate competing interpretations while preserving uncertainty and scope.', 'Develop a precise, nuanced response with consistent grammatical control.', 'Express and qualify complex ideas spontaneously and coherently.'],
] as const;

export function curateBand(value: IeltsBandCurriculumContent): IeltsBandCurriculumContent {
  return ieltsBandCurriculumContentSchema.parse({ ...value, stages: value.stages.map((stage, index) => {
    const outcomes = bandSkills[index]!;
    return { ...stage, learningOutcomes: [...outcomes],
      competencies: stage.competencies.map((item) => ({ ...item, description: outcomes[['listening', 'reading', 'writing', 'speaking'].indexOf(item.skill)]! })),
      assessmentCriteria: ['Use multiple completed server-evaluated samples across all four skills. Local pathway thresholds are learning heuristics, not certified IELTS bands.', 'Writing and Speaking still require the existing teacher-review gates.'],
      remediationPaths: stage.remediationPaths.map((item) => ({ ...item, action: `${stage.title}: ${outcomes[['listening', 'reading', 'writing', 'speaking'].indexOf(item.skill)]} Review one error, explain the correction, then apply it to a fresh example.` })),
    };
  }) });
}

export function curateOrientation(value: OrientationContent): OrientationContent {
  return orientationContentSchema.parse({ ...value, description: 'Original local Beta orientation and guided practice. WorkLingo is not an IELTS certification service.',
    slides: value.slides.map((slide) => slide.slug === 'welcome-to-ielts' ? { ...slide,
      body: 'Learn the test structure, then practise step by step. This local Beta uses original fictional material, offline speech and uncalibrated score estimates; it does not award an official IELTS result.',
      transcript: 'Welcome to local IELTS Beta practice. Learn the four skills, follow the guided pathway, and use feedback to improve. Writing and Speaking require teacher review. Practice scores are not official IELTS results.' }
      : slide.slug === 'writing-tasks' ? { ...slide, body: 'Academic Writing lasts 60 minutes: Task 1 summarises visual information (at least 150 words); Task 2 develops a response (at least 250 words) and has twice the weight. General Training Task 1 is a letter.',
        transcript: 'Academic Writing has two tasks in sixty minutes. Task one summarises supplied visual information in at least one hundred and fifty words. Task two requires at least two hundred and fifty words and carries twice the weight. General Training uses a letter for task one.' } : slide) });
}
