import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LearningProgramCatalogDto, ProgramContextDto } from '@worklingo/contracts';
import { ApiError } from '../../lib/api/api-client';
import { learningProgramClient } from '../../lib/api/learning-program-client';
import {programPlatformClient} from '../../lib/api/program-platform-client';
import { ProgramCatalog } from './program-catalog';
import { LocaleProvider } from '../../i18n/provider';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const context: ProgramContextDto = {
  activeProgram: { id: '10000000-0000-4000-8000-000000000002', slug: 'intermediate', name: 'Intermediate' },
  enrollment: { id: '20000000-0000-4000-8000-000000000001', revision: 1, currentLevel: { id: '20000000-0000-4000-8000-000000000002', code: 'FOUNDATION_1', name: 'Foundation' } },
};

const catalog: LearningProgramCatalogDto = {
  programs: [
    {
      availabilityStatus: 'COMING_SOON',
      description: 'Build essential English through guided four-skill practice.',
      destination: null,
      iconKey: 'beginner',
      isSelectable: false,
      learningGoal: 'Understand practical English in familiar situations.',
      name: 'Beginner',
      proficiencyLabel: 'Foundation / Pre-A1-A2',
      publishedLevelCount: 0,
      publishedPathCount: 0,
      slug: 'beginner',
    },
    {
      availabilityStatus: 'AVAILABLE',
      description: 'Use English confidently across everyday workplace situations.',
      destination: '/dashboard',
      iconKey: 'intermediate',
      isSelectable: true,
      learningGoal: 'Communicate, understand and respond effectively at work.',
      name: 'Intermediate',
      proficiencyLabel: 'Intermediate / B1-B2',
      publishedLevelCount: 2,
      publishedPathCount: 1,
      slug: 'intermediate',
    },
    {
      availabilityStatus: 'COMING_SOON',
      description: 'Prepare for TOEIC through practical workplace language.',
      destination: null,
      iconKey: 'toeic',
      isSelectable: false,
      learningGoal: 'Strengthen listening and reading.',
      name: 'TOEIC',
      proficiencyLabel: 'TOEIC-oriented',
      publishedLevelCount: 0,
      publishedPathCount: 0,
      slug: 'toeic',
    },
    {
      availabilityStatus: 'IN_DEVELOPMENT',
      description: 'Develop integrated English for a future IELTS pathway.',
      destination: null,
      iconKey: 'ielts',
      isSelectable: false,
      learningGoal: 'Build language evidence for IELTS preparation.',
      name: 'IELTS',
      proficiencyLabel: 'IELTS band-oriented',
      publishedLevelCount: 0,
      publishedPathCount: 0,
      slug: 'ielts',
    },
  ],
};

