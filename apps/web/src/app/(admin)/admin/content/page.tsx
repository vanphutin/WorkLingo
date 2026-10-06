'use client';

import React, { useEffect, useState } from 'react';

import type { ContentImportDto } from '@worklingo/contracts';

import { ContentList } from '../../../../features/admin-content/content-list';
import { ApiError, apiClient } from '../../../../lib/api/api-client';

export default function AdminContentPage() {
  const [imports, setImports] = useState<ContentImportDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Failed to load content imports.');
          }
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
        <p>Loading content drafts…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-card error-card" role="alert">
        <h2>Unable to load imports</h2>
        <p>{error}</p>
      </div>
    );
  }

  return <ContentList imports={imports} />;
}
