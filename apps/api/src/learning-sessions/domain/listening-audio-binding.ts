import { createHash } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { audioScriptFingerprintText, parseLessonSource, spokenScript, type ActivityNode } from '@worklingo/content-format';
import { z } from 'zod';
import type { PrismaService } from '../../common/database/prisma.service.js';
import { activitySchema } from '../../curriculum/domain/curriculum.types.js';

export interface ListeningAudioBinding {
  readonly synthetic: boolean;
  readonly artifactId: string;
  readonly checksum: string;
  readonly scriptHash: string;
  readonly scriptText: string;
  readonly storageKey: string;
  readonly mimeType: string;
}
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const snapshotSchema = z.object({
  activities: z.array(activitySchema),
  contentBlocks: z.array(z.object({ slug: z.string(), text: z.string() })).default([]),
});

/** Same version-bound selection for playback and assessment; never chooses by recency. */
export async function resolveListeningAudioBinding(
  database: Pick<PrismaService, 'lessonVersion' | 'lessonVersionAudioArtifact'>,
  lessonVersionId: string,
  activity: z.infer<typeof activitySchema>,
  options: { readonly allowSynthetic?: boolean } = {},
): Promise<ListeningAudioBinding> {
  const version = await database.lessonVersion.findUnique({ where: { id: lessonVersionId }, select: { parsedContent: true, sourceHash: true } });
  if (!version) throw new NotFoundException('Published audio lesson version not found');
  const snapshot = snapshotSchema.parse(version.parsedContent);
  const pinned = snapshot.activities.filter(a => a.id === activity.id);
  if (pinned.length !== 1 || JSON.stringify(pinned[0]) !== JSON.stringify(activitySchema.parse(activity))) {
    throw new NotFoundException('Audio activity does not match its published snapshot');
  }
  const shadowing = activity.activityType === 'speaking' && activity.payload.mode === 'shadowing';
  if (activity.activityType !== 'listening' && !shadowing) throw new NotFoundException('Audio is not available for this activity');
  const references = await database.lessonVersionAudioArtifact.findMany({
    where: { lessonVersionId }, include: { audioArtifact: { include: { contentImport: true } } },
  });
  const evidenceSlugs = activity.activityType === 'listening' ? activity.payload.questions.map(q => q.evidence.split(':', 1)[0]!) : [];
  const preferred = shadowing ? [activity.slug] : evidenceSlugs;
  const strongRefs = references.filter(r => preferred.includes(r.audioScriptSlug));
  const candidates = strongRefs.length ? strongRefs : references;
  const matches: ListeningAudioBinding[] = [];
  for (const ref of candidates) {
    const asset = ref.audioArtifact;
    if (ref.lessonVersionId !== lessonVersionId || ref.audioArtifactId !== asset.id || ref.audioScriptSlug !== asset.audioScriptSlug ||
      asset.status !== 'READY' || (asset.adapterName.startsWith('fake') && !options.allowSynthetic) || !/^[a-f0-9]{64}$/u.test(asset.checksum)) continue;
    const source = asset.contentImport;
    const trustedSource = source && source.sourceHash === version.sourceHash && digest(source.rawSource) === version.sourceHash
      ? parseLessonSource(source.rawSource).document : null;
    const sourceActivities: readonly ActivityNode[] = trustedSource?.activities.filter(a => a.slug === activity.slug) ?? [];
    if (sourceActivities.length > 1) throw new NotFoundException('Ambiguous audio activity source');
    const sourceActivity: ActivityNode | undefined = sourceActivities[0];
    if (sourceActivity?.audioRef && sourceActivity.audioRef !== ref.audioScriptSlug) continue;
    if (sourceActivity && (sourceActivity.activityType !== activity.activityType ||
      JSON.stringify([...sourceActivity.contentRefs].sort()) !== JSON.stringify([...activity.contentReferences].sort()))) continue;
    const scripts = trustedSource?.audioScripts.filter(s => s.slug === ref.audioScriptSlug) ?? [];
    if (scripts.length > 1) throw new NotFoundException('Ambiguous published audio script');
    const sourceScript = scripts[0];
    const explicitText = activity.payload.audioText;
    const content = snapshot.contentBlocks.find(c => c.slug === ref.audioScriptSlug && activity.contentReferences.includes(c.slug));
    const scriptText = explicitText ?? (sourceScript ? spokenScript(sourceScript) : content?.text) ??
      (shadowing && ref.audioScriptSlug === activity.slug && activity.activityType === 'speaking' ? activity.payload.sampleAnswer : undefined);
    if (!scriptText || (sourceScript && spokenScript(sourceScript) !== scriptText)) continue;
    // A rendition fingerprint includes its original script and review: use source only when its hash is pinned.
    const scriptHash = digest(sourceScript ? audioScriptFingerprintText(sourceScript) : scriptText);
    if (asset.scriptHash !== scriptHash) continue;
    if (!explicitText && !sourceActivity?.audioRef && !preferred.includes(ref.audioScriptSlug) && !activity.contentReferences.includes(ref.audioScriptSlug)) continue;
    matches.push({ synthetic: asset.adapterName.startsWith('fake'), artifactId: asset.id, checksum: asset.checksum, scriptHash, scriptText, storageKey: asset.storageKey, mimeType: asset.mimeType });
  }
  if (matches.length > 1) throw new NotFoundException('Ambiguous published audio binding');
  if (!matches[0]) throw new NotFoundException('Published audio does not match this activity');
  return matches[0];
}
