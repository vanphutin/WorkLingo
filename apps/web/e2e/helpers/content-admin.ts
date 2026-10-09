import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is required for the Content Admin E2E journey. Run pnpm setup:local first.`,
    );
  }
  return value;
}

export const ADMIN_CREDENTIALS = {
  email: requiredEnvironmentVariable('WORKLINGO_ADMIN_EMAIL'),
  password: requiredEnvironmentVariable('WORKLINGO_ADMIN_PASSWORD'),
};

export async function loginAsContentAdmin(
  page: Page,
  email = ADMIN_CREDENTIALS.email,
  password = ADMIN_CREDENTIALS.password,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();

  await page.waitForURL(/\/admin\/content/, { timeout: 15_000 });
  await expect(page.getByRole('region', { name: 'Content imports' })).toBeVisible();
}

export function createValidLessonSource(slug: string, title = 'Admin E2E Publishing Journey'): string {
  return `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: ${slug}
title: ${title}
level: foundation
duration_minutes: 60
objective: Verify authoring, validation, preview, audio generation, and publishing flow.

[WORD_BANK sprint-sync]
title: Sprint Sync Vocabulary

[[LANGUAGE_BLOCK sync-tasks]]
expression: sync tasks
meaning_vi: phối hợp công việc
pronunciation: /sɪŋk tæsks/
collocations: daily sync | sync tasks with the team
grammar_pattern: sync + noun
example: We sync tasks every morning at standup.
common_error: Do not confuse sync with sink.
[[/LANGUAGE_BLOCK]]

[/WORD_BANK]

[CONTENT sync-dialogue]
type: dialogue
text:
<<<
Alex: Good morning team, let us review our sprint tasks.
Mai: I have updated the backlog items for today.
>>>
[/CONTENT]

[AUDIO_SCRIPT sync-dialogue-audio]
speaker: Alex and Mai
script:
<<<
Alex: Good morning team, let us review our sprint tasks.
Mai: I have updated the backlog items for today.
>>>
[/AUDIO_SCRIPT]

[ACTIVITY activate-sync]
learning_block: activate
activity_type: writing
response_type: short_text
skills: writing
language_block_refs: sync-tasks

QUESTION:
Write one sentence about the tasks you need to coordinate today.
[/ACTIVITY]

[ACTIVITY check-sync-understanding]
learning_block: read_decode
activity_type: reading
response_type: multiple_choice
skills: reading
content_refs: sync-dialogue
language_block_refs: sync-tasks

QUESTION:
What did Mai update?

OPTIONS:
A. The backlog items
B. The meeting room
C. The sprint schedule

ANSWER:
A

EXPLANATION:
Mai specifically mentions updating the backlog items.

EVIDENCE:
sync-dialogue:2
[/ACTIVITY]

[ACTIVITY listen-dialogue]
learning_block: listen_reason
activity_type: listening
response_type: multiple_choice
skills: listening
content_refs: sync-dialogue
language_block_refs: sync-tasks
audio_ref: sync-dialogue-audio

QUESTION:
Why are Alex and Mai speaking?

OPTIONS:
A. To review sprint tasks
B. To cancel the sprint
C. To hire new team members

ANSWER:
A

EXPLANATION:
Alex opens the conversation by proposing a sprint-task review.
[/ACTIVITY]

[ACTIVITY respond-to-sync]
learning_block: respond
activity_type: speaking
response_type: shadowing
skills: speaking
language_block_refs: sync-tasks

QUESTION:
Practice speaking: "We sync tasks every morning at standup."
[/ACTIVITY]
`;
}
