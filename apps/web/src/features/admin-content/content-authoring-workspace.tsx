'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type {
  ContentImportDto,
  ContentIssueDto,
  ContentPreviewDto,
  PublishContentImportResult,
} from '@worklingo/contracts';

import { ApiError, apiClient } from '../../lib/api/api-client';
import { AudioPreview } from './audio-preview';
import { LessonPreview } from './lesson-preview';
import { PublishPanel } from './publish-panel';
import { SourceEditor, type SourceEditorHandle } from './source-editor';
import { offsetForPosition } from './source-position';
import { ValidationPanel } from './validation-panel';

export type WorkspaceTab = 'source' | 'validation' | 'preview' | 'publish';

export interface ContentAuthoringWorkspaceProps {
  readonly initialImport: ContentImportDto;
  readonly debounceMs?: number;
}

export function ContentAuthoringWorkspace({
  initialImport,
  debounceMs = 1000,
}: ContentAuthoringWorkspaceProps) {
  const [localSource, setLocalSource] = useState(initialImport.rawSource);
  const [_lastSavedSource, setLastSavedSource] = useState(initialImport.rawSource);
  const [currentDraftRevision, setCurrentDraftRevision] = useState(initialImport.draftRevision);
  const [sourceHash, setSourceHash] = useState(initialImport.sourceHash);
  const [status, setStatus] = useState(initialImport.status);

  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [publishedLessonId, setPublishedLessonId] = useState<string | null>(initialImport.lessonId);
  const [publishedLessonVersionId, setPublishedLessonVersionId] = useState<string | null>(
    initialImport.lessonVersionId,
  );

  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error' | 'conflict'>(
    'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isValidating, setIsValidating] = useState(false);
  const [canPublish, setCanPublish] = useState(initialImport.status === 'VALIDATED');
  const [issues, setIssues] = useState<ContentIssueDto[]>([]);
  const [lastValidatedRevision, setLastValidatedRevision] = useState<number | null>(
    initialImport.validationHash ? initialImport.draftRevision : null,
  );

  const [preview, setPreview] = useState<ContentPreviewDto | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(true);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('source');

  const editorRef = useRef<SourceEditorHandle>(null);
  const pendingSelectionOffsetRef = useRef<number | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const isReadOnly = status === 'PUBLISHED' || status === 'ARCHIVED';

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const triggerSave = useCallback(
    async (sourceToSave: string, expectedRevision: number) => {
      if (isReadOnly) return;

      try {
        setSavingState('saving');
        setErrorMessage(null);

        const updated = await apiClient.updateContentSource(initialImport.id, {
          rawSource: sourceToSave,
          expectedDraftRevision: expectedRevision,
        });

        if (isMountedRef.current) {
          setCurrentDraftRevision(updated.draftRevision);
          setSourceHash(updated.sourceHash);
          setLastSavedSource(sourceToSave);
          setStatus(updated.status);
          setSavingState('saved');
        }
      } catch (err: unknown) {
        if (!isMountedRef.current) return;

        const is409 =
          (err instanceof ApiError && err.status === 409) ||
          (typeof err === 'object' &&
            err !== null &&
            'status' in err &&
            (err as { status: number }).status === 409);

        if (is409) {
          setSavingState('conflict');
          setErrorMessage(
            'Conflict: This draft was modified in another session. Your local changes are preserved in the editor.',
          );
        } else {
          setSavingState('error');
          setErrorMessage(err instanceof Error ? err.message : 'Failed to autosave changes.');
        }
      }
    },
    [initialImport.id, isReadOnly],
  );

  function handleSourceChange(newSource: string) {
    setLocalSource(newSource);

    if (isReadOnly) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void triggerSave(newSource, currentDraftRevision);
    }, debounceMs);
  }

  const checkAudioReadiness = useCallback(
    async (audioScripts?: readonly { slug: string }[]) => {
      try {
        const artifacts = await apiClient.listContentAudioArtifacts(initialImport.id);
        if (!audioScripts || audioScripts.length === 0) {
          setIsAudioReady(artifacts.length === 0 || artifacts.every((a) => a.status === 'READY'));
        } else {
          const allScriptsReady = audioScripts.every((s) =>
            artifacts.some((a) => a.audioScriptSlug === s.slug && a.status === 'READY'),
          );
          setIsAudioReady(allScriptsReady);
        }
      } catch {
        setIsAudioReady(false);
      }
    },
    [initialImport.id],
  );

  const fetchPreview = useCallback(async () => {
    try {
      setIsLoadingPreview(true);
      const prev = await apiClient.getContentPreview(initialImport.id);
      if (isMountedRef.current) {
        setPreview(prev);
        void checkAudioReadiness(prev.normalizedDraft?.audioScripts);
      }
    } catch {
      // preview error handled gracefully
    } finally {
      if (isMountedRef.current) {
        setIsLoadingPreview(false);
      }
    }
  }, [checkAudioReadiness, initialImport.id]);

  useEffect(() => {
    if (activeTab === 'preview' || activeTab === 'publish') {
      void fetchPreview();
      void checkAudioReadiness(preview?.normalizedDraft?.audioScripts);
    }
  }, [activeTab, checkAudioReadiness, fetchPreview, preview?.normalizedDraft?.audioScripts]);

  useEffect(() => {
    if (activeTab !== 'source' || pendingSelectionOffsetRef.current === null) return;

    const offset = pendingSelectionOffsetRef.current;
    pendingSelectionOffsetRef.current = null;
    editorRef.current?.focus();
    editorRef.current?.setSelection(offset, offset);
  }, [activeTab]);

  async function handleValidate() {
    try {
      setIsValidating(true);
      setErrorMessage(null);

      const result = await apiClient.validateContentImport(initialImport.id, {
        expectedDraftRevision: currentDraftRevision,
      });

      if (isMountedRef.current) {
        setCanPublish(result.canPublish);
        setIssues(result.issues);
        setLastValidatedRevision(result.draftRevision);
        setStatus(result.status);
        setSourceHash(result.sourceHash);
        setIsValidating(false);
        void checkAudioReadiness();
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setIsValidating(false);

      if (err instanceof ApiError && err.status === 422 && Array.isArray(err.details)) {
        setIssues(err.details as ContentIssueDto[]);
        setCanPublish(false);
        setLastValidatedRevision(currentDraftRevision);
      } else if (err instanceof ApiError && err.status === 409) {
        setSavingState('conflict');
        setErrorMessage('Conflict: Draft revision changed before validation.');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Validation failed.');
      }
    }
  }

  function handleSelectIssue(issue: ContentIssueDto) {
    const offset =
      issue.range.start.offset !== undefined && issue.range.start.offset >= 0
        ? issue.range.start.offset
        : offsetForPosition(localSource, issue.range.start);

    if (activeTab === 'source') {
      editorRef.current?.focus();
      editorRef.current?.setSelection(offset, offset);
      return;
    }

    pendingSelectionOffsetRef.current = offset;
    setActiveTab('source');
  }

  function handlePublished(result: PublishContentImportResult) {
    setStatus('PUBLISHED');
    setPublishedVersion(result.version);
    setPublishedLessonId(result.lessonId);
    setPublishedLessonVersionId(result.lessonVersionId);
  }

  function handleArchived() {
    setStatus('ARCHIVED');
  }

  const highlightedLines = issues.map((i) => i.range.start.line);

  return (
    <div className="content-authoring-workspace">
      <div className="workspace-header">
        <div className="workspace-title-row">
          <h1>Lesson Authoring</h1>
          <div className="workspace-badges">
            <span className={`status-pill pill-${status.toLowerCase()}`}>{status}</span>
            <span className="revision-badge">Revision {currentDraftRevision}</span>
            {savingState === 'saving' && <span className="save-status saving">Saving…</span>}
            {savingState === 'saved' && <span className="save-status saved">Saved</span>}
          </div>
        </div>

        {savingState === 'conflict' && errorMessage && (
          <div className="status-card error-card conflict-alert" role="alert">
            <strong>Edit Conflict Detected</strong>
            <p>{errorMessage}</p>
          </div>
        )}

        {savingState === 'error' && errorMessage && (
          <div className="status-card error-card" role="alert">
            <p>{errorMessage}</p>
          </div>
        )}
      </div>

      <div className="workspace-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'source'}
          className={`tab-btn ${activeTab === 'source' ? 'active' : ''}`}
          onClick={() => setActiveTab('source')}
        >
          Source Editor
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'validation'}
          className={`tab-btn ${activeTab === 'validation' ? 'active' : ''}`}
          onClick={() => setActiveTab('validation')}
        >
          Validation ({issues.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'preview'}
          className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'publish'}
          className={`tab-btn ${activeTab === 'publish' ? 'active' : ''}`}
          onClick={() => setActiveTab('publish')}
        >
          Publish
        </button>
      </div>

      {activeTab === 'source' && (
        <div className="workspace-layout">
          <div className="workspace-pane editor-pane">
            <SourceEditor
              ref={editorRef}
              source={localSource}
              onChange={handleSourceChange}
              readOnly={isReadOnly}
              highlightedLines={highlightedLines}
            />
          </div>

          <div className="workspace-pane validation-pane mobile-hidden">
            <ValidationPanel
              isValidating={isValidating}
              canPublish={canPublish}
              issues={issues}
              lastValidatedRevision={lastValidatedRevision}
              currentDraftRevision={currentDraftRevision}
              onValidate={handleValidate}
              onSelectIssue={handleSelectIssue}
            />
          </div>
        </div>
      )}

      {activeTab === 'validation' && (
        <div className="workspace-layout validation-only">
          <div className="workspace-pane validation-pane full-width">
            <ValidationPanel
              isValidating={isValidating}
              canPublish={canPublish}
              issues={issues}
              lastValidatedRevision={lastValidatedRevision}
              currentDraftRevision={currentDraftRevision}
              onValidate={handleValidate}
              onSelectIssue={handleSelectIssue}
            />
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="workspace-view preview-view">
          {isLoadingPreview && !preview ? (
            <p className="loading-text">Đang tải bản xem trước...</p>
          ) : preview ? (
            <div className="preview-grid">
              <LessonPreview preview={preview} />
              <AudioPreview
                importId={initialImport.id}
                draftRevision={currentDraftRevision}
                audioScripts={preview.normalizedDraft?.audioScripts}
                onAudioStateChange={() => void checkAudioReadiness(preview.normalizedDraft?.audioScripts)}
              />
            </div>
          ) : (
            <div className="preview-empty" role="region" aria-label="Lesson preview">
              <p>No preview available. Validate your lesson draft without errors to generate a structured preview.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'publish' && (
        <div className="workspace-view publish-view">
          <PublishPanel
            importId={initialImport.id}
            draftRevision={currentDraftRevision}
            sourceHash={sourceHash}
            canPublish={canPublish}
            isAudioReady={isAudioReady}
            status={status}
            publishedVersion={publishedVersion}
            publishedLessonId={publishedLessonId}
            publishedLessonVersionId={publishedLessonVersionId}
            onPublished={handlePublished}
            onArchive={handleArchived}
          />
        </div>
      )}
    </div>
  );
}
