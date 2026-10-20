import { test } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const phase6Root = path.resolve(__dirname, '../../../..', process.env.WORKLINGO_PHASE6_EVIDENCE_ROOT ?? 'docs/ui-redesign/evidence/phase6');
export function phase6Recorder(fixtureOnly = true) {
  const observations: object[] = [];
  test.afterEach(async ({ browser }, info) => {
    const engine = info.project.name || browser.browserType().name();
    const dir = path.join(phase6Root, process.env.WORKLINGO_PHASE6_RUN ?? 'browser', engine);
    mkdirSync(dir, { recursive: true });
    const root = path.resolve(__dirname, '../../../..');
    const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    writeFileSync(path.join(dir, info.title.replace(/[^a-z0-9]+/giu, '-') + '.json'), JSON.stringify({ sourceCommit: git('rev-parse', 'HEAD'), timestamp: new Date().toISOString(), command: process.env.WORKLINGO_PHASE6_COMMAND ?? 'Exact CLI not recorded here; see run registry/log', environment: { engine, browserVersion: browser.version(), optimized: true }, fixtureOnly, test: info.title, result: info.status, testSourceSHA256: createHash('sha256').update(readFileSync(info.file)).digest('hex'), productionWorkingDiffSHA256: createHash('sha256').update(git('diff', 'HEAD', '--', 'apps/web/src')).digest('hex'), observations: observations.splice(0), limitations: ['Automation is not physical-device, screenreader, live-provider or total-WCAG certification.'] }, null, 2) + '\n');
  });
  return observations;
}
