import { readFileSync, readdirSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { audioScriptFingerprintText, parseLessonSource, spokenScript } from '@worklingo/content-format';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/database/prisma.service.js';
import { activitySchema } from '../../curriculum/domain/curriculum.types.js';
import * as binding from './listening-audio-binding.js';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const activity = activitySchema.parse({id:'00000000-0000-4000-8000-000000000001',slug:'listen',order:1,activityType:'listening',learningBlock:'listenReason',skills:['listening'],contentReferences:['card-a','card-b'],languageBlockReferences:['phrase'],payload:{prompt:'Listen',audioText:'Hello Lily.',questions:[{slug:'q',prompt:'Who?',options:['Lily','Jack'],answerIndex:0,explanation:'Lily',evidence:'audio-a:1'}]}});
if (activity.activityType !== 'listening') throw new Error('Invalid test activity');
const question = activity.payload.questions[0]!;
function ref(slug = 'audio-a', text = 'Hello Lily.') { return {lessonVersionId:'version',audioScriptSlug:slug,audioArtifactId:'artifact-'+slug,audioArtifact:{id:'artifact-'+slug,audioScriptSlug:slug,scriptHash:hash(text),checksum:'a'.repeat(64),storageKey:'private/'+slug,mimeType:'audio/wav',status:'READY',adapterName:'azure-speech',contentImport:null}}; }
function db(references = [ref()], pinned: Parameters<typeof binding.resolveListeningAudioBinding>[2] = activity) { return {lessonVersion:{findUnique:vi.fn().mockResolvedValue({id:'version',sourceHash:hash('source'),parsedContent:{activities:[pinned]}})},lessonVersionAudioArtifact:{findMany:vi.fn().mockResolvedValue(references)}} as unknown as Pick<PrismaService,'lessonVersion'|'lessonVersionAudioArtifact'>; }
const resolve = (database = db(), selected: Parameters<typeof binding.resolveListeningAudioBinding>[2] = activity) => binding.resolveListeningAudioBinding(database,'version',selected);
describe('resolveListeningAudioBinding',()=>{
 it('returns exact version-bound artifact and script identity',async()=>expect(await resolve()).toEqual({synthetic:false,artifactId:'artifact-audio-a',checksum:'a'.repeat(64),scriptHash:hash('Hello Lily.'),scriptText:'Hello Lily.',storageKey:'private/audio-a',mimeType:'audio/wav'}));
 it('does not confuse multiple content refs or unrelated published scripts with ambiguity',async()=>expect((await resolve(db([ref('audio-b','Hello Jack.'),ref()]))).artifactId).toBe('artifact-audio-a'));
 it('rejects script substitution even with the right referenced slug',async()=>expect(resolve(db([ref('audio-a','Hello Jack.')]))).rejects.toThrow(/audio/i));
 it('rejects mismatched artifact linkage',async()=>{const r=ref();r.audioArtifact.audioScriptSlug='other';await expect(resolve(db([r]))).rejects.toThrow(/audio/i);});
 it('rejects stale or modified activity context',async()=>{const changed=activitySchema.parse({...activity,payload:{...activity.payload,audioText:'Forged'}});await expect(resolve(db(),changed)).rejects.toThrow(/activity/i);});
 it('rejects competing matching candidates without a unique reference',async()=>{const noRef=activitySchema.parse({...activity,payload:{...activity.payload,questions:[{...question,evidence:'card-a:1'}]}});await expect(resolve(db([ref(),ref('audio-b')],noRef),noRef)).rejects.toThrow(/ambiguous/i);});
 it('rejects unavailable or fake assets',async()=>{const r=ref();r.audioArtifact.adapterName='fake-tts';await expect(resolve(db([r]))).rejects.toThrow(/audio/i);});
});

it('preserves old normal-script playback when a later import changed but the immutable snapshot still proves exact text', async () => {
  const r = { ...ref(), audioArtifact: { ...ref().audioArtifact, contentImport: { rawSource: 'edited', sourceHash: hash('edited') } } };
  expect((await resolve(db([r as unknown as ReturnType<typeof ref>]))).artifactId).toBe('artifact-audio-a');
});



it('resolves all 24 existing Beginner listening scripts without substituting their content cards', async () => {
  const directory = resolvePath('../../content/beginner/pilot');
  let count = 0;
  for (const name of readdirSync(directory).filter(n => n.endsWith('.lesson.txt'))) {
    const rawSource = readFileSync(resolvePath(directory, name), 'utf8');
    const document = parseLessonSource(rawSource).document;
    for (const sourceActivity of document.activities.filter(a => a.activityType === 'listening')) {
      const script = document.audioScripts.find(s => s.slug === sourceActivity.audioRef)!;
      const selected = activitySchema.parse({ ...activity, slug: sourceActivity.slug, contentReferences: sourceActivity.contentRefs,
        payload: { ...activity.payload, audioText: spokenScript(script), questions: [{...question,evidence:sourceActivity.evidence[0]}] } });
      const r = ref(script.slug, spokenScript(script));
      r.audioArtifact.scriptHash = hash(audioScriptFingerprintText(script));
      const linked = { ...r, audioArtifact: { ...r.audioArtifact, contentImport: { sourceHash: hash(rawSource), rawSource } } };
      const database = db([linked as unknown as ReturnType<typeof ref>], selected);
      vi.mocked(database.lessonVersion.findUnique).mockResolvedValue({ sourceHash: hash(rawSource), parsedContent: { activities: [selected] } } as never);
      expect((await resolve(database, selected)).scriptText).toBe(spokenScript(script));
      count++;
    }
  }
  expect(count).toBe(24);
});

it('admits a synthetic asset only through explicit opt-in and preserves provenance', async () => {
  const r=ref();r.audioArtifact.adapterName='fake-tts';
  const result=await binding.resolveListeningAudioBinding(db([r]),'version',activity,{allowSynthetic:true});
  expect(result.synthetic).toBe(true);
});
