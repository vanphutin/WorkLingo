'use client';

import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import type { ContentImportDto } from '@worklingo/contracts';

import { ContentAuthoringWorkspace } from '../../../../../features/admin-content/content-authoring-workspace';
import { ApiError, apiClient } from '../../../../../lib/api/api-client';

export default function ContentImportDetailPage() {
  const params = useParams();
  const importId = params['importId'] as string;

  const [contentImport, setContentImport] = useState<ContentImportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Không thể tải bài học');
          }
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
        <p>Đang tải nội dung bài học...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-error-state" role="alert">
        <h2>Lỗi khi tải bài học</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!contentImport) {
    return (
      <div className="workspace-error-state" role="alert">
        <p>Không tìm thấy bài học</p>
      </div>
    );
  }

  return <ContentAuthoringWorkspace initialImport={contentImport} />;
}
