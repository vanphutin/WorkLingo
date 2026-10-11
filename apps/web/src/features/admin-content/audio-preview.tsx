import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { AdminAudioSettings, AudioArtifactDto } from '@worklingo/contracts';

import { ApiError, apiClient } from '../../lib/api/api-client';
import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { BrowserSpeechControls } from '../audio/browser-speech-controls';

const EMPTY_AUDIO_SCRIPTS: readonly AudioScriptItem[] = [];
const EMPTY_SELECTION: Readonly<Record<string, string>> = {};

export interface AudioScriptItem {
  readonly slug: string;
  readonly speaker?: string | undefined;
  readonly script: string;
}

export interface AudioPreviewProps {
  readonly importId: string;
  readonly draftRevision: number;
  readonly audioScripts?: readonly AudioScriptItem[] | undefined;
  readonly pollIntervalMs?: number | undefined;
  readonly maxPollAttempts?: number | undefined;
  readonly onAudioStateChange?: (() => void) | undefined;
  readonly onAudioReadinessChange?: ((ready: boolean) => void) | undefined;
  readonly onSelectedAudioArtifactsChange?: ((selection: Record<string, string>) => void) | undefined;
  readonly selectedAudioArtifacts?: Readonly<Record<string, string>> | undefined;
}

