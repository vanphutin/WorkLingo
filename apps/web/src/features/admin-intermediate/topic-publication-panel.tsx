'use client';

import { useEffect, useRef, useState } from 'react';
import { contentIssueSchema, type ContentImportDto, type ContentPreviewDto, type PublishContentImportResult, type ValidateContentImportResult } from '@worklingo/contracts';
import { ApiError, apiClient } from '../../lib/api/api-client';
import { useT } from '../../i18n/provider';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import { AudioPreview } from '../admin-content/audio-preview';
import { ValidationPanel } from '../admin-content/validation-panel';
import { PublishPanel } from '../admin-content/publish-panel';
import { useAdminContent } from '../admin-content/i18n';
import '../admin-content/authoring-experience.css';

type Props = {
  record: ContentImportDto;
  blocked: boolean;
  approved: boolean;
  onRecordChange: (record: ContentImportDto) => void;
  onBusyChange: (busy: boolean) => void;
};
export function TopicPublicationPanel(props: Props) {
  const { record } = props;
  return <PublicationSession key={`${record.id}:${record.draftRevision}:${record.sourceHash}`} {...props} />;
}
function PublicationSession({ record, blocked, approved, onRecordChange, onBusyChange }: Props) {
  const t = useT('intermediateTopics', intermediateTopicsMessages);
  const { message } = useAdminContent();
  const [validation, setValidation] = useState<ValidateContentImportResult | null>(null);
  const [preview, setPreview] = useState<ContentPreviewDto | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState<number | null>(null);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const readOnly = record.status === 'PUBLISHED' || record.status === 'ARCHIVED';
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { onBusyChange(validating || publishing); }, [validating, publishing, onBusyChange]);
  useEffect(() => () => onBusyChange(false), [onBusyChange]);

  async function validate() {
    if (blocked || readOnly || inFlight.current || publishing) return;
    inFlight.current = true; setValidating(true); setError(null); setPreview(null); setSelectedAudio({}); setValidation(null);
    try {
      const result = await apiClient.validateContentImport(record.id, { expectedDraftRevision: record.draftRevision });
      if (!mounted.current) return;
      if (result.importId !== record.id || result.draftRevision !== record.draftRevision || result.sourceHash !== record.sourceHash) throw new ApiError({ code: 'TOPIC_PUBLICATION_STALE', status: 409, message: t('publicationStale') });
      setValidation(result);
      if (result.canPublish) {
        const next = await apiClient.getContentPreview(record.id);
        if (!mounted.current) return;
        if (next.importId !== record.id || next.draftRevision !== record.draftRevision || next.sourceHash !== record.sourceHash) throw new ApiError({ code: 'TOPIC_PUBLICATION_STALE', status: 409, message: t('publicationStale') });
        setPreview(next);
      }
      onRecordChange({ ...record, status: result.status, validationHash: result.canPublish ? result.sourceHash : null });
    } catch (failure) {
      if (mounted.current) {
        setPreview(null);
        const details = failure instanceof ApiError && failure.status === 422 ? contentIssueSchema.array().safeParse(failure.details) : null;
        if (details?.success) {
          setValidation({ importId: record.id, draftRevision: record.draftRevision, sourceHash: record.sourceHash, status: 'DRAFT', canPublish: false, issues: details.data, issuesTruncated: false });
          onRecordChange({ ...record, status: 'DRAFT', validationHash: null });
        } else setError(failure);
      }
    }
    finally { if (mounted.current) { inFlight.current = false; setValidating(false); } }
  }
  function published(result: PublishContentImportResult) {
    if (!mounted.current) return;
    setVersion(result.version);
    onRecordChange({ ...record, status: result.status, lessonId: result.lessonId, lessonVersionId: result.lessonVersionId });
  }
  const scripts = preview?.normalizedDraft?.audioScripts ?? [];
  const canPublish = approved && !blocked && !validating && validation?.canPublish === true && preview?.canPublish === true && preview.normalizedDraft !== null;
  const audioReady = preview?.normalizedDraft != null && scripts.every(script => Boolean(selectedAudio[script.slug]));
  return <section className="intermediate-card intermediate-publication authoring-experience" aria-label={t('publicationTitle')}>
    <h2>{t('publicationTitle')}</h2>
    <p className="intermediate-help">{t('publicationHelp')}</p>
    {(blocked || !approved) && !readOnly ? <p role="status">{t('publicationBlocked')}</p> : null}
    {error ? <p role="alert" className="intermediate-notice intermediate-error">{error instanceof ApiError && error.code === 'TOPIC_PUBLICATION_STALE' ? t('publicationStale') : message(error)}</p> : null}
    <fieldset className="intermediate-form-fields" disabled={blocked || validating || publishing}>
      <legend className="intermediate-sr-only">{t('publicationTitle')}</legend>
      {!readOnly ? <>
        <ValidationPanel isValidating={validating} canPublish={validation?.canPublish ?? false} issues={validation?.issues ?? []}
          lastValidatedRevision={validation?.draftRevision ?? null} currentDraftRevision={record.draftRevision} onValidate={() => void validate()}
          onSelectIssue={() => document.getElementById('topic-publication-edit-target')?.focus()} />
        {preview?.normalizedDraft ? <AudioPreview importId={record.id} draftRevision={record.draftRevision} audioScripts={scripts}
          selectedAudioArtifacts={selectedAudio} onSelectedAudioArtifactsChange={setSelectedAudio} /> : null}
      </> : null}
      <PublishPanel importId={record.id} draftRevision={record.draftRevision} sourceHash={record.sourceHash} status={record.status}
        canPublish={canPublish} isAudioReady={audioReady} selectedAudioArtifacts={selectedAudio} vocabularyReviewRequired
        publishedVersion={version} onPublished={published} onBusyChange={setPublishing} />
    </fieldset>
    {readOnly ? <p role="status" className="intermediate-publication-result">{t(record.status === 'PUBLISHED' ? 'publicationDone' : 'publicationArchived')}</p> : null}
  </section>;
}
