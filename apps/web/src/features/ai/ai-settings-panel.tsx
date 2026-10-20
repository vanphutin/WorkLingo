'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import type { AiSettings } from '@worklingo/contracts';
import { aiSettingsClient } from '../../lib/api/ai-settings-client';
import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { aiMessages } from '../../i18n/messages/ai';
import './admin-ai-settings.css';
import '../audio/preferences-experience.css';

/* SVG Icons with strict sizing */
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

function CpuIcon({ size = 16 }: { readonly size?: number }) {
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
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" />
    </svg>
  );
}

function UserIcon({ size = 16 }: { readonly size?: number }) {
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
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

function CheckCircleIcon({ size = 16 }: { readonly size?: number }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function AlertTriangleIcon({ size = 16 }: { readonly size?: number }) {
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
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}

function ServerIcon({ size = 16 }: { readonly size?: number }) {
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
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  );
}

function GaugeIcon({ size = 16 }: { readonly size?: number }) {
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
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </svg>
  );
}

function InfoIcon({ size = 16 }: { readonly size?: number }) {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="16" y2="12" />
      <line x1="12" x2="12.01" y1="8" y2="8" />
    </svg>
  );
}

function ShieldCheckIcon({ size = 16 }: { readonly size?: number }) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ChevronDownIcon({ size = 16 }: { readonly size?: number }) {
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
      className="admin-ai-select-chevron"
      style={{ width: size, height: size, maxWidth: size, maxHeight: size, flexShrink: 0 }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function AiSettingsPanel({ admin = false, headingLevel = 1 }: { readonly admin?: boolean; readonly headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const t = useT('ai', aiMessages);
  const { locale } = useLocalePreference();
  const id = useId();
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [error, setError] = useState<{ cause: unknown } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    void aiSettingsClient
      .get(admin)
      .then((value) => {
        if (active) setSettings(value);
      })
      .catch((cause) => {
        if (active) setError({ cause });
      });
    return () => {
      active = false;
    };
  }, [admin, revision]);

  const save = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      setSettings(
        await aiSettingsClient.update(
          admin,
          {
            preferredProvider: settings.preferredProvider,
            fallbackEnabled: settings.fallbackEnabled,
          },
          settings.accountId,
        ),
      );
      setSaved(true);
    } catch (cause) {
      setError({ cause });
    } finally {
      setSaving(false);
    }
  }, [settings, admin]);

  if (!settings) {
    return (
      <section className="admin-ai-card preferences-experience admin-ai-state-container" aria-labelledby={`${id}-title`}>
        <Heading className="admin-ai-title" id={`${id}-title`}>{t(admin ? 'systemTitle' : 'title')}</Heading>
        {error ? (
          <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <p style={{ color: 'var(--danger)', fontWeight: 600, margin: 0 }}>{t('loadError')}</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>{localizedError(error.cause, locale)}</p>
            <button
              type="button"
              className="admin-save-btn"
              onClick={() => setRevision((value) => value + 1)}
              style={{ marginTop: '0.5rem' }}
            >
              {t('retry')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="admin-spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
            <p role="status" style={{ margin: 0, color: 'var(--muted)', fontWeight: 600 }}>{t('loading')}</p>
          </div>
        )}
      </section>
    );
  }

  const readOnly = !settings.routingEnabled || (admin && !settings.canManageSystem);

  return (
    <section className="admin-ai-card preferences-experience" aria-labelledby={`${id}-title`} aria-busy={saving}>
      {/* Header */}
      <header className="admin-ai-header">
        <div className="eyebrow-badge">
          {admin ? <CpuIcon size={14} /> : <UserIcon size={14} />}
          <span>{admin ? t('systemBadge') : t('accountBadge')}</span>
        </div>
        <div className="admin-ai-title-row">
          <Heading className="admin-ai-title" id={`${id}-title`}>{t(admin ? 'systemTitle' : 'title')}</Heading>
          {settings.effectiveProvider ? (
            <span
              className="admin-status-badge badge-active"
              style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '0.35rem' }}
            >
              <CheckCircleIcon size={12} />
              <span>{t(settings.effectiveProvider)}</span>
            </span>
          ) : null}
        </div>
        <p className="admin-ai-desc">{t(admin ? 'systemDescription' : 'description')}</p>
      </header>

      {/* Warning Callouts if read-only or simulation */}
      {readOnly ? (
        <div className="admin-ai-callout callout-warning">
          <InfoIcon size={16} />
          <span>{t(settings.routingEnabled ? 'readOnly' : 'routingDisabled')}</span>
        </div>
      ) : null}

      {settings.simulation ? (
        <div className="admin-ai-callout callout-warning">
          <AlertTriangleIcon size={16} />
          <span>{t('simulation')}</span>
        </div>
      ) : null}

      {/* Main Configuration Card */}
      <div className="admin-ai-config-section">
        <fieldset disabled={saving || readOnly} className="admin-ai-fieldset">
          {/* Provider Select */}
          <div className="admin-ai-field-group">
            <label htmlFor={`${id}-provider`} className="admin-ai-field-label">
              <SparklesIcon size={16} />
              <span>{t('preferred')}</span>
            </label>
            <div className="admin-ai-select-wrapper">
              <select
                className="admin-ai-select"
                id={`${id}-provider`}
                value={settings.preferredProvider}
                onChange={(event) => {
                  setSaved(false);
                  setSettings({
                    ...settings,
                    preferredProvider: event.target.value as AiSettings['preferredProvider'],
                  });
                }}
              >
                {!admin ? <option value="system-default">{t('automatic')}</option> : null}
                {settings.providers.map((provider) => (
                  <option key={provider.id} value={provider.id} disabled={!provider.available}>
                    {t(provider.id)} · {provider.model ?? t('unavailable')} · {t(provider.available ? 'available' : 'unavailable')}
                  </option>
                ))}
              </select>
              <ChevronDownIcon size={16} />
            </div>
          </div>

          {/* Fallback Option */}
          <label className={`admin-ai-toggle-card ${settings.fallbackEnabled ? 'active' : ''}`}>
            <input
              type="checkbox"
              className="admin-ai-checkbox"
              checked={settings.fallbackEnabled}
              onChange={(event) => {
                setSaved(false);
                setSettings({ ...settings, fallbackEnabled: event.target.checked });
              }}
            />
            <div className="admin-ai-toggle-content">
              <span className="admin-ai-toggle-title">{t('fallback')}</span>
              <span className="admin-ai-toggle-desc">{t('fallbackWarning')}</span>
            </div>
          </label>

          {!settings.systemFallbackEnabled ? (
            <div className="admin-ai-callout callout-warning">
              <AlertTriangleIcon size={16} />
              <span>{t('policyDisabled')}</span>
            </div>
          ) : null}

          {/* Action Footer */}
          <div className="admin-ai-footer">
            <div className="admin-ai-footer-status">
              {saved ? (
                <p className="admin-save-success" role="status">
                  <CheckCircleIcon size={14} />
                  <span>{t('saved')}</span>
                </p>
              ) : null}
              {error ? (
                <p className="admin-save-error" role="alert">
                  <AlertTriangleIcon size={14} />
                  <span>{localizedError(error.cause, locale)}</span>
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="admin-save-btn"
              disabled={saving || readOnly}
              onClick={() => void save()}
            >
              {saving ? (
                <>
                  <span className="admin-spinner" aria-hidden="true" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <span>{t('save')}</span>
              )}
            </button>
          </div>
        </fieldset>
      </div>

      {/* Gateway Insights & Specs Grid */}
      <div className="admin-ai-insights-grid">
        <div className="admin-ai-insight-item">
          <div className="admin-ai-insight-icon">
            <ServerIcon size={16} />
          </div>
          <div className="admin-ai-insight-body">
            <span className="admin-ai-insight-label">{t('effectiveLabel')}</span>
            <span className="admin-ai-insight-val">
              {t('effective', { provider: t(settings.effectiveProvider) })}
            </span>
          </div>
        </div>

        <div className="admin-ai-insight-item">
          <div className="admin-ai-insight-icon">
            <GaugeIcon size={16} />
          </div>
          <div className="admin-ai-insight-body">
            <span className="admin-ai-insight-label">{t('tokenCapLabel')}</span>
            <span className="admin-ai-insight-val">
              {t('tokenCap', { tokens: settings.maxOutputTokens })}
            </span>
          </div>
        </div>
      </div>

      {/* Governance & Calibration Notes */}
      <div className="admin-ai-notes-group">
        <div className="admin-ai-note-box">
          <InfoIcon size={16} />
          <p>{t('openaiOnly')}</p>
        </div>
        <div className="admin-ai-note-box calibration-note">
          <ShieldCheckIcon size={16} />
          <p>{t('calibration')}</p>
        </div>
      </div>
    </section>
  );
}
