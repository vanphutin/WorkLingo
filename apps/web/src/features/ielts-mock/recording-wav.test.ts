import { describe, expect, it } from 'vitest';
import { encodeMonoWav } from './recording-wav';

describe('captured recording WAV encoding', () => {
  it('writes real mono PCM samples with a discoverable duration and clipping', () => {
    const result = encodeMonoWav([new Float32Array([2, -2, 0.5, 0])], 16000);
    const bytes = new DataView(result);
    expect(new TextDecoder().decode(result.slice(0, 4))).toBe('RIFF');
    expect(bytes.getUint32(24, true)).toBe(16000);
    expect(bytes.getUint32(40, true)).toBe(8);
    expect(bytes.getInt16(44, true)).toBe(32767);
    expect(bytes.getInt16(46, true)).toBe(-32768);
  });
  it('mixes stereo and resamples without fabricating extra duration', () => {
    const result = encodeMonoWav([new Float32Array([1, 1, 1, 1]), new Float32Array([-1, -1, -1, -1])], 32000);
    expect(result.byteLength).toBe(48);
    expect(new DataView(result).getInt16(44, true)).toBe(0);
  });
});

it('trims scheduling overrun to the authored speaking sample limit',()=>{const bytes=encodeMonoWav([new Float32Array(16000*121)],16000,120);expect(new DataView(bytes).getUint32(40,true)).toBe(16000*120*2);});
