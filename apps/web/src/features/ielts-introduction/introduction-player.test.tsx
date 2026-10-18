import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/provider';
import { ieltsIntroductionClient } from '../../lib/api/ielts-introduction-client';
import { IntroductionPlayer } from './introduction-player';

vi.mock('../../lib/api/ielts-introduction-client', () => ({ ieltsIntroductionClient: { get: vi.fn(), visit: vi.fn() } }));
const versionId = '11111111-1111-4111-8111-111111111111';
const slides = ['What is IELTS?', 'Four skills', 'Your next step'].map((title, index) => ({ id: `slide-${index}`, slug: `slide-${index}`, title, body: `Body ${index}`, transcript: `Transcript ${index}`, audioUrl: '/media/audio.wav', imageUrl: null, question: index === 1 ? { slug: 'skills', prompt: 'How many?', options: ['Two', 'Four'] } : null }));
const dto = { presentation: { id: versionId, orientationId: versionId, version: 1, title: 'Introduction', slides }, visit: { orientationVersionId: versionId, lastSlideIndex: 2, revision: 3, visitedSlideIds: slides.map(s => s.id), viewedAllAt: '2026-10-15T00:00:00.000Z' }, currentPublishedVersionId: versionId };
describe('IntroductionPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ieltsIntroductionClient.get).mockResolvedValue(dto);
    vi.mocked(ieltsIntroductionClient.visit).mockImplementation(async input => ({ ...dto.visit, lastSlideIndex: input.slideIndex, revision: input.expectedRevision + 1 }));
  });
  afterEach(cleanup);
  it('pins slide one before enabling navigation and records it as viewed',async()=>{
    vi.mocked(ieltsIntroductionClient.get).mockResolvedValue({...dto,visit:null});
    let resolve!: (value:Omit<typeof dto.visit,'viewedAllAt'>&{viewedAllAt:string|null})=>void;
    vi.mocked(ieltsIntroductionClient.visit).mockImplementation(()=>new Promise(done=>{resolve=done;}));
    render(<IntroductionPlayer />);
    await screen.findByRole('heading',{name:'What is IELTS?'});
    expect(ieltsIntroductionClient.visit).toHaveBeenCalledWith({orientationVersionId:versionId,slideIndex:0,expectedRevision:0});
    expect(screen.getByRole('button',{name:'Next'})).toBeDisabled();
    resolve({...dto.visit,lastSlideIndex:0,revision:1,visitedSlideIds:['slide-0'],viewedAllAt:null});
    await waitFor(()=>expect(screen.getByRole('button',{name:'Next'})).toBeEnabled());
  });
  it('loads the explicitly owned version selected from history',async()=>{render(<IntroductionPlayer initialVersionId={versionId} />);await screen.findByRole('heading',{name:'Your next step'});expect(ieltsIntroductionClient.get).toHaveBeenCalledWith(versionId);});
  it('keeps every slide reachable after all slides were viewed and never autoplays', async () => {
    render(<IntroductionPlayer />);
    expect(await screen.findByRole('heading', { name: 'Your next step' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '1. What is IELTS?' }));
    expect(await screen.findByRole('heading', { name: 'What is IELTS?' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Skip and start learning' })).toHaveAttribute('href', '/ielts/learn');
    expect(screen.getByRole('link', { name: 'Go to Mock test' })).toHaveAttribute('href', '/ielts/mock-tests');
    expect(document.querySelector('audio')).not.toHaveAttribute('autoplay');
    await waitFor(() => expect(screen.getByText('All slides viewed')).toBeVisible());
  });
  it('allows navigation past an optional question with Vietnamese controls', async () => {
    vi.mocked(ieltsIntroductionClient.get).mockResolvedValue({ ...dto, visit: { ...dto.visit, lastSlideIndex: 1 } });
    render(<LocaleProvider initialLocale="vi"><IntroductionPlayer /></LocaleProvider>);
    expect(await screen.findByRole('button', { name: 'Tiếp theo' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp theo' }));
    expect(await screen.findByRole('heading', { name: 'Your next step' })).toBeVisible();
  });
  it('preserves the pinned visit while offering the current edition explicitly', async () => {
    const latest = '22222222-2222-4222-8222-222222222222';
    vi.mocked(ieltsIntroductionClient.get).mockResolvedValueOnce({ ...dto, currentPublishedVersionId: latest }).mockResolvedValueOnce({ ...dto, presentation: { ...dto.presentation, id: latest, title: 'New edition' }, visit: null, currentPublishedVersionId: latest });
    render(<IntroductionPlayer />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open latest edition' }));
    expect(await screen.findByRole('heading', { name: 'What is IELTS?' })).toBeVisible();
  });
});
