import { IntroductionPlayer } from '../../../../features/ielts-introduction/introduction-player';

export default async function IeltsIntroductionPage({ searchParams }: { readonly searchParams: Promise<{ versionId?: string }> }) { const { versionId } = await searchParams; return <IntroductionPlayer initialVersionId={versionId} />; }
