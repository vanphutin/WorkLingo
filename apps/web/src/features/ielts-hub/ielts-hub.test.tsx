import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/provider';
import { ieltsOrientationClient } from '../../lib/api/ielts-orientation-client';
import { ieltsBridgeClient } from '../../lib/api/ielts-bridge-client';
import { ieltsIntegratedClient } from '../../lib/api/ielts-integrated-client';
import { ieltsBandClient } from '../../lib/api/ielts-band-client';
import { ieltsMockClient } from '../../lib/api/ielts-mock-client';
import { ieltsFlowClient } from '../../lib/api/ielts-flow-client';
import { IeltsHub } from './ielts-hub';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => {
  vi.spyOn(ieltsFlowClient,'overview').mockResolvedValue({flowVersion:'legacy',introduction:{available:false,reason:'CONTENT_UNAVAILABLE',resumeHref:null},study:{available:false,reason:'CONTENT_UNAVAILABLE',resumeHref:null},mock:{available:false,reason:'CONTENT_UNAVAILABLE',resumeHref:null}});
  vi.spyOn(ieltsOrientationClient, 'getStatus').mockResolvedValue({ state: 'locked', reasons: ['FOUNDATION_CHECKPOINT_REQUIRED'], presentation: null, progress: null });
  vi.spyOn(ieltsBridgeClient, 'catalog').mockResolvedValue({ eligible: false, lockedReason: 'ORIENTATION_REQUIRED', bridgeCompleted: false, modules: [] });
  vi.spyOn(ieltsIntegratedClient, 'availability').mockResolvedValue({ eligible: false, lockedReason: 'BRIDGE_REQUIRED', durations: [], difficulties: [], activeSessionId: null });
  vi.spyOn(ieltsBandClient, 'availability').mockResolvedValue({ eligible: false, lockedReason: 'BRIDGE_REQUIRED', targetBands: [], journey: null });
  vi.spyOn(ieltsMockClient, 'catalog').mockResolvedValue({ eligible: false, lockedReason: 'BAND_PATHWAY_REQUIRED', mocks: [] });
});

it('shows five ordered phases and actual prerequisite guidance without claiming an official band', async () => {
  render(<LocaleProvider initialLocale="vi"><IeltsHub /></LocaleProvider>);
  expect(await screen.findByRole('heading', { level: 1, name: 'Lộ trình IELTS Beta' })).toBeVisible();
  const navigation = await screen.findByRole('navigation', { name: 'Các bước trong lộ trình IELTS' });
  expect(within(navigation).getAllByRole('link').map(link => link.getAttribute('href')))
    .toEqual(['#orientation', '#bridge', '#practice', '#pathway', '#mock-tests']);
  expect(await screen.findByText('Hoàn thành bài kiểm tra nền tảng để mở khóa phần Định hướng IELTS.')).toBeVisible();
  expect(await screen.findByText('Hoàn thành phần Định hướng IELTS để mở khóa bài luyện tập Bridge.')).toBeVisible();
  expect(screen.queryByRole('link', { name: 'Bắt đầu Định hướng IELTS' })).not.toBeInTheDocument();
  expect(screen.getByText(/không phải kết quả IELTS chính thức/u)).toBeVisible();
  expect(screen.getByRole('link', { name: 'Quay lại luyện nền tảng' })).toHaveAttribute('href', '/dashboard');
});

it('offers the real orientation entry once its API confirms eligibility', async () => {
  vi.mocked(ieltsOrientationClient.getStatus).mockResolvedValue({ state: 'available', reasons: [], presentation: null, progress: null });
  render(<IeltsHub />);
  expect(await screen.findByRole('link', { name: 'Start IELTS Orientation' })).toHaveAttribute('href', '/ielts/orientation');
  expect(screen.getByRole('heading', { level: 1, name: 'IELTS Beta pathway' })).toBeVisible();
});

it.each([
  ['en', 'The four duration profiles are not published yet.', 'The Band Curriculum has not been published yet.'],
  ['vi', 'Bốn cấu hình thời lượng chưa được xuất bản.', 'Chương trình theo Band chưa được xuất bản.'],
] as const)('explains publication locks accurately after Bridge completion (%s)', async (locale, profiles, curriculum) => {
  vi.mocked(ieltsBridgeClient.catalog).mockResolvedValue({ eligible: true, lockedReason: null, bridgeCompleted: true, modules: [] });
  vi.mocked(ieltsIntegratedClient.availability).mockResolvedValue({ eligible: false, lockedReason: 'PROFILES_NOT_PUBLISHED', durations: [], difficulties: [], activeSessionId: null });
  vi.mocked(ieltsBandClient.availability).mockResolvedValue({ eligible: false, lockedReason: 'CURRICULUM_NOT_PUBLISHED', targetBands: [], journey: null });
  const view = render(<LocaleProvider initialLocale={locale}><IeltsHub /></LocaleProvider>);
  expect(await screen.findByText(profiles)).toBeVisible();
  expect(await screen.findByText(curriculum)).toBeVisible();
  expect(screen.queryByText('Complete IELTS Bridge to unlock integrated four-skill practice.')).not.toBeInTheDocument();
  expect(screen.queryByText('Hoàn thành IELTS Bridge để mở khóa Lộ trình Band.')).not.toBeInTheDocument();
  expect(view.container.querySelector('a[href="/ielts/practice"]')).toBeNull();
  expect(view.container.querySelector('a[href="/ielts/pathway"]')).toBeNull();
});

it('offers three independent V3 destinations and a dismissible introduction recommendation',async()=>{
  vi.mocked(ieltsFlowClient.overview).mockResolvedValue({flowVersion:'v3',introduction:{available:false,reason:'CONTENT_UNAVAILABLE',resumeHref:null},study:{available:true,reason:null,resumeHref:null},mock:{available:true,reason:null,resumeHref:null}});
  render(<IeltsHub />);
  const nav=await screen.findByRole('navigation',{name:'IELTS sections'});
  expect(within(nav).getAllByRole('link').map(link=>link.getAttribute('href'))).toEqual(['/ielts/introduction','/ielts/learn','/ielts/mock-tests']);
  expect(screen.getByRole('link',{name:'Choose a study topic'})).toBeVisible();
  expect(screen.getByRole('link',{name:'Choose a mock test'})).toBeVisible();
  expect(screen.queryByText('Complete IELTS Bridge to unlock integrated four-skill practice.')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Dismiss introduction suggestion'}));
  expect(screen.queryByText('New to IELTS? Start with the introduction, or choose any section below.')).toBeNull();
});
