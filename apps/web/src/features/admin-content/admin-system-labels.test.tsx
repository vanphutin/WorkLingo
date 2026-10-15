import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminOperationsClient } from '../../lib/api/admin-operations-client';
import { curriculumFoundationClient } from '../../lib/api/curriculum-foundation-client';
import { OperationsWorkspace } from '../admin-observability/operations-workspace';
import { FoundationDefinitionEditor } from '../admin-curriculum/foundation-definition-editor';
import { LocaleProvider } from '../../i18n/provider';
import { ValidationPanel } from './validation-panel';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('admin system enum display', () => {
  it('localizes validation summaries and actionable issue names while retaining diagnostic codes', () => {
    render(<LocaleProvider initialLocale="vi"><ValidationPanel isValidating={false} canPublish={false} lastValidatedRevision={1} currentDraftRevision={1} onValidate={vi.fn()} onSelectIssue={vi.fn()} issues={[
      { code: 'VAL_MISSING_CONTENT_REF', severity: 'error', message: "Activity 'read-email' references missing content 'email-one'", range: { start: { line: 12, column: 1, offset: 100 }, end: { line: 12, column: 5, offset: 104 } } },
      { code: 'WARN_UNUSED_AUDIO_SCRIPT', severity: 'warning', message: "Audio script 'call' is unused", range: { start: { line: 22, column: 1, offset: 200 }, end: { line: 22, column: 5, offset: 204 } } },
    ]} /></LocaleProvider>);
    expect(screen.getByText('1 lỗi, 1 cảnh báo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LỖI: Không tìm thấy nội dung được tham chiếu. tại dòng 12' })).toBeInTheDocument();
    expect(screen.getByText('VAL_MISSING_CONTENT_REF')).toBeInTheDocument();
    expect(screen.getByText("Activity 'read-email' references missing content 'email-one'")).toBeInTheDocument();
  });
  it('displays human-readable job labels while keeping machine filter values', async () => {
    vi.spyOn(adminOperationsClient, 'getSummary').mockResolvedValue({ activeWorkers: 1, completedCount: 8, failedCount: 1, jobTypeBreakdown: {}, queueDepth: 2, runningCount: 1, workerConfig: { leaseMs: 30000, pollIntervalMs: 1000, workerEnabled: true } });
    vi.spyOn(adminOperationsClient, 'listJobs').mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    render(<OperationsWorkspace />);
    await screen.findByText('Queue depth');
    expect(screen.getByRole('option', { name: 'Waiting to retry' })).toHaveValue('RETRY_WAIT');
  });
  it('displays human-readable Foundation category labels while keeping category identifiers', async () => {
    vi.spyOn(curriculumFoundationClient, 'getDraft').mockResolvedValue({ missionId: '11111111-1111-4111-8111-111111111111', revision: 1, status: 'DRAFT', publishedRevisions: [], definition: null });
    render(<FoundationDefinitionEditor missionId="11111111-1111-4111-8111-111111111111" missionTitle="English educational mission" prerequisiteOptions={[]} />);
    await screen.findByRole('heading', { name: 'Foundation Definition' });
    expect(screen.getByRole('option', { name: 'Grammar' })).toHaveValue('grammar');
    expect(screen.getByText(/English educational mission/)).toBeInTheDocument();
  });
});
