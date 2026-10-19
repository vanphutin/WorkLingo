'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { AdminAudioSettings } from '@worklingo/contracts';

import { useT, useLocalePreference } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { audioMessages } from '../../i18n/messages/audio';
import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { useVoiceRegistry } from './use-voice-registry';
import './admin-audio-settings.css';

/* Icons with strict sizing */
function AudioWaveIcon({ size = 16 }: { readonly size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, maxWidth: size, maxHeight: size, flexShrink: 0 }}
    >
      <path d="M12 2v20M17 5v14M22 9v6M7 5v14M2 9v6" />
    </svg>
  );
}

function SparklesIcon({ size = 16 }: { readonly size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, maxWidth: size, maxHeight: size, flexShrink: 0 }}
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

function CloudSpeechIcon({ size = 20 }: { readonly size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, maxWidth: size, maxHeight: size, flexShrink: 0 }}
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      <path d="M9 13v3M12 11v7M15 13v3" />
    </svg>
  );
}

function FlaskIcon({ size = 20 }: { readonly size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, maxWidth: size, maxHeight: size, flexShrink: 0 }}
    >
      <path d="M10 2v7.31L4.65 17.5A2 2 0 0 0 6.38 20.5h11.24a2 2 0 0 0 1.73-3L14 9.31V2" />
      <path d="M8.5 2h7M7 16h10" />
    </svg>
  );
}

function SlidersIcon({ size = 18 }: { readonly size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, maxWidth: size, maxHeight: size, flexShrink: 0 }}
    >
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="1" x2="7" y1="14" y2="14" />
      <line x1="9" x2="15" y1="8" y2="8" />
      <line x1="17" x2="23" y1="16" y2="16" />
    </svg>
  );
}

