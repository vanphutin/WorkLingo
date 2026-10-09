import { FakeLanguageEvaluationAdapter } from '../ai-gateway/infrastructure/fake-language-evaluation.adapter.js';
import { FakeSpeechToTextAdapter } from '../ai-gateway/infrastructure/fake-speech-to-text.adapter.js';
import { aggregateEvaluation, resolveFoundationRubric } from './domain/foundation-rubrics.js';

export interface CalibrationFixtureResult {
  readonly activityType: 'speaking' | 'writing';
  readonly expectedMax: number;
  readonly expectedMin: number;
  readonly fixtureId: string;
  readonly inExpectedRange: boolean;
  readonly score: number;
}

export interface CalibrationReport {
  readonly fixtureVersion: 'foundation-golden-v1';
  readonly generatedAt: string;
  readonly humanCalibration: 'pending';
  readonly liveRun: {
    readonly status: 'not_requested' | 'skipped';
    readonly reason: 'fake_mode' | 'missing_provider_credentials' | 'approved_live_fixtures_unavailable';
  };
  readonly providerMode: 'fake' | 'live';
  readonly results: readonly CalibrationFixtureResult[];
  readonly rubrics: readonly {
    readonly id: 'foundation-speaking-shadowing' | 'foundation-workplace-writing';
    readonly version: '1';
  }[];
}

interface CalibrationOptions {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly generatedAt?: string;
  readonly mode?: 'fake' | 'live';
}

const within = (score: number, minimum: number, maximum: number): boolean =>
  score >= minimum && score <= maximum;

export function assertCalibrationRanges(results: readonly CalibrationFixtureResult[]): void {
  const disagreements = results.filter((result) => !result.inExpectedRange);
  if (disagreements.length > 0) {
    throw new Error(`Calibration fixtures outside expected range: ${disagreements.map((item) => item.fixtureId).join(', ')}`);
  }
}

const runFakeFixtures = async (): Promise<CalibrationFixtureResult[]> => {
  const language = new FakeLanguageEvaluationAdapter();
  const speech = new FakeSpeechToTextAdapter();
  const writingRubric = resolveFoundationRubric({ activityType: 'writing' });
  const speakingRubric = resolveFoundationRubric({ activityType: 'speaking', mode: 'shadowing' });

  const clearWriting = await language.evaluate({
    activityType: 'writing', learnerResponse: 'The launch is on track and I will send the report today.',
    levelCode: 'FOUNDATION_1', prompt: 'Write a project update.', referenceText: 'The launch is on track.',
    requiredPhrases: ['on track'], rubricId: writingRubric.id, rubricVersion: writingRubric.version,
  });
  const incompleteWriting = await language.evaluate({
    activityType: 'writing', learnerResponse: 'Noted.', levelCode: 'FOUNDATION_1',
    prompt: 'Write a project update.', requiredPhrases: ['on track'],
    rubricId: writingRubric.id, rubricVersion: writingRubric.version,
  });
  const transcription = await speech.transcribe({
    audio: new TextEncoder().encode('worklingo-fixture:clear-shadowing'),
    locale: 'en-US', mimeType: 'audio/webm', referenceText: 'Hello, I am Lan from the support team.',
  });
  const speakingLanguage = await language.evaluate({
    activityType: 'speaking', learnerResponse: transcription.transcript, levelCode: 'FOUNDATION_1',
    prompt: 'Introduce yourself.', referenceText: 'Hello, I am Lan from the support team.',
    requiredPhrases: ['hello', 'support team'], rubricId: speakingRubric.id,
    rubricVersion: speakingRubric.version,
  });

  const fixtures = [
    { fixtureId: 'writing-clear-update', activityType: 'writing' as const,
      score: aggregateEvaluation(writingRubric, clearWriting).score, expectedMin: 0.81, expectedMax: 0.82 },
    { fixtureId: 'writing-incomplete-update', activityType: 'writing' as const,
      score: aggregateEvaluation(writingRubric, incompleteWriting).score, expectedMin: 0.21, expectedMax: 0.23 },
    { fixtureId: 'speaking-clear-shadowing', activityType: 'speaking' as const,
      score: aggregateEvaluation(speakingRubric, speakingLanguage, transcription.pronunciation).score,
      expectedMin: 0.82, expectedMax: 0.84 },
  ];
  return fixtures.map((fixture) => ({
    ...fixture,
    inExpectedRange: within(fixture.score, fixture.expectedMin, fixture.expectedMax),
  }));
};

const hasLiveCredentials = (env: Readonly<Record<string, string | undefined>>): boolean =>
  Boolean(env.MICROSOFT_SPEECH_KEY && env.MICROSOFT_SPEECH_REGION &&
    env.OPENAI_API_KEY && env.OPENAI_BASE_URL && env.OPENAI_MODEL);

export async function runGoldenCalibration(options: CalibrationOptions = {}): Promise<CalibrationReport> {
  const mode = options.mode ?? 'fake';
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const rubrics = [
    resolveFoundationRubric({ activityType: 'speaking', mode: 'shadowing' }),
    resolveFoundationRubric({ activityType: 'writing' }),
  ].map(({ id, version }) => ({ id, version }));

  if (mode === 'live') {
    const credentialsPresent = hasLiveCredentials(options.env ?? process.env);
    return {
      fixtureVersion: 'foundation-golden-v1', generatedAt, humanCalibration: 'pending',
      liveRun: {
        status: 'skipped',
        reason: credentialsPresent ? 'approved_live_fixtures_unavailable' : 'missing_provider_credentials',
      },
      providerMode: mode, results: [], rubrics,
    };
  }

  const results = await runFakeFixtures();
  assertCalibrationRanges(results);
  return {
    fixtureVersion: 'foundation-golden-v1', generatedAt, humanCalibration: 'pending',
    liveRun: { status: 'not_requested', reason: 'fake_mode' }, providerMode: mode, results, rubrics,
  };
}

if (require.main === module) {
  const mode = process.argv.includes('--live') ? 'live' : 'fake';
  runGoldenCalibration({ mode })
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : 'Calibration failed');
      process.exitCode = 1;
    });
}
