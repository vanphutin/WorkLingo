import { expect, it } from 'vitest';
import { offlineDialogueTurns } from './offline-speech.js';
it('uses declared gender instead of inferring it from a character name',()=>{
  const turns=offlineDialogueTurns('An (nữ): First answer.\nLan (nam): Second answer.\nAn: Another answer.');
  expect(turns.map(turn=>turn.voice)).toEqual(['Microsoft Zira','Microsoft David','Microsoft Zira']);
  expect(turns[0]!.text).toBe('First answer.');
});
it('requires declarations and gives two declared male speakers different available voices',()=>{
  expect(()=>offlineDialogueTurns('An: Hello.\nLan: Welcome.')).toThrow();
  expect(offlineDialogueTurns('One (nam): Hello.\nTwo (nam): Welcome.').map(turn=>turn.voice)).toEqual(['Microsoft David','Microsoft Mark']);
});
