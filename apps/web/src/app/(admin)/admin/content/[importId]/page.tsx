'use client';

import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useLocalePreference, useT } from '../../../../../i18n/provider';
import { routeMessages } from '../../../../../i18n/messages/routes';
import { localizedError } from '../../../../../i18n/errors';

import type { ContentImportDto } from '@worklingo/contracts';

import { ContentAuthoringWorkspace } from '../../../../../features/admin-content/content-authoring-workspace';
import { apiClient } from '../../../../../lib/api/api-client';

export default function ContentImportDetailPage() {
  const params = useParams();
  const t = useT('routes', routeMessages);
  const { locale } = useLocalePreference();
  const importId = params['importId'] as string;

  const [contentImport, setContentImport] = useState<ContentImportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchImport() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getContentImport(importId);
        if (!isCancelled) {
          setContentImport(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (importId) {
      void fetchImport();
    }

    return () => {
      isCancelled = true;
    };
  }, [importId]);

  if (loading) {
    return (
      <div className="workspace-loading-state" role="status">
        <p>{t('loadingLesson')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-error-state" role="alert">
        <h2>{t('lessonError')}</h2>
        <p>{localizedError(error, locale)}</p>
      </div>
    );
  }

  if (!contentImport) {
    return (
      <div className="workspace-error-state" role="alert">
        <p>{t('lessonMissing')}</p>
      </div>
    );
  }

  return <ContentAuthoringWorkspace initialImport={contentImport} />;
}
