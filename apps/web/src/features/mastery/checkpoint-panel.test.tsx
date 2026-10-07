import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckpointPanel } from './checkpoint-panel';
import { assessmentId, blockId, passedSkill, pendingAssessment, progression, sessionId } from './test-fixtures';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const passedAssessment = {
  ...pendingAssessment, status: 'passed', canAdvance: true, nextLevelCode: 'FOUNDATION_2',
  skills: { reading: passedSkill, listening: passedSkill, speaking: passedSkill, writing: passedSkill },
};
function networkWithAssessment(assessment: unknown) {
  const network = vi.fn(async (url: string, _options: RequestInit) => Response.json(url.endsWith('/progression') ? progression : assessment));
  vi.stubGlobal('fetch', network);
  return network;
}

describe('Checkpoint', () => {
  it('shows pending scores honestly, offers reassessment and never offers confirmation', async () => {
    const network = networkWithAssessment(pendingAssessment);
    render(<CheckpointPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Assess completed session' }));
    expect(await screen.findByText('Evaluation pending')).toBeInTheDocument();
    const speaking = screen.getByRole('article', { name: 'Speaking checkpoint' });
    expect(within(speaking).getByText('Pending evaluation')).toBeInTheDocument();
    expect(within(speaking).queryByText('0%', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
    const firstBody = JSON.parse(String(network.mock.calls[1]?.[1].body));
    expect(firstBody.sessionId).toBe(sessionId);
    expect(firstBody.clientAssessmentId).toMatch(/^[\da-f]{8}-[\da-f-]{27}$/i);
    fireEvent.click(screen.getByRole('button', { name: 'Assess completed session' }));
    await waitFor(() => expect(network).toHaveBeenCalledTimes(3));
    expect(JSON.parse(String(network.mock.calls[2]?.[1].body)).clientAssessmentId).not.toBe(firstBody.clientAssessmentId);
  });
  it('keeps weak-skill reinforcement actionable while other scores are pending', async () => {
    networkWithAssessment({ ...pendingAssessment,
      skills: { ...pendingAssessment.skills, reading: { ...passedSkill, score: 0.3, passed: false } },
      reinforcement: [{ skill: 'reading', languageBlockIds: [blockId], reason: 'below_threshold', action: 'Practice reading workplace emails before reassessing.' }],
    });
    render(<CheckpointPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Assess completed session' }));
    expect(await screen.findByText(/practice reading workplace emails before reassessing/i)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Reading checkpoint' })).toHaveTextContent('30%');
    expect(screen.getByRole('link', { name: /practice reinforcement/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
  });
  it('requires explicit confirmation after a pass and displays the returned level', async () => {
    let confirmationRequested = false;
    const network = vi.fn(async (url: string) => {
      if (url.endsWith('/confirm')) {
        confirmationRequested = true;
        return Response.json({ ...progression, currentLevelCode: 'FOUNDATION_2', nextLevelCode: null, eligibleSessionId: null, canAssess: false, latestAssessment: passedAssessment });
      }
      return Response.json(url.endsWith('/progression') ? progression : passedAssessment);
    });
    vi.stubGlobal('fetch', network);
    render(<CheckpointPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Assess completed session' }));
    const confirm = await screen.findByRole('button', { name: 'Confirm next level' });
    expect(confirmationRequested).toBe(false);
    fireEvent.click(confirm);
    expect(await screen.findByText('Current level: Foundation 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm next level' })).not.toBeInTheDocument();
    expect(network).toHaveBeenLastCalledWith(`/api/v1/me/checkpoint-assessments/${assessmentId}/confirm`, expect.any(Object));
  });
  it('shows a current-level pass without inventing an unavailable next level', async () => {
    networkWithAssessment({ ...passedAssessment, canAdvance: false, nextLevelCode: null });
    render(<CheckpointPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Assess completed session' }));
    expect(await screen.findByText(/current level complete/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
  });
  it('reuses the request UUID after a lost response and prevents a second request while submitting', async () => {
    let finish: (response: Response) => void = () => undefined;
    const network = vi.fn().mockResolvedValueOnce(Response.json(progression))
      .mockRejectedValueOnce(new TypeError('Connection lost'))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal('fetch', network);
    render(<CheckpointPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Assess completed session' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to assess/i);
    fireEvent.click(screen.getByRole('button', { name: 'Retry assessment' }));
    expect(screen.getByRole('button', { name: 'Assessing…' })).toBeDisabled();
    const firstBody = JSON.parse(String(network.mock.calls[1]?.[1].body));
    const secondBody = JSON.parse(String(network.mock.calls[2]?.[1].body));
    expect(secondBody).toEqual(firstBody);
    await act(async () => finish(Response.json(pendingAssessment)));
    expect(await screen.findByText('Evaluation pending')).toBeInTheDocument();
  });
  it('shows loading and progression errors with retry, and blocks assessment without an eligible session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ message: 'Unavailable' }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ ...progression, eligibleSessionId: null, canAssess: false, reasons: ['Complete a mission session first.'] })));
    render(<CheckpointPanel />);
    expect(screen.getByText(/loading checkpoint/i)).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to load checkpoint/i);
    fireEvent.click(screen.getByRole('button', { name: /retry checkpoint/i }));
    expect(await screen.findByText('Complete a mission session first.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assess completed session' })).toBeDisabled();
  });

  it('displays an existing not_ready result and does not offer confirmation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...progression, latestAssessment: {
      ...passedAssessment, status: 'not_ready', canAdvance: false,
    } })));
    render(<CheckpointPanel />);
    expect(await screen.findByText('Not ready for assessment')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Speaking checkpoint' })).toHaveTextContent('80%');
    expect(screen.queryByRole('button', { name: 'Confirm next level' })).not.toBeInTheDocument();
  });

  it('allows confirmation retry after a lost response and blocks duplicate confirmation while waiting', async () => {
    let finish: (response: Response) => void = () => undefined;
    const network = vi.fn().mockResolvedValueOnce(Response.json({ ...progression, latestAssessment: passedAssessment }))
      .mockRejectedValueOnce(new TypeError('Connection lost'))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal('fetch', network);
    render(<CheckpointPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm next level' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to confirm/i);
    fireEvent.click(screen.getByRole('button', { name: 'Retry confirmation' }));
    expect(screen.getByRole('button', { name: 'Confirming…' })).toBeDisabled();
    expect(network.mock.calls[2]?.[0]).toBe(`/api/v1/me/checkpoint-assessments/${assessmentId}/confirm`);
    await act(async () => finish(Response.json({ ...progression, currentLevelCode: 'FOUNDATION_2', eligibleSessionId: null, canAssess: false, nextLevelCode: null })));
    expect(await screen.findByText('Current level: Foundation 2')).toBeInTheDocument();
  });

  it('invalidates a pending request UUID when the eligible session changes', async () => {
    const newSession = '77777777-7777-4777-8777-777777777777';
    const network = vi.fn().mockResolvedValueOnce(Response.json(progression))
      .mockRejectedValueOnce(new TypeError('Connection lost'))
      .mockResolvedValueOnce(Response.json({ ...progression, eligibleSessionId: newSession }))
      .mockResolvedValueOnce(Response.json({ ...pendingAssessment, sessionId: newSession }));
    vi.stubGlobal('fetch', network);
    render(<CheckpointPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Assess completed session' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh checkpoint' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Assess completed session' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Assess completed session' }));
    await screen.findByText('Evaluation pending');
    const first = JSON.parse(String(network.mock.calls[1]?.[1].body));
    const second = JSON.parse(String(network.mock.calls[3]?.[1].body));
    expect(second.sessionId).toBe(newSession);
    expect(second.clientAssessmentId).not.toBe(first.clientAssessmentId);
  });

  it('preserves a pending UUID when refreshing the same eligible session', async () => {
    const network = vi.fn().mockResolvedValueOnce(Response.json(progression))
      .mockRejectedValueOnce(new TypeError('Connection lost'))
      .mockResolvedValueOnce(Response.json(progression))
      .mockResolvedValueOnce(Response.json(pendingAssessment));
    vi.stubGlobal('fetch', network);
    render(<CheckpointPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Assess completed session' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh checkpoint' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Assess completed session' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Retry assessment' }));
    await screen.findByText('Evaluation pending');
    expect(JSON.parse(String(network.mock.calls[3]?.[1].body))).toEqual(JSON.parse(String(network.mock.calls[1]?.[1].body)));
  });

  it('preserves an uncertain assessment UUID through a failed progression refresh', async () => {
    const network = vi.fn().mockResolvedValueOnce(Response.json(progression))
      .mockRejectedValueOnce(new TypeError('Connection lost'))
      .mockResolvedValueOnce(Response.json({ message: 'Unavailable' }, { status: 503 }))
      .mockResolvedValueOnce(Response.json(progression))
      .mockResolvedValueOnce(Response.json(pendingAssessment));
    vi.stubGlobal('fetch', network);
    render(<CheckpointPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Assess completed session' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh checkpoint' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retry checkpoint' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Assess completed session' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Assess completed session' }));
    await screen.findByText('Evaluation pending');
    expect(JSON.parse(String(network.mock.calls[4]?.[1].body))).toEqual(JSON.parse(String(network.mock.calls[1]?.[1].body)));
  });

  it('labels a partial skill score as provisional while evaluated evidence is still pending', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...progression, latestAssessment: {
      ...pendingAssessment, skills: { ...pendingAssessment.skills, reading: { ...passedSkill, pendingCount: 1, passed: false } },
    } })));
    render(<CheckpointPanel />);
    const reading = await screen.findByRole('article', { name: 'Reading checkpoint' });
    expect(reading).toHaveTextContent('80%');
    expect(reading).toHaveTextContent(/evaluated so far/i);
    expect(reading).not.toHaveTextContent('Threshold met');
  });
});
