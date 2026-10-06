'use client';

import Link from 'next/link';
import React from 'react';

import type { ContentImportDto } from '@worklingo/contracts';

interface ContentListProps {
  readonly imports: readonly ContentImportDto[];
}

function extractLessonInfo(rawSource: string): { title: string; slug: string } {
  const slugMatch = rawSource.match(/slug:\s*([^\r\n]+)/i);
  const titleMatch = rawSource.match(/title:\s*([^\r\n]+)/i);
  const slug = slugMatch ? slugMatch[1]!.trim() : 'untitled-draft';
  const title = titleMatch ? titleMatch[1]!.trim() : slug;
  return { title, slug };
}

export function ContentList({ imports }: ContentListProps) {
  if (imports.length === 0) {
    return (
      <div className="content-list-empty" role="region" aria-label="Content imports">
        <div className="empty-card">
          <h2>No content imports yet</h2>
          <p>Create your first import draft to begin authoring WorkLingo lessons.</p>
          <Link href="/admin/content/new" className="btn btn-primary">
            New Import
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="content-list-container" role="region" aria-label="Content imports">
      <div className="content-list-header">
        <div>
          <h2>All Imports ({imports.length})</h2>
          <p className="subtitle">Draft, validate, test audio, and publish lesson versions.</p>
        </div>
        <Link href="/admin/content/new" className="btn btn-primary">
          New Import
        </Link>
      </div>

      <div className="content-table-wrapper">
        <table className="content-table">
          <thead>
            <tr>
              <th scope="col">Status</th>
              <th scope="col">Lesson</th>
              <th scope="col">Revision</th>
              <th scope="col">Updated</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {imports.map((item) => {
              const { title, slug } = extractLessonInfo(item.rawSource);
              const formattedDate = new Date(item.updatedAt).toLocaleString();
              const actionLabel = item.status === 'PUBLISHED' ? 'View' : 'Open Draft';

              return (
                <tr key={item.id} className={`status-row status-${item.status.toLowerCase()}`}>
                  <td>
                    <span className={`status-pill pill-${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="lesson-meta-cell">
                      <strong className="lesson-title">{title}</strong>
                      <span className="lesson-slug">{slug}</span>
                    </div>
                  </td>
                  <td>
                    <span className="revision-badge">Rev {item.draftRevision}</span>
                  </td>
                  <td>
                    <time dateTime={item.updatedAt} className="updated-time">
                      {formattedDate}
                    </time>
                  </td>
                  <td>
                    <Link
                      href={`/admin/content/${item.id}`}
                      className="btn btn-sm btn-secondary"
                    >
                      {actionLabel}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
