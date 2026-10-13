import { IntegratedPracticePlayer } from '../../../../../features/ielts-integrated/integrated-practice';
export default async function IntegratedPracticeSessionPage({ params }: { readonly params: Promise<{ sessionId: string }> }) { const { sessionId } = await params; return <IntegratedPracticePlayer sessionId={sessionId} />; }