function DevicesIcon({ size = 18 }: { readonly size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, maxWidth: size, maxHeight: size, flexShrink: 0 }}
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function ShieldCheckIcon({ size = 18 }: { readonly size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, maxWidth: size, maxHeight: size, flexShrink: 0 }}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ChevronDownIcon({ size = 16 }: { readonly size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="admin-select-chevron"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, maxWidth: size, maxHeight: size, flexShrink: 0 }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function AlertTriangleIcon({ size = 18 }: { readonly size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, maxWidth: size, maxHeight: size, flexShrink: 0 }}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CheckCircleIcon({ size = 13 }: { readonly size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, maxWidth: size, maxHeight: size, flexShrink: 0 }}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function AdminAudioSettingsPanel() {
  const t = useT('audio', audioMessages);
  const { locale } = useLocalePreference();
  const registry = useVoiceRegistry();
  const [settings, setSettings] = useState<AdminAudioSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<AdminAudioSettings | null>(null);
  const [loadError, setLoadError] = useState<{ cause: unknown } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<{ cause: unknown } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await audioSettingsClient.getAdminSettings();
      setSettings(data);
      setInitialSettings(data);
    } catch (cause) {
      setLoadError({ cause });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loadError) {
    return (
      <section className="audio-settings-state admin-state-container" aria-labelledby="admin-audio-settings-title">
        <h1 id="admin-audio-settings-title">{t('generationSettings')}</h1>
        <div role="alert" className="admin-callout-warning">
          <AlertTriangleIcon />
          <div className="admin-callout-content">
            <span className="admin-callout-title">{t('providerLoadError')}</span>
            <p className="admin-callout-desc">{localizedError(loadError.cause, locale)}</p>
          </div>
        </div>
        <button type="button" className="admin-retry-btn" onClick={() => void load()}>{t('retry')}</button>
      </section>
    );
  }

  if (!settings) {
    return (
      <div className="audio-settings-state admin-state-container" role="status">
        <div className="admin-state-spinner" aria-hidden="true" />
        <p>{t('loadingProviders')}</p>
      </div>
    );
  }

  const selected = settings.providers.find((provider) => provider.id === settings.providerId);
  const hasChanges = initialSettings !== null && (
    settings.providerId !== initialSettings.providerId ||
    settings.defaultVoiceId !== initialSettings.defaultVoiceId
  );

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const updated = await audioSettingsClient.updateAdminSettings({
        defaultVoiceId: settings.defaultVoiceId,
        providerId: settings.providerId,
      });
      setSettings(updated);
      setInitialSettings(updated);
      setSaved(true);
    } catch (cause) {
      setSaveError({ cause });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-audio-page">
      {/* Settings Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="admin-settings-breadcrumbs">
        <span>Admin</span>
        <span className="breadcrumb-separator" aria-hidden="true">/</span>
        <span>{t('adminSettingsBreadcrumb')}</span>
        <span className="breadcrumb-separator" aria-hidden="true">/</span>
        <span className="breadcrumb-current" aria-current="page">{t('generationSettings')}</span>
      </nav>

      {/* Settings Hub Tabs */}
      <nav className="admin-settings-tabs-nav" aria-label="Settings categories">
        <Link href="/admin/settings/audio" className="admin-settings-tab active" aria-current="page">
          <AudioWaveIcon size={16} />
          <span>{t('audioTab')}</span>
        </Link>
        <Link href="/admin/settings/ai" className="admin-settings-tab">
          <SparklesIcon size={16} />
          <span>{t('aiTab')}</span>
        </Link>
      </nav>

      {/* Main Settings Card */}
      <section className="audio-settings-panel admin-audio-settings-card" aria-labelledby="admin-audio-settings-title">
        {/* Header */}
        <header className="admin-audio-header">
          <div className="eyebrow-badge">
            <AudioWaveIcon size={14} />
            <span>{t('generation')}</span>
          </div>
          <h1 id="admin-audio-settings-title">{t('generationSettings')}</h1>
          <p>{t('generationDescription')}</p>
        </header>

        {/* Section 1: TTS Provider Selection */}
        <section className="admin-audio-section">
          <div className="admin-section-header">
            <div className="admin-section-title-group">
              <h2 className="admin-section-title">
                <SlidersIcon size={18} />
                <span>{t('ttsProvider')}</span>
              </h2>
              <p className="admin-section-desc">
                {t('generationDescription')}
              </p>
            </div>
          </div>

          <fieldset className="audio-source-list admin-provider-grid">
            <legend className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}>
              {t('ttsProvider')}
            </legend>
            {settings.providers.map((provider) => {
              const isSelected = settings.providerId === provider.id;
              const isAvailable = provider.available;

              return (
                <label
                  className={`audio-source-option admin-provider-card ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}`}
                  key={provider.id}
                >
                  <div className="admin-provider-card-top">
                    <div className="admin-provider-visual">
                      <div className="admin-provider-icon">
                        {provider.simulation ? <FlaskIcon size={20} /> : <CloudSpeechIcon size={20} />}
                      </div>
                      <div className="admin-provider-name-box">
                        <span className="admin-provider-name">
                          {provider.simulation ? t('simulationAudio') : provider.displayName}
                        </span>
                        <div className="admin-provider-status-badge-container">
                          {isSelected ? (
                            <span className="admin-status-badge badge-active">
                              <CheckCircleIcon size={12} /> {t('activeBadge')}
                            </span>
                          ) : isAvailable ? (
                            <span className={`admin-status-badge ${provider.simulation ? 'badge-simulation' : 'badge-available'}`}>
                              {provider.simulation ? t('simulationAvailable') : t('providerAvailable')}
                            </span>
                          ) : (
                            <span className="admin-status-badge badge-unavailable">
                              {t('providerUnavailable')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <input
                      checked={isSelected}
                      disabled={!isAvailable}
                      name="tts-provider"
                      type="radio"
                      value={provider.id}
                      className="admin-provider-radio-input"
                      onChange={() => {
                        setSaved(false);
                        setSettings((current) => current && ({
                          ...current,
                          defaultVoiceId: provider.defaultVoiceId,
                          providerId: provider.id,
                        }));
                      }}
                    />
                  </div>

                  <p className="admin-provider-desc">
                    {provider.simulation ? t('simulationDesc') : t('azureSpeechDesc')}
                  </p>

                  <div className="admin-capability-tags">
                    <span className="admin-tag">
                      {provider.simulation ? 'Synthetic Tones' : 'Neural TTS'}
                    </span>
                    {provider.supportedLocales.map((localeCode) => (
                      <span className="admin-tag" key={localeCode}>
                        {localeCode}
                      </span>
                    ))}
                    <span className="admin-tag">
                      {provider.simulation ? 'Local Offline' : 'Studio Quality'}
                    </span>
                  </div>

                  {!isAvailable && (
                    <div className="admin-unconfigured-note">
                      <AlertTriangleIcon size={16} />
                      <span>{t('serverSetupNotice')}</span>
                    </div>
                  )}
                </label>
              );
            })}
          </fieldset>
        </section>

        {/* Section 2: Default Voice Configuration */}
        {selected ? (
          <section className="admin-audio-section">
            <div className="admin-section-header">
              <div className="admin-section-title-group">
                <h2 className="admin-section-title">
                  <AudioWaveIcon size={18} />
                  <span>{t('voiceConfigTitle')}</span>
                </h2>
                <p className="admin-section-desc">
                  {t('voiceConfigDesc')}
                </p>
              </div>
            </div>

            <div className="audio-voice-settings admin-voice-config-card">
              <div className="admin-voice-field-group">
                <label htmlFor="server-voice">{t('serverVoice')}</label>
                <div className="admin-voice-select-wrapper">
                  <select
                    className="audio-settings-select admin-voice-select"
                    id="server-voice"
                    name="server-voice"
                    value={settings.defaultVoiceId ?? ''}
                    onChange={(event) => {
                      setSaved(false);
                      setSettings((current) => current && ({
                        ...current,
                        defaultVoiceId: event.target.value || null,
                      }));
                    }}
                  >
                    <option value={selected.defaultVoiceId ?? ''}>
                      {selected.defaultVoiceId ?? t('providerDefault')}
                    </option>
                  </select>
                  <ChevronDownIcon size={16} />
                </div>
                <div className="admin-voice-meta-badge">
                  <span>{t('voiceFormat')}</span>
                  {settings.defaultVoiceId ? (
                    <code>{settings.defaultVoiceId}</code>
                  ) : null}
                </div>
              </div>

              {/* Server rotation note & locales for tests & clarity */}
              <p className="audio-settings-note">{t('serverRotationUnavailable')}</p>
              <p className="audio-settings-note">{t('providerLocales', { locales: selected.supportedLocales.join(', ') })}</p>

              {/* Dynamic Callout based on provider */}
              {selected.simulation ? (
                <div className="audio-settings-warning admin-callout-warning">
                  <AlertTriangleIcon size={18} />
                  <div className="admin-callout-content">
                    <span className="admin-callout-title">{t('simulationWarning')}</span>
                    <p className="admin-callout-desc">{t('simulationDesc')}</p>
                  </div>
                </div>
              ) : (
                <div className="admin-callout-success">
                  <CheckCircleIcon size={18} />
                  <div className="admin-callout-content">
                    <span className="admin-callout-title">{t('azureReadyTitle')}</span>
                    <p className="admin-callout-desc">{t('azureReadyDesc')}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* Section 3: Device Voice Registry & Rotation (Compact, elegant scrollable card) */}
        <section className="admin-audio-section">
          <div className="admin-section-header">
            <div className="admin-section-title-group">
              <h2 className="admin-section-title">
                <DevicesIcon size={18} />
                <span>{t('deviceVoiceRegistry')}</span>
              </h2>
              <p className="admin-section-desc audio-settings-note">
                {t('deviceRegistryScope')}
              </p>
            </div>
          </div>

          <div className="admin-device-registry-card">
            {/* Master Rotation Toggle */}
            <label className="audio-source-option admin-rotation-toggle-card">
              <input
                type="checkbox"
                checked={registry.rotationEnabled}
                disabled={!registry.supported}
                onChange={(event) => registry.store?.setRotation(event.target.checked)}
              />
              <div className="admin-rotation-toggle-text">
                <strong>{t('rotateVoices')}</strong>
                <small>{t('rotationDescription')}</small>
              </div>
            </label>

            {/* Voices List */}
            {!registry.supported ? (
              <p className="audio-settings-note">{t('speechUnsupported')}</p>
            ) : registry.voices.length === 0 ? (
              <p role="status">{t('voicesUnavailable')}</p>
            ) : (
              <div className="admin-voice-registry-scroll">
                <fieldset className="audio-source-list admin-voice-registry-grid">
                  <legend className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}>
                    {t('deviceVoiceRegistry')}
                  </legend>
                  {registry.voices.map((voice) => {
                    const isEnabled = !registry.disabledIds.has(voice.id);
                    return (
                      <label
                        className={`audio-source-option admin-voice-registry-item ${isEnabled ? 'active' : ''}`}
                        key={voice.id}
                      >
                        <div className="admin-voice-registry-item-left">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(event) => registry.store?.setEnabled(voice.id, event.target.checked)}
                          />
                          <div className="admin-voice-item-info">
                            <strong className="admin-voice-item-title">{voice.displayName}</strong>
                            <small className="admin-voice-item-desc">
                              {voice.id} · {voice.localService ? t('deviceVoiceService') : t('remoteVoiceService')}
                            </small>
                          </div>
                        </div>
                        <span className="admin-voice-item-badge">{voice.locale}</span>
                      </label>
                    );
                  })}
                </fieldset>
              </div>
            )}
          </div>
        </section>

        {/* Section 4: Security & Isolation Notice */}
        <div className="admin-security-card">
          <div className="admin-security-icon">
            <ShieldCheckIcon size={18} />
          </div>
          <div className="admin-security-body">
            <h3 className="admin-security-title">{t('securityTitle')}</h3>
            <p className="admin-security-desc">{t('securityDesc')}</p>
          </div>
        </div>

        {/* Section 5: Action Footer */}
        <div className="audio-settings-footer admin-settings-footer-bar">
          <div className="admin-footer-status">
            {hasChanges && !saved && !saving ? (
              <span className="admin-unsaved-indicator">
                <span className="admin-unsaved-dot" aria-hidden="true" />
                <span>{t('unsavedChanges')}</span>
              </span>
            ) : null}
            {saved ? (
              <p className="admin-save-success" role="status">
                <CheckCircleIcon size={14} />
                <span>{t('providerSaved')}</span>
              </p>
            ) : null}
            {saveError ? (
              <p className="admin-save-error field-error" role="alert">
                <AlertTriangleIcon size={16} />
                <span>{localizedError(saveError.cause, locale)}</span>
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="admin-save-btn"
            disabled={saving || !selected?.available}
            onClick={() => void save()}
          >
            {saving ? (
              <>
                <span className="admin-spinner" aria-hidden="true" />
                <span>{t('saving')}</span>
              </>
            ) : (
              <span>{t('saveProvider')}</span>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
