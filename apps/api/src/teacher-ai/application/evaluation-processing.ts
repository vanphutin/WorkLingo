import type { EvaluationProcessingStep, EvaluationStatus } from '@worklingo/contracts';
import type { JobStatus } from '@prisma/client';

type StepStatus = EvaluationProcessingStep['status'];
function fromJob(status: JobStatus | undefined, fallback: StepStatus): StepStatus {
  if (status === 'RUNNING') return 'processing';
  if (status === 'PENDING' || status === 'RETRY_WAIT') return 'queued';
  if (status === 'FAILED') return 'failed';
  return fallback;
}

/** Progress is derived from persisted work, never from a timer or the current routing settings. */
export function evaluationProcessingSteps(
  status: EvaluationStatus,
  recording: { transcript: string | null; providerName: string | null } | null,
  result: { providerName: string; providerModel: string | null } | null,
  jobs: { transcription?: JobStatus; evaluation?: JobStatus } = {},
): EvaluationProcessingStep[] {
  const steps: EvaluationProcessingStep[] = [{ key: 'submission', status: 'completed', providerName: null, model: null }];
  const transcribed = !recording || recording.transcript != null || Boolean(result) || status === 'evaluated';
  if (recording) steps.push({ key: 'transcription',
    status: transcribed ? 'completed' : fromJob(jobs.transcription, status === 'evaluation_failed' ? 'failed' : status === 'processing' ? 'processing' : 'queued'),
    providerName: recording.providerName ?? null, model: null,
  });
  const evaluationStatus = !transcribed ? 'waiting'
    : status === 'evaluated' ? 'completed' : status === 'evaluation_failed' ? 'failed' : status === 'submitted' ? 'waiting' : status;
  const terminal = !transcribed || status === 'evaluated' || status === 'evaluation_failed';
  steps.push({ key: 'evaluation', status: terminal ? evaluationStatus : fromJob(jobs.evaluation, evaluationStatus), providerName: result?.providerName ?? null, model: result?.providerModel ?? null });
  return steps;
}
