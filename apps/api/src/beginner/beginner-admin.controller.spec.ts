import type {Request,Response,NextFunction} from 'express';
import {Test} from '@nestjs/testing';
import {Reflector} from '@nestjs/core';
import {describe,it,expect,vi} from 'vitest';
import request from 'supertest';
import {BeginnerAdminController} from './beginner-admin.controller.js';
import {BeginnerAuthoringService} from './application/beginner-authoring.service.js';
import {RolesGuard} from '../auth/infrastructure/roles.guard.js';
describe('Beginner Admin HTTP authorization (mock DB/provider boundary)',()=>{
 it('rejects learner roles through a direct URL, while Admin can read the plan',async()=>{
  const read=vi.fn().mockResolvedValue({writesEnabled:false});
  const module=await Test.createTestingModule({controllers:[BeginnerAdminController],providers:[{provide:BeginnerAuthoringService,useValue:{getWorkspace:read}}]}).compile();
  const app=module.createNestApplication();
  app.use((req:Request,_res:Response,next:NextFunction)=>{(req as Request&{authUser:{id:string;roles:string[]}}).authUser={id:'synthetic',roles:[String(req.headers['x-fixture-role']??'LEARNER')]};next();});
  app.useGlobalGuards(new RolesGuard(app.get(Reflector)));await app.init();
  try{
   const learner=await request(app.getHttpServer()).get('/admin/beginner');
   expect(learner.status).toBe(403);expect(read).not.toHaveBeenCalled();
   expect((await request(app.getHttpServer()).get('/admin/beginner').set('x-fixture-role','CONTENT_ADMIN')).status).toBe(200);
  }finally{await app.close();}
 });
});
