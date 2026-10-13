import { IeltsBridgePlayer } from '../../../../../features/ielts-bridge/ielts-bridge-player';

export default async function IeltsBridgeModulePage({ params }: { readonly params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  return <IeltsBridgePlayer moduleId={moduleId} />;
}
