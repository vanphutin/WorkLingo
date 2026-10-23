import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultTopicPlan, type AiSettings, type GeneratedIntermediateTopic } from '@worklingo/contracts';
import { aiSettingsClient } from '../../lib/api/ai-settings-client';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';
import { createTopicJsonTemplate } from './topic-json';
import { TopicAiGenerator } from './topic-ai-generator';
import { ApiError } from '../../lib/api/api-client';
const id = '00000000-0000-4000-8000-000000000001';
const settings: AiSettings = { accountId: id, canManageSystem: false, preferredProvider: 'discovery', effectiveProvider: 'discovery', fallbackEnabled: true, effectiveFallbackEnabled: true, systemFallbackEnabled: true, simulation: false, routingEnabled: true, maxOutputTokens: 2048,
  providers: [{ id: 'discovery', available: true, model: 'd' }, { id: 'openai', available: true, model: 'o' }] };
const candidate: GeneratedIntermediateTopic = { topicGroupId: id, topic: createTopicJsonTemplate(), plan: defaultTopicPlan(90), provider: 'openai', model: 'o' };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => { vi.spyOn(aiSettingsClient, 'get').mockResolvedValue(settings); });
async function open(dirty = false) {
  const apply = vi.fn();
  render(<TopicAiGenerator topicGroupId={id} dirty={dirty} disabled={false} onApply={apply} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Create with AI' }));
  await waitFor(() => expect(screen.getByLabelText('AI provider')).toBeEnabled());
  return apply;
}
describe('Admin generates a topic then explicitly applies it to the editor', () => {
  it('sends the selected vocabulary difficulty and clears the previous candidate when difficulty changes', async () => {
    const generate = vi.spyOn(intermediateTopicClient, 'generate').mockResolvedValue({ ...candidate, provider: 'discovery', plan: defaultTopicPlan(60) });
    await open();
    fireEvent.change(screen.getByLabelText('Vocabulary difficulty'), { target: { value: 'easy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate lesson' }));
    await screen.findByRole('button', { name: 'Send lesson to JSON import' });
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ difficulty: 'easy' }));
    fireEvent.change(screen.getByLabelText('Vocabulary difficulty'), { target: { value: 'hard' } });
    expect(screen.queryByRole('button', { name: 'Send lesson to JSON import' })).not.toBeInTheDocument();
  });
  it('sends the selected AI, topic and minutes without saving or changing account settings', async () => {
    const generate = vi.spyOn(intermediateTopicClient, 'generate').mockResolvedValue(candidate);
    const apply = await open();
    fireEvent.change(screen.getByLabelText('AI provider'), { target: { value: 'openai' } });
    fireEvent.change(screen.getByLabelText('Learning minutes'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate lesson' }));
    expect(await screen.findByRole('heading', { name: 'A restaurant reservation' })).toBeInTheDocument();
    expect(generate).toHaveBeenCalledWith({ topicGroupId: id, durationMinutes: 90, provider: 'openai', level: 'B1', difficulty: 'medium' });
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send lesson to JSON import' }));
    expect(apply).toHaveBeenCalledWith(candidate);
  });
  it('keeps unsaved content when the administrator declines replacement', async () => {
    vi.spyOn(intermediateTopicClient, 'generate').mockResolvedValue(candidate);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const apply = await open(true);
    fireEvent.change(screen.getByLabelText('AI provider'), { target: { value: 'openai' } });
    fireEvent.change(screen.getByLabelText('Learning minutes'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate lesson' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Send lesson to JSON import' }));
    expect(apply).not.toHaveBeenCalled();
  });
  it('invalidates a candidate when the provider or duration changes', async () => {
    vi.spyOn(intermediateTopicClient, 'generate').mockResolvedValue({ ...candidate, provider: 'discovery', plan: defaultTopicPlan(60) });
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Generate lesson' }));
    await screen.findByRole('button', { name: 'Send lesson to JSON import' });
    fireEvent.change(screen.getByLabelText('Learning minutes'), { target: { value: '120' } });
    expect(screen.queryByRole('button', { name: 'Send lesson to JSON import' })).not.toBeInTheDocument();
  });
  it('surfaces provider failure without applying a replacement', async () => {
    vi.spyOn(intermediateTopicClient, 'generate').mockRejectedValue(new Error('provider failure'));
    const apply = await open();
    fireEvent.click(screen.getByRole('button', { name: 'Generate lesson' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your draft is unchanged');
    expect(apply).not.toHaveBeenCalled();
  });
  it.each([
    ['TOPIC_GENERATION_TIMEOUT', /timed out/i],
    ['TOPIC_GENERATION_AUTH_FAILED', /credentials/i],
    ['TOPIC_GENERATION_RATE_LIMITED', /rate limit/i],
  ])('explains %s and keeps the JSON buffer untouched', async (code, message) => {
    vi.spyOn(intermediateTopicClient, 'generate').mockRejectedValue(new ApiError({ code, message: 'safe error', status: 503 }));
    const apply = await open();fireEvent.click(screen.getByRole('button', { name: 'Generate lesson' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);expect(apply).not.toHaveBeenCalled();
  });
  it('shows both providers but disables generation when real AI is not configured', async () => {
    vi.mocked(aiSettingsClient.get).mockResolvedValue({ ...settings, simulation: true, providers: settings.providers.map(p => ({ ...p, available: false })) });
    await open();
    expect(screen.getByRole('option', { name: /Discovery/ })).toBeDisabled();
    expect(screen.getByRole('option', { name: /OpenAI/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Generate lesson' })).toBeDisabled();
    expect(screen.getByText(/Configure a real AI provider/)).toBeInTheDocument();
  });
});