describe('ProgramCatalog', () => {
  it('enrolls an authored Beginner release before opening its roadmap', async () => {
    vi.spyOn(learningProgramClient,'getCatalog').mockResolvedValue({programs:[{...catalog.programs[0]!,availabilityStatus:'BETA',isSelectable:true,destination:'/dashboard',currentRelease:{id:'10000000-0000-4000-8000-000000000001',version:1,source:'AUTHORED',status:'PUBLISHED',title:'Beginner'}}]});
    const enrolled={...context,activeProgram:{...context.activeProgram!,slug:'beginner',name:'Beginner'}};
    const enroll=vi.spyOn(learningProgramClient,'enrollProgram').mockResolvedValue(enrolled);
    vi.spyOn(learningProgramClient,'activateProgram').mockResolvedValue(context);
    render(<ProgramCatalog/>);
    fireEvent.click(await screen.findByRole('button',{name:'Open Beginner program'}));
    await waitFor(()=>expect(enroll).toHaveBeenCalledWith({programSlug:'beginner',expectedRevision:1}));
    expect(push).toHaveBeenCalledWith('/dashboard');
  });
  it.each(['en', 'vi'] as const)('offers snapshot detail before enrollment and explains unscored Beginner Beta in %s', async (locale) => {
    vi.spyOn(learningProgramClient, 'getCatalog').mockResolvedValue({programs:[{...catalog.programs[0]!,availabilityStatus:'BETA',isSelectable:true,destination:'/dashboard',currentRelease:{id:'10000000-0000-4000-8000-000000000001',version:1,source:'AUTHORED',status:'PUBLISHED',title:'Beginner',objectives:['Introduce yourself'],estimatedMinutes:25,lessonCount:1,activityCount:2,curriculumOverview:[{title:'Greetings',lessonCount:1,activityCount:2,estimatedMinutes:12,lessons:[{title:'Hello',estimatedMinutes:12}]}]}}]});
    render(<LocaleProvider initialLocale={locale}><ProgramCatalog /></LocaleProvider>);
    const detail=await screen.findByText(locale==='en'?'Program details':'Chi tiết chương trình');
    fireEvent.click(detail);
    expect(screen.getByText('Greetings')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText(locale==='en'?'Speaking and writing are saved as unscored practice. Completion is based on activities, not a proficiency qualification.':'Bài nói và viết được lưu dưới dạng luyện tập không chấm điểm. Hoàn thành dựa trên hoạt động, không phải chứng nhận trình độ.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
  it('opens IELTS Beta without replacing the Intermediate enrollment or showing fictional level counts', async () => {
    const ielts = catalog.programs.find(program => program.slug === 'ielts')!;
    vi.spyOn(learningProgramClient, 'getCatalog').mockResolvedValue({ programs: [
      { ...ielts, availabilityStatus: 'BETA', destination: '/ielts', isSelectable: true },
    ] });
    const activate = vi.spyOn(learningProgramClient, 'activateProgram');
    render(<LocaleProvider initialLocale="vi"><ProgramCatalog /></LocaleProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Mở chương trình IELTS' }));
    expect(push).toHaveBeenCalledWith('/ielts');
    expect(activate).not.toHaveBeenCalled();
    expect(screen.queryByText('Lộ trình đã xuất bản')).not.toBeInTheDocument();
    expect(screen.queryByText('Trình độ đã xuất bản')).not.toBeInTheDocument();
    expect(screen.getByText(/Định hướng.*Bridge.*Luyện tập tích hợp.*Lộ trình band.*Thi thử/u)).toBeVisible();
    expect(screen.getByText('Trung cấp', { selector: 'strong' })).toBeVisible();
  });
  it('localizes program discovery and TOEIC availability with safe disabled actions', async () => {
    vi.spyOn(learningProgramClient, 'getCatalog').mockResolvedValue(catalog);
    render(<LocaleProvider initialLocale="vi"><ProgramCatalog /></LocaleProvider>);
    expect(screen.getByRole('heading', { name: 'Chọn chương trình học' })).toBeInTheDocument();
    const cards = await screen.findAllByRole('listitem');
    const toeic = cards[2]!;
    expect(within(toeic).getByRole('heading', { name: 'TOEIC' })).toBeInTheDocument();
    expect(toeic).toHaveTextContent('Định hướng TOEIC');
    expect(toeic).toHaveTextContent('Luyện thi TOEIC qua ngôn ngữ công sở thực tế.');
    expect(within(toeic).getByRole('button', { name: 'Chương trình TOEIC chưa khả dụng' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mở chương trình Trung cấp' })).toBeEnabled();
  });
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    vi.spyOn(learningProgramClient, 'getContext').mockResolvedValue(context);
    vi.spyOn(programPlatformClient,'enrollmentsMine').mockResolvedValue({items:[],total:0,page:1,limit:25});
  });
  afterEach(cleanup);

  it('keeps a usable heading while loading', () => {
    vi.spyOn(learningProgramClient, 'getCatalog').mockReturnValue(new Promise(() => undefined));

    render(<ProgramCatalog />);

    expect(screen.getByRole('heading', { name: 'Choose your learning program' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading learning programs');
  });

  it('renders cards in API order with explicit status and safe actions', async () => {
    vi.spyOn(learningProgramClient, 'getCatalog').mockResolvedValue(catalog);

    render(<ProgramCatalog />);

    const cards = await screen.findAllByRole('listitem');
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
      'Beginner',
      'Intermediate',
      'TOEIC',
      'IELTS',
    ]);
    expect(screen.getByRole('button', { name: 'Open Intermediate program' })).toBeEnabled();
    expect(screen.getByText(/Active program:/)).toHaveTextContent('Intermediate');

    for (const name of ['Beginner', 'TOEIC', 'IELTS']) {
      const action = screen.getByRole('button', { name: `${name} program unavailable` });
      expect(action).toBeDisabled();
      fireEvent.keyDown(action, { key: 'Enter' });
      fireEvent.keyDown(action, { key: ' ' });
    }
    expect(screen.getAllByText(/Coming soon|In development|Available/)).toHaveLength(4);
  });

  it('shows an explicit beta label', async () => {
    vi.spyOn(learningProgramClient, 'getCatalog').mockResolvedValue({
      programs: catalog.programs.map((program) =>
        program.slug === 'intermediate'
          ? { ...program, availabilityStatus: 'BETA' as const }
          : program,
      ),
    });

    render(<ProgramCatalog />);

    expect(await screen.findByText('Beta')).toBeInTheDocument();
  });

  it('explains when no learning programs are available', async () => {
    vi.spyOn(learningProgramClient, 'getCatalog').mockResolvedValue({ programs: [] });

    render(<ProgramCatalog />);

    expect(await screen.findByText('No learning programs are available')).toBeInTheDocument();
  });

  it('shows a retryable error without removing the page heading', async () => {
    vi.spyOn(learningProgramClient, 'getCatalog')
      .mockRejectedValueOnce(
        new ApiError({ code: 'NETWORK_ERROR', message: 'offline', status: 0 }),
      )
      .mockResolvedValueOnce(catalog);

    render(<ProgramCatalog />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load learning programs');
    expect(screen.getByRole('heading', { name: 'Choose your learning program' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Open Intermediate program' })).toBeInTheDocument();
  });

  it('persists activation before navigation and prevents repeated submission while pending', async () => {
    vi.spyOn(learningProgramClient, 'getCatalog').mockResolvedValue(catalog);
    let complete!: (value: ProgramContextDto) => void;
    const activation = vi.spyOn(learningProgramClient, 'activateProgram').mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    render(<ProgramCatalog />);
    const button = await screen.findByRole('button', { name: 'Open Intermediate program' });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(push).not.toHaveBeenCalled();
    expect(activation).toHaveBeenCalledTimes(1);
    await act(async () => complete(context));
    expect(push).toHaveBeenCalledWith('/dashboard');
    expect(activation).toHaveBeenCalledWith({ programSlug: 'intermediate', expectedRevision: 1 });
  });

  it('keeps cards available for explicit retry after an activation error', async () => {
    vi.spyOn(learningProgramClient, 'getCatalog').mockResolvedValue(catalog);
    vi.spyOn(learningProgramClient, 'activateProgram').mockRejectedValueOnce(new ApiError({ code: 'NETWORK_ERROR', status: 0, message: 'Connection lost' })).mockResolvedValueOnce(context);
    render(<ProgramCatalog />);
    const button = await screen.findByRole('button', { name: 'Open Intermediate program' });
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection failed. Check your connection and try again.');
    expect(screen.queryByText('Connection lost')).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });

  it('refreshes stale context and requires a new click with the fresh revision', async () => {
    vi.spyOn(learningProgramClient, 'getCatalog').mockResolvedValue(catalog);
    const fresh = { ...context, enrollment: { ...context.enrollment!, revision: 2 } };
    vi.mocked(learningProgramClient.getContext).mockResolvedValueOnce(context).mockResolvedValueOnce(fresh);
    const activation = vi.spyOn(learningProgramClient, 'activateProgram').mockRejectedValueOnce(new ApiError({ code: 'PROGRAM_CONTEXT_STALE', status: 409, message: 'Stale' })).mockResolvedValueOnce(fresh);
    render(<ProgramCatalog />);
    const button = await screen.findByRole('button', { name: 'Open Intermediate program' });
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('Learning context changed');
    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(activation).toHaveBeenLastCalledWith({ programSlug: 'intermediate', expectedRevision: 2 });
  });
});
