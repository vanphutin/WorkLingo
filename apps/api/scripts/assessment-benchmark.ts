import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyzeAssessmentBenchmark,
  type BenchmarkRun,
} from '../src/teacher-ai/domain/assessment-benchmark.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
function option(name: string) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--'))
    throw new Error(`Missing ${name} value`);
  return value;
}
async function jsonl(path: string): Promise<unknown[]> {
  const raw = await readFile(resolve(path), 'utf8');
  return raw
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        throw new Error(`Invalid JSONL line ${index + 1}`);
      }
    });
}
async function main() {
  const selfTest = args.includes('--self-test');
  const refsPath =
    option('--references') ??
    resolve(root, 'content/assessment/r22/references.v1.jsonl');
  const inputPath = option('--runs'),
    output = option('--output');
  if (!selfTest && !inputPath)
    throw new Error(
      'Use --runs recorded-runs.jsonl or --self-test. This CLI never calls a provider.',
    );
  if (selfTest && inputPath)
    throw new Error('--self-test and --runs are mutually exclusive');
  let references = await jsonl(refsPath),
    runs: unknown[];
  if (selfTest) {
    // Independent plumbing fixture, deliberately not copied/generated from benchmark reference answers.
    references = [
      {
        id: 'plumbing-1',
        skill: 'reading',
        tags: ['self_test'],
        provenance: {
          kind: 'synthetic_authored',
          source: 'CLI plumbing fixture',
          synthetic: true,
        },
        expectedAccepted: true,
        expectedLevels: { meaning: [2, 2] },
        anchorGroup: null,
      },
    ];
    runs = [
      {
        caseId: 'plumbing-1',
        runId: 'synthetic-plumbing-1',
        accepted: true,
        verdict: {
          confidence: 'MEDIUM',
          summary: 'Synthetic contract fixture.',
          criteria: [
            {
              id: 'meaning',
              level: 2,
              status: 'SCORED',
              evidenceIds: [],
              rationale: 'Fixture statement.',
              feedback: 'Fixture feedback.',
            },
          ],
          evidence: [],
          corrections: [],
        },
        provider: {
          name: 'local-fixture',
          model: 'fixture-v1',
          modelFamily: 'fixture',
          synthetic: true,
        },
        latencyMs: null,
        inputTokens: null,
        outputTokens: null,
        costUsd: null,
        confidenceProbability: null,
        privateContextLeaked: null,
        rubricAdherent: null,
        injectionChangedDecision: null,
        verifierDisagreed: null,
      } satisfies BenchmarkRun,
    ];
  } else runs = await jsonl(inputPath!);
  const report = {
    ...analyzeAssessmentBenchmark(references, runs),
    createdAt: new Date().toISOString(),
    mode: selfTest ? 'SYNTHETIC_SELF_TEST' : 'RECORDED_RUN_ANALYSIS',
    referenceFile: selfTest ? null : refsPath,
    liveProvidersCalled: false,
  };
  const rendered = JSON.stringify(report, null, 2) + '\n';
  // Historical reports are never replaced, including failed calibration reports.
  if (output) await writeFile(resolve(output), rendered, { flag: 'wx' });
  else process.stdout.write(rendered);
}
main().catch((error) => {
  process.stderr.write(
    `Benchmark failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
  );
  process.exitCode = 1;
});
