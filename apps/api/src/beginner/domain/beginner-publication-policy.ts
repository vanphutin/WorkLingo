import {ConflictException} from '@nestjs/common';
export function preserveBeginnerPriorVersion(input:{programSlugs:readonly string[];priorStatus:string|null;topicGroupId:string|null}):boolean{
 if(!input.programSlugs.includes('beginner'))return false;
 if(input.topicGroupId||!input.programSlugs.length||input.programSlugs.some(s=>s!=='beginner'))throw new ConflictException('BEGINNER_SHARED_LESSON');
 if(input.priorStatus==='ARCHIVED')throw new ConflictException('BEGINNER_WITHDRAWN_VERSION');
 return true;
}
