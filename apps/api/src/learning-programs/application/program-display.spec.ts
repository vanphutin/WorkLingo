import { expect, it } from 'vitest';
import { releaseDisplay } from './program-display.js';
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
it('derives safe curriculum detail and counts from the authored snapshot', () => {
 const row = {id:id(1),version:1,source:'AUTHORED' as const,status:'PUBLISHED' as const,snapshot:{
 title:'Beginner',description:'Practice',objectives:['Introduce yourself'],difficulty:'A1',estimatedMinutes:25,
 policy:{version:1,sequential:{stages:true,units:true,lessons:true},completion:{requiredActivityRatio:1},mastery:{required:false,threshold:0.8,minimumQualifiedAttempts:1},retry:{maxAttempts:3,cooldownMinutes:0},remediation:{enabled:false,afterAttempts:2},review:{scheduleVersion:'program-review-v1',intervalsDays:[1,3],requiredForReadiness:false}},
 curriculumBindings:[{curriculumRevisionId:id(2),pathId:id(3),levelId:id(4),missionId:id(5),order:1,title:'Greetings',objectives:['Greet'],required:true,prerequisiteRevisionIds:[],lessons:[{lessonVersionId:id(6),order:1,title:'Hello',objectives:['Say hello'],estimatedMinutes:12,difficulty:'A1',activityIds:[id(7),id(8)],vocabularyRefs:[],resourceRefs:[]}]}]}};
 expect(releaseDisplay(row)).toMatchObject({lessonCount:1,activityCount:2,curriculumOverview:[{title:'Greetings',lessonCount:1,activityCount:2,estimatedMinutes:12,lessons:[{title:'Hello',estimatedMinutes:12}]}]});
 expect(JSON.stringify(releaseDisplay(row))).not.toContain('activityIds');
});
