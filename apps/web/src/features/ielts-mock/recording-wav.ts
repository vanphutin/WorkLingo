/** Encode actual captured samples, never synthesized speech or placeholder audio. */
export function encodeMonoWav(channels: Float32Array[], sourceRate: number, maxSeconds = Number.POSITIVE_INFINITY): ArrayBuffer {
  if (!channels.length || sourceRate <= 0) throw new Error('Invalid captured audio');
  const rate = 16000;
  const length = Math.min(Math.floor(channels[0]!.length * rate / sourceRate), Math.floor(maxSeconds * rate));
  const result = new ArrayBuffer(44 + length * 2);
  const view = new DataView(result);
  const text = (offset: number, value: string) => { [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0))); };
  text(0, 'RIFF'); view.setUint32(4, 36 + length * 2, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    // Average each input interval while downsampling to retain captured signal energy.
    const from = Math.floor(i * sourceRate / rate);
    const to = Math.max(from + 1, Math.floor((i + 1) * sourceRate / rate));
    let sample = 0;
    for (const channel of channels) for (let j = from; j < to; j++) sample += channel[Math.min(j, channel.length - 1)] ?? 0;
    sample = Math.max(-1, Math.min(1, sample / ((to - from) * channels.length)));
    view.setInt16(44 + i * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  return result;
}

export async function normalizeRecordingWav(blob: Blob, maxSeconds = Number.POSITIVE_INFINITY): Promise<Blob> {
  if (blob.type.split(';')[0] === 'audio/wav' && !Number.isFinite(maxSeconds)) return blob;
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    return new Blob([encodeMonoWav(channels, buffer.sampleRate, maxSeconds)], { type: 'audio/wav' });
  } finally { await context.close(); }
}
