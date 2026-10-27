import 'reflect-metadata';
import {Controller,Get,Req,ValidationPipe,type INestApplication} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {ConfigService} from '@nestjs/config';
import {Test} from '@nestjs/testing';
import {createHmac} from 'node:crypto';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import type {Request,Response,NextFunction} from 'express';
import {BeginnerAdminController} from '../../src/beginner/beginner-admin.controller.js';
import {BeginnerAuthoringService} from '../../src/beginner/application/beginner-authoring.service.js';
import {AuthService} from '../../src/auth/application/auth.service.js';
import {SessionAuthGuard} from '../../src/auth/infrastructure/session-auth.guard.js';
import {RolesGuard} from '../../src/auth/infrastructure/roles.guard.js';
import {PasswordHasher} from '../../src/auth/infrastructure/password-hasher.js';
import {UsersService} from '../../src/users/application/users.service.js';
import type {AuthenticatedRequest} from '../../src/auth/authenticated-request.js';
import {PrismaService} from '../../src/common/database/prisma.service.js';
import {openBeginnerHarness} from '../integration/beginner-test-harness.js';
import {readMainScope,type MainScope,type RunWindow} from './environment.js';
import {fileLedgerStore,guardedFixtureClient,type FixtureDescriptor} from './fixtures.js';
export function validateServerInputs(env:NodeJS.ProcessEnv):string[]{
 let cookies:unknown;try{cookies=JSON.parse(env.WORKLINGO_BEGINNER_MAIN_COOKIES??'null');}catch{throw Error('MAIN_SERVER_INPUT');}
 if(env.API_PORT!=='47771'||env.WORKLINGO_BEGINNER_MAIN_TEST!=='1'||!Array.isArray(cookies)||cookies.length!==3||new Set(cookies).size!==3||cookies.some(c=>typeof c!=='string'||!/^[a-f0-9]{64}$/u.test(c)))throw Error('MAIN_SERVER_INPUT');return cookies as string[];
}
@Controller('me')
class MainFixtureMeController {@Get() me(@Req()req:AuthenticatedRequest){return req.authUser;}}
export interface OwnedServerReceipt {pid:number;host:'127.0.0.1';port:47771;fixtureOnly:true;close():Promise<void>}
export async function startMainAdminServer(scope:MainScope,_fixture:FixtureDescriptor):Promise<OwnedServerReceipt>{
 const cookies=validateServerInputs(process.env),h=await openBeginnerHarness();
 const window=JSON.parse(readFileSync(path.join(scope.environment.filesystem.runRoot,'run.json'),'utf8')) as RunWindow;
 const base=new PrismaService({datasourceUrl:process.env.TEST_DATABASE_URL!});
 const hashes=cookies.map(c=>createHmac('sha256',process.env.SESSION_SECRET!).update(c).digest('hex'));
 const db=guardedFixtureClient(scope,base,fileLedgerStore(scope,window),hashes);
 let app:INestApplication|undefined;
 try{
  const module=await Test.createTestingModule({controllers:[BeginnerAdminController,MainFixtureMeController],providers:[{provide:BeginnerAuthoringService,useValue:h.authoring},{provide:PrismaService,useValue:db},UsersService,AuthService,{provide:PasswordHasher,useValue:{hash:()=>{throw Error('MAIN_LOGIN_FORBIDDEN');},verify:()=>{throw Error('MAIN_LOGIN_FORBIDDEN');}}},{provide:ConfigService,useValue:new ConfigService({sessionSecret:process.env.SESSION_SECRET})}]}).compile();
  app=module.createNestApplication({logger:false});app.setGlobalPrefix('api/v1');
  app.use((req:Request,res:Response,next:NextFunction)=>{
   const token=(req.headers.cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith('worklingo_session='))?.slice('worklingo_session='.length);
   if(!token||!cookies.includes(token)){res.status(401).json({message:'Fixture authentication required'});return;}
   if(!/^\/api\/v1\/(?:me(?:\?|$)|admin\/beginner(?:\/|\?|$))/u.test(req.url)){res.status(403).json({message:'Fixture-only route boundary'});return;}next();
  });
  app.useGlobalGuards(new SessionAuthGuard(app.get(AuthService),app.get(Reflector)),new RolesGuard(app.get(Reflector)));
  app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true,forbidNonWhitelisted:true}));
  await app.listen(47771,'127.0.0.1');
  return {pid:process.pid,host:'127.0.0.1',port:47771,fixtureOnly:true,close:async()=>{await app!.close();await base.$disconnect();await h.close();}};
 }catch(e){await app?.close();await base.$disconnect();await h.close();throw e;}
}
if(require.main===module){void(async()=>{
 const scope=readMainScope(),fixture=JSON.parse(readFileSync(path.join(scope.environment.filesystem.runRoot,'fixture-descriptor.json'),'utf8')) as FixtureDescriptor;
 const server=await startMainAdminServer(scope,fixture);console.log('MAIN_API_READY');
 for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{void server.close().then(()=>process.exit(0));});
})().catch(()=>{console.error('MAIN_API_START_FAILED');process.exitCode=1;});}
