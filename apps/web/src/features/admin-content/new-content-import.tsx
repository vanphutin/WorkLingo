'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { ApiError, apiClient } from '../../lib/api/api-client';

const DEFAULT_TEMPLATE = `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: new-lesson-slug
title: New Lesson Title
level: foundation
duration_minutes: 60
objective: Lesson objective here.

[WORD_BANK topic-name]
title: Topic Name

[[LANGUAGE_BLOCK example-block]]
expression: example expression
meaning_vi: nghĩa tiếng Việt
pronunciation: /example/
collocations: example phrase
grammar_pattern: pattern
example: Example sentence.
common_error: Avoid common mistake.
[[/LANGUAGE_BLOCK]]
[/WORD_BANK]

[CONTENT sample-content]
type: email
text:
<<<
Content body text here.
>>>
[/CONTENT]

[ACTIVITY sample-activity]
learning_block: activate
activity_type: writing
response_type: short_text
skills: writing
language_block_refs: example-block

QUESTION:
Sample practice question.
[/ACTIVITY]
`;

export function NewContentImport() {
  const router = useRouter();
  const [rawSource, setRawSource] = useState(DEFAULT_TEMPLATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!rawSource.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const created = await apiClient.createContentImport(rawSource);
      router.push(`/admin/content/${created.id}`);
    } catch (error) {
      setIsSubmitting(false);
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Failed to create content import draft. Please try again.');
      }
    }
  }

  return (
    <div className="new-import-container">
      <div className="new-import-header">
        <h1>New Content Import</h1>
        <p>
          Paste or write lesson text in the WorkLingo Lesson Format 1.0. Exact source will be
          preserved for editing and validation.
        </p>
      </div>

      {errorMessage && (
        <div className="status-card error-card" role="alert">
          <p>{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="new-import-form">
        <div className="form-group">
          <label htmlFor="raw-source-input" className="form-label">
            Lesson Source (WorkLingoLesson/1.0)
          </label>
          <textarea
            id="raw-source-input"
            aria-label="Lesson source"
            className="raw-source-textarea"
            rows={20}
            value={rawSource}
            onChange={(e) => setRawSource(e.target.value)}
            disabled={isSubmitting}
            spellCheck={false}
          />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !rawSource.trim()}
          >
            {isSubmitting ? 'Importing…' : 'Import Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
