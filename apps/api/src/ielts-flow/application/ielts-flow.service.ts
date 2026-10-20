import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { ieltsFlowOverviewSchema, ieltsHistoryItemSchema, ieltsHistoryPageSchema, type IeltsHistoryItem } from '@worklingo/contracts';
import { z } from 'zod';
import { PrismaService } from '../../common/database/prisma.service.js';
import { IeltsTopicAdminService } from '../../ielts-study/application/ielts-topic-admin.service.js';
import { readIeltsV3Readiness } from '../domain/ielts-v3-readiness.js';

const optionsSchema=z.object({kind:ieltsHistoryItemSchema.shape.kind.optional(),cursor:z.string().max(600).optional(),limit:z.coerce.number().int().min(1).max(50).default(20)}).strict();
const cursorSchema=z.object({updatedAt:z.iso.datetime(),kind:ieltsHistoryItemSchema.shape.kind,id:z.uuid()}).strict();

@Injectable()
export class IeltsFlowService {
  constructor(@Inject(PrismaService) private readonly db:PrismaService,@Inject(ConfigService) private readonly config:ConfigService,@Inject(IeltsTopicAdminService) private readonly topics:IeltsTopicAdminService) {}
  async overview(learnerId:string) {
    return this.db.$transaction(async tx=>{
      const [user,program]=await Promise.all([tx.user.findUnique({where:{id:learnerId},include:{profile:true}}),tx.learningProgram.findUnique({where:{slug:'ielts'}})]);
      if (!user||user.role!=='LEARNER'||user.status!=='ACTIVE'||user.profile?.onboardingStatus!=='COMPLETE') throw new ConflictException({code:'IELTS_ONBOARDING_REQUIRED'});
      const v3=this.config.get('ieltsFlow')==='v3';
      const ready=v3&&['BETA','AVAILABLE'].includes(program?.availabilityStatus??'')?await readIeltsV3Readiness(tx,this.topics):{introduction:false,study:false,mock:false};
      const history=(await Promise.all((['introduction','topic-study','mock'] as const).map(kind=>this.historyRows(tx,learnerId,{kind,limit:1,activeOnly:kind!=='introduction'})))).flat();
      const section=(key:'introduction'|'study'|'mock',kind:IeltsHistoryItem['kind'])=>({available:ready[key],reason:ready[key]?null:'CONTENT_UNAVAILABLE',resumeHref:history.find(item=>item.kind===kind&&(item.state==='in-progress'||kind==='introduction'))?.href??null});
      return ieltsFlowOverviewSchema.parse({flowVersion:v3?'v3':'legacy',introduction:section('introduction','introduction'),study:section('study','topic-study'),mock:section('mock','mock')});
    },{isolationLevel:'RepeatableRead',timeout:15000});
  }
  async history(learnerId:string,input:unknown={}) {
    const parsed=optionsSchema.safeParse(input);if (!parsed.success) throw new BadRequestException({code:'IELTS_HISTORY_QUERY_INVALID'});
    const rows=await this.historyRows(this.db,learnerId,parsed.data);
    const items=rows.slice(0,parsed.data.limit).map(row=>({...row,updatedAt:new Date(row.updatedAt).toISOString()}));const last=items.at(-1);
    return ieltsHistoryPageSchema.parse({items,nextCursor:rows.length>parsed.data.limit&&last?Buffer.from(JSON.stringify({updatedAt:last.updatedAt,kind:last.kind,id:last.id})).toString('base64url'):null});
  }
  private async historyRows(db:Prisma.TransactionClient,learnerId:string,input:z.infer<typeof optionsSchema>&{activeOnly?:boolean}) {
    let cursor:z.infer<typeof cursorSchema>|null=null;
    if (input.cursor) try {cursor=cursorSchema.parse(JSON.parse(Buffer.from(input.cursor,'base64url').toString('utf8')));} catch {throw new BadRequestException({code:'IELTS_HISTORY_CURSOR_INVALID'});}
    const after=cursor?Prisma.sql`AND ("updatedAt" < ${new Date(cursor.updatedAt)} OR ("updatedAt" = ${new Date(cursor.updatedAt)} AND (kind > ${cursor.kind} OR (kind = ${cursor.kind} AND id > ${cursor.id}::uuid))))`:Prisma.empty;
    const active=input.activeOnly?Prisma.sql`AND state='in-progress'`:Prisma.empty;
    const kind=input.kind?Prisma.sql`AND kind=${input.kind}`:Prisma.empty;
    // Every source filters ownership before UNION, ordering and LIMIT. No learner
    // evidence is synthesized or merged into the new completion model.
    return db.$queryRaw<Array<Omit<IeltsHistoryItem,'updatedAt'>&{updatedAt:Date}>>(Prisma.sql`
      WITH entries AS (
        SELECT 'introduction'::text kind,v.id,ov.title,('/ielts/introduction?versionId='||v."orientationVersionId") href,v."updatedAt",'viewed'::text state FROM "IeltsIntroductionVisit" v JOIN "IeltsOrientationVersion" ov ON ov.id=v."orientationVersionId" WHERE v."learnerId"=${learnerId}::uuid
        UNION ALL SELECT 'introduction',p.id,ov.title,'/ielts/orientation',p."updatedAt",CASE WHEN p."completedAt" IS NULL THEN 'in-progress' ELSE 'completed' END FROM "OrientationProgress" p JOIN "IeltsOrientationVersion" ov ON ov.id=p."orientationVersionId" WHERE p."learnerId"=${learnerId}::uuid
        UNION ALL SELECT 'topic-study',s.id,COALESCE(v.content->>'title','IELTS study'),('/sessions/'||s.id),s."updatedAt",CASE WHEN s.status::text='COMPLETED' THEN 'completed' ELSE 'in-progress' END FROM "IeltsTopicSession" t JOIN "LearningSession" s ON s.id=t."sessionId" JOIN "IeltsTopicVersion" v ON v.id=t."topicVersionId" WHERE s."learnerId"=${learnerId}::uuid
        UNION ALL SELECT 'legacy-bridge',p.id,COALESCE(v.content->>'title','IELTS Bridge'),('/ielts/bridge/'||p."moduleId"),p."updatedAt",CASE WHEN p."completedAt" IS NULL THEN 'in-progress' ELSE 'completed' END FROM "IeltsBridgeProgress" p JOIN "IeltsBridgeModuleVersion" v ON v.id=p."moduleVersionId" WHERE p."learnerId"=${learnerId}::uuid
        UNION ALL SELECT 'legacy-integrated',s.id,('IELTS integrated · '||s."durationMinutes"||' min'),('/ielts/practice/'||s.id),s."updatedAt",CASE WHEN s."completedAt" IS NULL THEN 'in-progress' ELSE 'completed' END FROM "IeltsIntegratedSession" s WHERE s."learnerId"=${learnerId}::uuid
        UNION ALL SELECT 'legacy-band',j.id,('IELTS Band · '||j."targetBand"),'/ielts/pathway',j."updatedAt",CASE WHEN j."completedAt" IS NULL THEN 'in-progress' ELSE 'completed' END FROM "IeltsBandJourney" j WHERE j."learnerId"=${learnerId}::uuid
        UNION ALL SELECT 'mock',a.id,COALESCE(v.content->>'title','IELTS mock'),('/ielts/mock-tests/'||a.id),a."updatedAt",CASE WHEN a.status='COMPLETED' THEN 'completed' WHEN a.status='EVALUATION_PENDING' THEN 'pending-review' ELSE 'in-progress' END FROM "IeltsMockAttempt" a JOIN "IeltsMockTestVersion" v ON v.id=a."mockTestVersionId" WHERE a."learnerId"=${learnerId}::uuid
      ) SELECT * FROM entries WHERE true ${kind} ${active} ${after} ORDER BY "updatedAt" DESC,kind ASC,id ASC LIMIT ${input.limit+1}
    `);
  }
}
