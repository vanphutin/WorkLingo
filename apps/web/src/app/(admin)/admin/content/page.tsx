'use client';

import React, { useEffect, useState } from 'react';

import type { ContentImportDto } from '@worklingo/contracts';

import { ContentList } from '../../../../features/admin-content/content-list';
import { apiClient } from '../../../../lib/api/api-client';
import { useLocalePreference, useT } from '../../../../i18n/provider';
import { routeMessages } from '../../../../i18n/messages/routes';
import { localizedError } from '../../../../i18n/errors';

export default function AdminContentPage() {
  const t = useT('routes', routeMessages);
  const { locale } = useLocalePreference();
  const [imports, setImports] = useState<ContentImportDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadImports() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiClient.listContentImports();
        if (isMounted) {
          setImports(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setIsLoading(false);
          setError(err);
        }
      }
    }

    void loadImports();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="admin-page-loading" role="status">
        <p>{t('loadingLesson')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-card error-card" role="alert">
        <h1>{t('lessonError')}</h1>
        <p>{localizedError(error, locale)}</p>
      </div>
    );
  }

  return <ContentList imports={imports} />;
}
