import { parseDialogue } from '@worklingo/content-format';
export function offlineDialogueTurns(text:string) {
  const dialogue=parseDialogue(text,{forceDialogue:true});
  if(dialogue.issues.length||dialogue.speakers.some(speaker=>!speaker.gender))throw new Error('Declare each dialogue speaker gender explicitly.');
  const male=dialogue.speakers.filter(speaker=>speaker.gender==='male');
  return dialogue.turns.map(turn=>{
    const speaker=dialogue.speakers.find(speaker=>speaker.id===turn.speaker);
    if(!speaker||!speaker.gender)throw new Error('Every prepared turn needs a declared speaker.');
    return {kind:'speech' as const,speaker:speaker.name,gender:speaker.gender,voice:speaker.gender==='female'?'Microsoft Zira':male.findIndex(item=>item.id===speaker.id)%2===0?'Microsoft David':'Microsoft Mark',text:turn.text};
  });
}
