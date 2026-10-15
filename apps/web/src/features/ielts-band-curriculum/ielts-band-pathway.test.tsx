import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ieltsBandClient } from '../../lib/api/ielts-band-client';
import { IeltsBandDashboardCard, IeltsBandPathway } from './ielts-band-pathway';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';

function SwitchLocale() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => setLocale('en')}>Switch language</button>;
}

vi.mock('../../lib/api/ielts-band-client', () => ({ ieltsBandClient: { availability: vi.fn(), start: vi.fn(), updateTarget: vi.fn(), evaluate: vi.fn() } }));
afterEach(cleanup);

const pathway = {
  journeyId: crypto.randomUUID(), curriculumVersionId: crypto.randomUUID(), curriculumVersion: 1,
  currentStageCode: 'foundation_to_3' as const, currentStageTitle: 'Foundation to 3.0', targetBand: 6,
  revision: 1, startedAt: new Date().toISOString(), completedAt: null,
  proficiency: ['listening', 'reading', 'writing', 'speaking'].map((skill) => ({ skill: skill as 'listening', descriptor: 'insufficient_evidence' as const, confidence: 'none' as const, sampleCount: 0 })),
  practicePerformance: { completedSessions: 0, evaluatedBlocks: 0, recentCorrectRate: null },
  unmetCriteria: ['Complete at least 2 integrated sessions.'], remediation: [], recommendedPracticeFormats: ['Four-skill integrated session'], canAdvance: false,
};

describe('IELTS band pathway', () => {
  it('localizes evidence and generated criteria while keeping curriculum content and the target selection', async () => {
    vi.mocked(ieltsBandClient.availability).mockResolvedValue({ eligible: true, lockedReason: null, targetBands: [3, 4, 5, 6, 7, 8, 9], journey: pathway });
    render(<LocaleProvider initialLocale="vi"><SwitchLocale /><IeltsBandPathway /><IeltsBandDashboardCard /></LocaleProvider>);
    expect(await screen.findByText('Band mục tiêu 6')).toBeVisible();
    expect(screen.getAllByText('Chưa đủ bằng chứng')).toHaveLength(4);
    expect(screen.getByText('Hoàn thành ít nhất 2 buổi luyện tập tích hợp.')).toBeVisible();
    expect(screen.getAllByText('Foundation to 3.0')[0]).toHaveAttribute('lang', 'en');
    const target = screen.getByLabelText('Cập nhật band mục tiêu');
    fireEvent.change(target, { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByLabelText('Update target band')).toBe(target);
    expect(target).toHaveValue('7');
  });
  it('keeps a target band separate from evidence-backed proficiency', async () => {
    vi.mocked(ieltsBandClient.availability).mockResolvedValue({ eligible: true, lockedReason: null, targetBands: [3, 4, 5, 6, 7, 8, 9], journey: pathway });
    render(<IeltsBandPathway />);
    expect(await screen.findByText('Target Band 6')).not.toBeNull();
    expect(screen.getAllByText('Insufficient evidence')).toHaveLength(4);
    expect(screen.queryByText(/estimated band/i)).toBeNull();
    expect(screen.getByText('Complete at least 2 integrated sessions.')).not.toBeNull();
  });

  it('restores the saved target instead of replacing it with the default', async () => {
    vi.mocked(ieltsBandClient.availability).mockResolvedValue({ eligible: true, lockedReason: null, targetBands: [3, 4, 5, 6, 7, 8, 9], journey: { ...pathway, targetBand: 3 } });
    render(<IeltsBandPathway />);
    expect((await screen.findByLabelText('Update target band') as HTMLSelectElement).value).toBe('3');
  });

  it('starts a pathway only after the learner chooses a target', async () => {
    vi.mocked(ieltsBandClient.availability).mockResolvedValue({ eligible: true, lockedReason: null, targetBands: [3, 4, 5, 6, 7, 8, 9], journey: null });
    vi.mocked(ieltsBandClient.start).mockResolvedValue(pathway);
    render(<IeltsBandPathway />);
    fireEvent.change(await screen.findByLabelText('Target IELTS band'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start band-oriented pathway' }));
    expect(await screen.findByText('Foundation to 3.0')).not.toBeNull();
  });

  it('links an eligible learner from the dashboard', async () => {
    vi.mocked(ieltsBandClient.availability).mockResolvedValue({ eligible: true, lockedReason: null, targetBands: [3, 4, 5, 6, 7, 8, 9], journey: pathway });
    render(<IeltsBandDashboardCard />);
    expect((await screen.findByRole('link', { name: 'Continue Band Pathway' })).getAttribute('href')).toBe('/ielts/pathway');
  });
});
