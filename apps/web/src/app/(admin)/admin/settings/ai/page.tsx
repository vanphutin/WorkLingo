'use client';

import { AdminLink as Link } from '../../../../../features/admin-dashboard/admin-navigation-guard';
import { AiSettingsPanel } from '../../../../../features/ai/ai-settings-panel';
import { useT } from '../../../../../i18n/provider';
import { audioMessages } from '../../../../../i18n/messages/audio';

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

export default function AdminAiSettingsPage() {
  const t = useT('audio', audioMessages);

  return (
    <div className="admin-ai-page-wrapper preferences-experience">
      {/* Settings Navigation Tabs */}
      <nav className="admin-settings-tabs-nav" aria-label="Settings categories">
        <Link href="/admin/settings/audio" className="admin-settings-tab">
          <AudioWaveIcon size={16} />
          <span>{t('audioTab')}</span>
        </Link>
        <Link href="/admin/settings/ai" className="admin-settings-tab active" aria-current="page">
          <SparklesIcon size={16} />
          <span>{t('aiTab')}</span>
        </Link>
      </nav>

      {/* Panels for System & Account */}
      <div className="admin-ai-panels-container">
        <AiSettingsPanel admin />
        <AiSettingsPanel headingLevel={2} />
      </div>
    </div>
  );
}
