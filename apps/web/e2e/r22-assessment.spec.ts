import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
const requireApi = createRequire(
  path.resolve(__dirname, '../../api/package.json'),
);
const { PrismaClient } = requireApi('@prisma/client');
const evidence =
  process.env.WL_R22_BROWSER_EVIDENCE_DIR ??
  'C:/Users/ASUS/AppData/Local/Temp/worklingo-r22-20261107/browser';
const url =
  process.env.WL_R22_TEST_DATABASE_URL ??
  readFileSync(path.join(evidence, '../database-url.txt'), 'utf8').trim();
const target = new URL(url);
if (
  `${target.hostname}:${target.port}${target.pathname}` !==
  '127.0.0.1:55452/worklingo_r22'
)
  throw new Error('OWNED_R22_DATABASE_REQUIRED');
test('four saved skill workflows show versioned learner feedback and authorized admin history', async ({
  page,
}, info) => {
  mkdirSync(evidence, { recursive: true });
  const db = new PrismaClient({ datasourceUrl: url });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    const email = `r22-browser-${randomUUID()}@example.test`;
    expect(
      (
        await page.request.post('/api/v1/auth/register', {
          data: {
            email,
            displayName: 'R22 synthetic browser learner',
            password: 'R22-synthetic-password-123!',
          },
        })
      ).status(),
    ).toBe(201);
    const state = await (
      await page.request.get('/api/v1/me/onboarding')
    ).json();
    expect(
      (
        await page.request.post('/api/v1/me/onboarding/self-placement', {
          data: {
            clientConfirmationId: randomUUID(),
            selectedLevelCode: state.eligibleLevels.find(
              (l: { available: boolean }) => l.available,
            ).code,
          },
        })
      ).status(),
    ).toBe(200);
    const user = await (await page.request.get('/api/v1/me')).json();
    expect(
      (
        await page.request.patch('/api/v1/me/preferences', {
          headers: { 'x-worklingo-account-id': user.id },
          data: { locale: 'en' },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await page.request.patch('/api/v1/me/audio-settings', {
          data: { sourceId: 'published-audio', browserVoiceId: null },
        })
      ).ok(),
    ).toBe(true);
    const response = await page.request.post('/api/v1/learning-sessions', {
      data: { clientSessionId: randomUUID(), durationMinutes: 60 },
    });
    expect(response.status(), await response.text()).toBe(201);
    const session = await response.json();
    expect(
      (
        await page.request.post(`/api/v1/learning-sessions/${session.id}/start`)
      ).status(),
    ).toBe(200);
    const lesson = await db.lessonVersion.findUniqueOrThrow({
      where: { id: session.lessonVersionId },
    });
    const snapshot = lesson.parsedContent as {
      activities: Array<{
        id: string;
        activityType: string;
        payload: {
          questions?: Array<{
            answerIndex: number;
            options: string[];
            acceptedAnswers?: string[];
          }>;
        };
      }>;
    };
    await page.goto(`/sessions/${session.id}`);
    const seen = new Set<string>();
    let lastAttempt = '',
      auditAttempt = '';
    for (const activityId of session.plan.blocks.flatMap(
      (b: { activityIds: string[] }) => b.activityIds,
    )) {
      const activity = snapshot.activities.find((a) => a.id === activityId)!;
      await expect(page.locator('.activity-prompt')).toBeVisible();
      if (
        activity.activityType === 'reading' ||
        activity.activityType === 'listening'
      ) {
        for (const q of activity.payload.questions ?? [])
          if (q.options.length)
            await page
              .getByLabel(q.options[q.answerIndex]!, { exact: true })
              .check();
      } else if (
        activity.activityType === 'writing' ||
        (await page.getByRole('textbox').count())
      )
        await page
          .getByRole('textbox')
          .fill('Hello. My name is Lucy. I work with my team.');
      if (activity.activityType === 'listening') {
        const audio = page.locator('audio').first();
        if (await audio.count())
          await audio.evaluate(
            (el: HTMLAudioElement) =>
              new Promise<void>((resolve, reject) => {
                el.addEventListener('ended', () => resolve(), { once: true });
                void el.play().catch(reject);
              }),
          );
        else {
          await page
            .getByRole('button', { name: 'Play preview', exact: true })
            .click();
          await page.getByRole('button', { name: 'Stop', exact: true }).click();
        }
      }
      const recording =
        activity.activityType === 'speaking' &&
        (await page
          .getByRole('button', { name: 'Record response', exact: true })
          .count()) > 0;
      const attemptResponse = page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          r
            .url()
            .endsWith(
              `/activities/${activityId}/${recording ? 'recordings' : 'attempts'}`,
            ),
      );
      if (recording) {
        await page
          .getByRole('button', { name: 'Record response', exact: true })
          .click();
        await page.waitForTimeout(1500);
        await page
          .getByRole('button', { name: 'Stop recording', exact: true })
          .click();
        await page
          .getByRole('checkbox', { name: /I consent to this use/ })
          .check();
        await page
          .getByRole('button', { name: 'Send for evaluation', exact: true })
          .click();
      } else
        await page
          .getByRole('button', { name: 'Continue', exact: true })
          .click();
      const submitted = await attemptResponse;
      expect(submitted.status()).toBe(recording ? 202 : 201);
      const attempt = await submitted.json();
      lastAttempt = recording ? attempt.attemptId : attempt.id;
      if (!seen.has(activity.activityType)) {
        auditAttempt = lastAttempt;
        seen.add(activity.activityType);
        const panel = page.getByRole('region', {
          name: 'Assessment feedback',
          exact: true,
        });
        await panel
          .getByRole('button', { name: 'Assess this response', exact: true })
          .click();
        await expect(
          panel.getByText(
            activity.activityType[0]!.toUpperCase() +
              activity.activityType.slice(1),
            { exact: true },
          ),
        ).toBeVisible();
        await expect(
          panel.getByText(
            activity.activityType === 'speaking' ? 'Not scored' : '100 / 100',
            { exact: true },
          ),
        ).toBeVisible();
        if (activity.activityType === 'speaking') {
          const stored = await (
            await page.request.get(
              `/api/v1/attempts/${lastAttempt}/assessments`,
            )
          ).json();
          expect(stored.items[0].criteria.length).toBeGreaterThan(0);
          expect(
            stored.items[0].criteria.every(
              (c: {
                status: string;
                level: number | null;
                rawScore: number | null;
              }) =>
                c.status !== 'SCORED' &&
                c.level === null &&
                c.rawScore === null,
            ),
          ).toBe(true);
          expect(stored.items[0].providers).toEqual([]);
          await expect(
            panel.getByText('Evidence needed', { exact: true }),
          ).toHaveCount(stored.items[0].criteria.length);
          await expect(panel).not.toContainText('mimeType');
        }
        await expect(
          panel.getByRole('heading', {
            name: 'Evaluation history',
            exact: true,
          }),
        ).toBeVisible();
        if (activity.activityType === 'writing') {
          await panel
            .getByRole('button', { name: 'Re-evaluate', exact: true })
            .click();
          await expect(panel.getByRole('article')).toHaveCount(2);
          const persisted = await (
            await page.request.get(
              `/api/v1/attempts/${lastAttempt}/assessments`,
            )
          ).json();
          expect(persisted.items).toHaveLength(2);
          expect(persisted.items[0].previousEvaluationId).toBe(
            persisted.items[1].id,
          );
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        await page.screenshot({
          path: path.join(
            evidence,
            `${info.project.name}-${activity.activityType}.png`,
          ),
          fullPage: true,
        });
        await panel.screenshot({
          path: path.join(
            evidence,
            `${info.project.name}-${activity.activityType}-panel.png`,
          ),
        });
        if (activity.activityType === 'writing') {
          await page.emulateMedia({ colorScheme: 'dark' });
          await panel.screenshot({
            path: path.join(evidence, `${info.project.name}-writing-dark.png`),
          });
          await page.emulateMedia({ colorScheme: 'light' });
        }
      }
    }
    expect([...seen].sort()).toEqual([
      'listening',
      'reading',
      'speaking',
      'writing',
    ]);
    await db.user.update({
      where: { id: user.id },
      data: { role: 'CONTENT_ADMIN' },
    });
    await page.goto('/admin/assessments');
    await page.getByLabel('Attempt ID', { exact: true }).fill(auditAttempt);
    await page
      .getByRole('button', { name: 'Load history', exact: true })
      .click();
    await expect(
      page.getByText('Audit history', { exact: true }),
    ).toBeVisible();
    await page.getByText('Audit history', { exact: true }).click();
    await expect(page.locator('pre')).toContainText('privateContext');
    await page.screenshot({
      path: path.join(evidence, `${info.project.name}-admin.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    await db.$disconnect();
  }
});
