import { useAdminContent } from './i18n';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { AdminAudioSettings, AudioArtifactDto } from '@worklingo/contracts';

import { apiClient } from '../../lib/api/api-client';
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
  const { t, locale, label, message } = useAdminContent();
  const selectedAudioArtifacts: Readonly<Record<string, string>> =
    selectedAudioArtifactsInput ?? EMPTY_SELECTION;
  const [artifacts, setArtifacts] = useState<AudioArtifactDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingSlugs, setGeneratingSlugs] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<unknown>(null);
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
        setErrorMessage(err);
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
        setErrorMessage(err);
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
    <div className="audio-preview-panel" role="region" aria-label={t('audioControls')}>
      <div className="audio-simulation-banner" role="note">
        <strong>{t('simulationBanner')}</strong>
        <p>{t('simulationHelp')}</p>
      </div>

      {settingsError ? (
        <div className="alert alert-error" role="alert">{t('settingsUnavailable')}<button type="button" className="btn btn-secondary" onClick={() => void fetchGenerationSettings()}>{t('retrySettings')}</button>
        </div>
      ) : null}

      {Boolean(errorMessage) && (
        <div className="alert alert-error" role="alert">
          {message(errorMessage)}
        </div>
      )}

      {isLoading && artifacts.length === 0 ? (
        <p className="loading-text">{t('loadingAudio')}</p>
      ) : scriptsToDisplay.length === 0 ? (
        <p className="empty-text">{t('noAudioScripts')}</p>
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
                    {label(currentStatus)}
                  </span>
                </div>

                <p className="audio-script-excerpt" lang="en">{audioScripts.length > 0 ? item.script : t('scriptFallback', { slug: item.slug })}</p>

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
                      {t('selectCandidate', { adapter: candidate.adapterName, voice: String(candidate.voiceConfig.voice ?? candidate.voiceConfig.voiceId ?? t('defaultVoice')) })}
                    </label>
                    <span>{label(candidate.status)}</span>
                    {candidate.simulationLabel ? <p>{locale === 'vi' ? t('simulationAudio') : candidate.simulationLabel}</p> : null}
                    {candidate.status === 'READY' && candidate.adapterName === 'fake-tts' ? (
                      <p className="audio-settings-note">{t('diagnosticTone')}</p>
                    ) : null}
                    {candidate.status === 'READY' && candidate.adapterName !== 'fake-tts' ? (
                      <audio
                        controls
                        data-testid={`audio-player-${item.slug}-${candidate.id}`}
                        src={apiClient.getAudioArtifactContentUrl(candidate.id)}
                      />
                    ) : null}
                    {candidate.status === 'FAILED' && candidate.failureSummary ? (
                      <p className="audio-failure-text" role="alert">{t('audioGenerationFailed')} <code lang="en">{candidate.failureSummary}</code></p>
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
                      ? t('generating')
                      : artifact?.status === 'READY'
                        ? t('regenerateAudio')
                        : artifact?.status === 'FAILED'
                          ? t('retryAudio')
                          : t('generateAudio')}
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
