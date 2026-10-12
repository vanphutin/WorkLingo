export const INTERMEDIATE_PROGRAM_ID = '10000000-0000-4000-8000-000000000002';

export const PROGRAM_CATALOG = [
  {
    availabilityStatus: 'COMING_SOON',
    description: 'Build essential English through guided four-skill practice.',
    displayOrder: 1,
    iconKey: 'beginner',
    id: '10000000-0000-4000-8000-000000000001',
    learningGoal: 'Understand and use practical English in familiar situations.',
    name: 'Beginner',
    proficiencyLabel: 'Foundation / Pre-A1–A2',
    slug: 'beginner',
  },
  {
    availabilityStatus: 'AVAILABLE',
    description: 'Use English confidently across everyday workplace situations.',
    displayOrder: 2,
    iconKey: 'intermediate',
    id: INTERMEDIATE_PROGRAM_ID,
    learningGoal: 'Communicate, understand and respond effectively at work.',
    name: 'Intermediate',
    proficiencyLabel: 'Intermediate / B1–B2',
    slug: 'intermediate',
  },
  {
    availabilityStatus: 'COMING_SOON',
    description: 'Prepare for TOEIC through practical workplace language evidence.',
    displayOrder: 3,
    iconKey: 'toeic',
    id: '10000000-0000-4000-8000-000000000003',
    learningGoal: 'Strengthen listening and reading while retaining four-skill transfer.',
    name: 'TOEIC',
    proficiencyLabel: 'TOEIC-oriented',
    slug: 'toeic',
  },
  {
    availabilityStatus: 'IN_DEVELOPMENT',
    description: 'Develop integrated English for a future band-oriented IELTS pathway.',
    displayOrder: 4,
    iconKey: 'ielts',
    id: '10000000-0000-4000-8000-000000000004',
    learningGoal: 'Build the language evidence required for guided IELTS preparation.',
    name: 'IELTS',
    proficiencyLabel: 'IELTS band-oriented',
    slug: 'ielts',
  },
] as const;

export type ProgramCatalogEntry = (typeof PROGRAM_CATALOG)[number];
