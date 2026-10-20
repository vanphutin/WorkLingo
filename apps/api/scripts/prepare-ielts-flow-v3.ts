import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readAuthoredIeltsTopics, ieltsContentRoot, contentUuid } from '../src/ielts-study/infrastructure/topic-content.js';
import { offlineDialogueTurns } from '../src/ielts-flow/release/offline-speech.js';
import { verifyWave } from '../src/ielts-beta-release/safety.js';

interface Speech { kind: 'speech'; text: string; voice: string; speaker: string; gender: string }
interface Pause { kind: 'pause'; seconds: number; purpose: string; questionOrders: number[] }
interface Script { part: number; title: string; segments: Array<Speech | Pause> }
const digest = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const prepared = path.join(ieltsContentRoot, '.prepared');
const generator = path.resolve(__dirname, 'generate-ielts-v3-speech.ps1');
export interface PreparedIeltsAudio { assetId: string; file: string; checksum: string; byteSize: number; durationSeconds: number; speechSeconds: number; provenance: { adapterName: string; scriptHash: string; voices: string[]; rate: number; original: boolean; transcriptHash: string }; timeline: Array<{ kind: string; seconds: number; purpose?: string; questionOrders?: number[] }> }

function pcm(body: Buffer) {
  for (let at=12; at+8<=body.length;) { const size=body.readUInt32LE(at+4); if (body.toString('ascii',at,at+4)==='data') return body.subarray(at+8,at+8+size); at+=8+size+(size%2); }
  throw new Error('Missing PCM');
}
function wave(parts: Buffer[]) {
  const data=Buffer.concat(parts); const header=Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(36+data.length,4); header.write('WAVE',8); header.write('fmt ',12); header.writeUInt32LE(16,16); header.writeUInt16LE(1,20); header.writeUInt16LE(1,22); header.writeUInt32LE(24000,24); header.writeUInt32LE(48000,28); header.writeUInt16LE(2,32); header.writeUInt16LE(16,34); header.write('data',36); header.writeUInt32LE(data.length,40);
  return Buffer.concat([header,data]);
}
async function speech(identity: string, segments: Speech[], rate: number) {
  const result: Buffer[]=[];
  for (const [index,segment] of segments.entries()) {
    const input=path.join(prepared,`${identity}-${index}.json`), output=path.join(prepared,`${identity}-${index}.wav`);
    try {
      if (await readFile(input+'.cache','utf8')===JSON.stringify([segment])+`\nrate=${rate}`) { const cached=await readFile(output); verifyWave(cached); result.push(pcm(cached)); continue; }
    } catch { /* Missing or changed input is synthesized again. */ }
    await writeFile(input,JSON.stringify([segment]),'utf8');
    execFileSync('pwsh.exe',['-NoProfile','-File',generator,'-InputJson',input,'-OutputWave',output,'-Rate',String(rate)],{stdio:'pipe',timeout:120_000});
    result.push(pcm(await readFile(output)));
    await writeFile(input+'.cache',JSON.stringify([segment])+`\nrate=${rate}`,'utf8');
  }
  return result;
}

export async function prepareIeltsV3() {
  await mkdir(prepared,{recursive:true});
  const scripts=(JSON.parse(await readFile(path.join(ieltsContentRoot,'mocks/academic-02/listening-scripts.json'),'utf8')) as {parts:Script[]}).parts;
  let spoken: Buffer[][]=[]; let rate=0;
  for (const candidate of [0,-1,1]) {
    const trial:Buffer[][]=[];
    for (const script of scripts) trial.push(await speech(`mock-${script.part}`,script.segments.filter((s):s is Speech=>s.kind==='speech'),candidate));
    const seconds=trial.flat().reduce((sum,b)=>sum+b.length/48000,0);
    if (seconds>=1250 && seconds<=1640) { spoken=trial;rate=candidate;break; }
    console.log(`Speech at rate ${candidate}: ${seconds.toFixed(2)} seconds; checking an appropriate pace.`);
  }
  if (!spoken.length) throw new Error('Speech timeline needs authoring adjustment, never silence padding.');
  const totalSpeech=spoken.flat().reduce((sum,b)=>sum+b.length/48000,0);
  // A 29m50s authored timeline leaves ten seconds for four explicit starts.
  // All remaining intervals are bounded, question-linked read/check windows.
  const pausePerPart=(1790-totalSpeech)/4;
  if (pausePerPart<30 || pausePerPart>135) throw new Error('Question-linked pause budget out of range.');
  const manifest:PreparedIeltsAudio[]=[];
  for (const [i,script] of scripts.entries()) {
    const parts:Buffer[]=[];let cursor=0;
    const timeline:PreparedIeltsAudio['timeline']=[];
    for (const segment of script.segments) {
      if (segment.kind==='speech') { const data=spoken[i]![cursor++]!;parts.push(data);timeline.push({kind:'speech',seconds:data.length/48000}); }
      else { const seconds=pausePerPart*(segment.purpose.startsWith('Review')?0.2:0.4); const silence=Buffer.alloc(Math.round(seconds*24000)*2);parts.push(silence);timeline.push({kind:'pause',seconds:silence.length/48000,purpose:segment.purpose,questionOrders:segment.questionOrders}); }
    }
    const body=wave(parts); const file=`mock-part-${script.part}.wav`;await writeFile(path.join(prepared,file),body);
    manifest.push({assetId:contentUuid(`academic-02:audio:${script.part}`),file,checksum:digest(body),byteSize:body.length,durationSeconds:verifyWave(body).durationSeconds,speechSeconds:spoken[i]!.reduce((sum,b)=>sum+b.length/48000,0),provenance:{adapterName:'local-windows-speech',scriptHash:digest(JSON.stringify(script)),voices:[...new Set(script.segments.filter((s):s is Speech=>s.kind==='speech').map(s=>s.voice))],rate,original:true,transcriptHash:digest(script.segments.filter((s):s is Speech=>s.kind==='speech'&&s.speaker!=='Narrator').map(s=>s.speaker+': '+s.text).join('\n'))},timeline});
    console.log(`Prepared mock part ${script.part}: ${manifest.at(-1)!.durationSeconds.toFixed(2)} seconds.`);
  }
  await writeFile(path.join(prepared,'mock-audio-manifest.json'),JSON.stringify(manifest,null,2));
  await writeFile(path.join(ieltsContentRoot,'mocks/academic-02/audio-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  for (const topic of await readAuthoredIeltsTopics()) {
    const segments:Speech[]=offlineDialogueTurns(topic.ast.audioScripts[0]!.script);
    const data=await speech(topic.slug,segments,0);const body=wave(data);const file=`${topic.slug}.wav`;await writeFile(path.join(prepared,file),body);
    const entry={assetId:contentUuid(`${topic.slug}:audio`),file,checksum:digest(body),byteSize:body.length,durationSeconds:verifyWave(body).durationSeconds,provenance:{adapterName:'local-windows-speech',scriptHash:digest(topic.ast.audioScripts[0]!.script),voices:['Microsoft David','Microsoft Zira'],rate:0,original:true}};
    await writeFile(path.join(prepared,`${topic.slug}-audio.json`),JSON.stringify(entry,null,2));
    console.log(`Prepared ${topic.slug}: ${entry.durationSeconds.toFixed(1)} seconds.`);
  }
}
if (require.main===module) void prepareIeltsV3().catch(error=>{console.error(error instanceof Error?error.message:'Audio preparation failed');process.exitCode=1;});
