import { IeltsMockPlayer } from '../../../../../features/ielts-mock/ielts-mock';
export default async function IeltsMockAttemptPage({ params }: { readonly params: Promise<{ attemptId: string }> }) { const { attemptId } = await params; return <IeltsMockPlayer attemptId={attemptId} />; }