export function AudioPreview({
  importId,
  draftRevision,
  audioScripts = EMPTY_AUDIO_SCRIPTS,
  pollIntervalMs = 1000,
  maxPollAttempts = 60,
  onAudioStateChange,
  onAudioReadinessChange,
  onSelectedAudioArtifactsChange,
  selectedAudioArtifacts: selectedAudioArtifactsInput,
}: AudioPreviewProps) {
  const selectedAudioArtifacts: Readonly<Record<string, string>> =
    selectedAudioArtifactsInput ?? EMPTY_SELECTION;
  const [artifacts, setArtifacts] = useState<AudioArtifactDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingSlugs, setGeneratingSlugs] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationSettings, setGenerationSettings] = useState<AdminAudioSettings | null>(null);
  const [settingsError, setSettingsError] = useState(false);
  const configuredProvider = generationSettings?.providers.find(
    (provider) => provider.id === generationSettings.providerId,
  );

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchGenerationSettings = useCallback(async () => {
    setSettingsError(false);
    try {
      const settings = await audioSettingsClient.getAdminSettings();
      if (isMountedRef.current) setGenerationSettings(settings);
    } catch {
      if (isMountedRef.current) setSettingsError(true);
    }
  }, []);

  useEffect(() => { void fetchGenerationSettings(); }, [fetchGenerationSettings]);

  const synchronizeSelection = useCallback((list: readonly AudioArtifactDto[]) => {
    const valid: Record<string, string> = {};
    for (const [slug, artifactId] of Object.entries(selectedAudioArtifacts)) {
      if (list.some((artifact) =>
        artifact.id === artifactId
        && artifact.audioScriptSlug === slug
        && artifact.status === 'READY')) {
        valid[slug] = artifactId;
      }
    }
    if (JSON.stringify(valid) !== JSON.stringify(selectedAudioArtifacts)) {
      onSelectedAudioArtifactsChange?.(valid);
    }
    const scriptSlugs = audioScripts.map((script) => script.slug);
    onAudioReadinessChange?.(
      scriptSlugs.length === 0 || scriptSlugs.every((slug) => Boolean(valid[slug])),
    );
  }, [audioScripts, onAudioReadinessChange, onSelectedAudioArtifactsChange, selectedAudioArtifacts]);

  const fetchArtifacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await apiClient.listContentAudioArtifacts(importId);
      const list = Array.isArray(result) ? result : [];
      if (isMountedRef.current) {
        setArtifacts(list);
        synchronizeSelection(list);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setErrorMessage(err instanceof ApiError ? err.message : 'Unable to load audio artifacts.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [importId, synchronizeSelection]);

  useEffect(() => {
    void fetchArtifacts();
  }, [fetchArtifacts]);

  const pollJobUntilDone = useCallback(
    async (jobId: string) => {
      for (let attempt = 0; attempt < maxPollAttempts && isMountedRef.current; attempt += 1) {
        const job = await apiClient.getJob(jobId);
        if (job.status === 'COMPLETED') return;
        if (job.status === 'FAILED') throw new Error('Audio generation failed.');
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }
      throw new Error('Audio generation is taking too long. Refresh and try again.');
    },
    [maxPollAttempts, pollIntervalMs],
  );

  const handleGenerate = async (slug: string) => {
    if (!generationSettings || !configuredProvider?.available) return;
    setGeneratingSlugs((prev) => ({ ...prev, [slug]: true }));
    setErrorMessage(null);

    try {
      const result = await apiClient.generateAudio(importId, {
        audioScriptSlug: slug,
        idempotencyKey: `gen-${importId}-${slug}-${draftRevision}-${globalThis.crypto.randomUUID()}`,
        providerId: generationSettings.providerId,
        ...(generationSettings.defaultVoiceId
          ? { voiceId: generationSettings.defaultVoiceId }
          : {}),
      });

      if (result.jobId) {
        await pollJobUntilDone(result.jobId);
      }

      await fetchArtifacts();
      onAudioStateChange?.();
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to generate simulation audio.',
        );
      }
    } finally {
      if (isMountedRef.current) {
        setGeneratingSlugs((prev) => ({ ...prev, [slug]: false }));
      }
    }
  };

  const safeArtifacts = Array.isArray(artifacts) ? artifacts : [];
  const scriptsToDisplay =
    Array.isArray(audioScripts) && audioScripts.length > 0
      ? audioScripts
      : safeArtifacts.map((a) => ({
          slug: a.audioScriptSlug,
          speaker: undefined,
          script: `[Script: ${a.audioScriptSlug}]`,
        }));

  return (
    <div className="audio-preview-panel" role="region" aria-label="Audio controls">
      <div className="audio-simulation-banner" role="note">
        <strong>Simulation audio — not a release voice</strong>
        <p>
          These generated files let you verify lesson structure and the learner flow locally.
          Replace them with an approved release voice before production launch.
        </p>
      </div>

      {settingsError ? (
        <div className="alert alert-error" role="alert">
          Provider settings are unavailable. Browser preview still works.
          <button type="button" className="btn btn-secondary" onClick={() => void fetchGenerationSettings()}>
            Retry provider settings
          </button>
        </div>
      ) : null}

      {errorMessage && (
        <div className="alert alert-error" role="alert">
          {errorMessage}
        </div>
      )}

      {isLoading && artifacts.length === 0 ? (
        <p className="loading-text">Loading audio artifacts…</p>
      ) : scriptsToDisplay.length === 0 ? (
        <p className="empty-text">This lesson does not declare any audio scripts.</p>
      ) : (
        <div className="audio-scripts-grid">
          {scriptsToDisplay.map((item) => {
            const candidates = safeArtifacts.filter((a) => a.audioScriptSlug === item.slug);
            const artifact = candidates.at(-1);
            const isGenerating = generatingSlugs[item.slug];
            const currentStatus = isGenerating ? 'GENERATING' : (artifact?.status ?? 'MISSING');

            return (
              <div key={item.slug} className="audio-item-card">
                <div className="audio-item-header">
                  <div className="audio-meta">
                    <h4 className="audio-slug">{item.slug}</h4>
                    {item.speaker && <span className="audio-speaker">{item.speaker}</span>}
                  </div>
                  <span className={`audio-status-pill status-${currentStatus.toLowerCase()}`}>
                    {currentStatus}
                  </span>
                </div>

                <p className="audio-script-excerpt">{item.script}</p>

                <BrowserSpeechControls lang="en-US" text={item.script} />

                {candidates.map((candidate) => (
                  <div className="audio-candidate" key={candidate.id}>
                    <label>
                      <input
                        checked={selectedAudioArtifacts[item.slug] === candidate.id}
                        disabled={candidate.status !== 'READY'}
                        name={`audio-candidate-${item.slug}`}
                        type="radio"
                        onChange={() => {
                          const next: Record<string, string> = {
                            ...selectedAudioArtifacts,
                            [item.slug]: candidate.id,
                          };
                          onSelectedAudioArtifactsChange?.(next);
                          onAudioReadinessChange?.(audioScripts.every((script) =>
                            Boolean(next[script.slug])));
                        }}
                      />
                      Select candidate from {candidate.adapterName}, voice{' '}
                      {String(candidate.voiceConfig.voice ?? candidate.voiceConfig.voiceId ?? 'default')}
                    </label>
                    <span>{candidate.status}</span>
                    {candidate.simulationLabel ? <p>{candidate.simulationLabel}</p> : null}
                    {candidate.status === 'READY' && candidate.adapterName === 'fake-tts' ? (
                      <p className="audio-settings-note">
                        This simulation file is a diagnostic tone, not speech. Use Play preview
                        above to hear the script with a browser voice.
                      </p>
                    ) : null}
                    {candidate.status === 'READY' && candidate.adapterName !== 'fake-tts' ? (
                      <audio
                        controls
                        data-testid={`audio-player-${item.slug}-${candidate.id}`}
                        src={apiClient.getAudioArtifactContentUrl(candidate.id)}
                      />
                    ) : null}
                    {candidate.status === 'FAILED' && candidate.failureSummary ? (
                      <p className="audio-failure-text" role="alert">{candidate.failureSummary}</p>
                    ) : null}
                  </div>
                ))}

                <div className="audio-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-generate-audio"
                    disabled={isGenerating || !generationSettings || !configuredProvider?.available}
                    onClick={() => handleGenerate(item.slug)}
                  >
                    {isGenerating
                      ? 'Generating…'
                      : artifact?.status === 'READY'
                        ? 'Regenerate Audio'
                        : artifact?.status === 'FAILED'
                          ? 'Retry Audio'
                          : 'Generate Audio'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
