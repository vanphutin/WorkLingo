import {tmpdir} from 'node:os';
import path from 'node:path';
import { defineConfig } from '@playwright/test';
const evidence=process.env.WL_R21_BROWSER_EVIDENCE_DIR??path.join(tmpdir(),'worklingo-r21-20261107','browser');
export default defineConfig({
 expect:{timeout:45000},
 testDir:'./e2e',testMatch:'r21-beginner-publication.spec.ts',fullyParallel:false,workers:1,retries:0,timeout:420000,
 reporter:[['list'],['json',{outputFile:path.join(evidence,'results.json')}]],
 outputDir:path.join(evidence,'artifacts'),
 use:{baseURL:'http://127.0.0.1:3001',trace:'retain-on-failure',reducedMotion:'reduce',storageState:{cookies:[{name:'worklingo_locale',value:'en',domain:'127.0.0.1',path:'/',expires:-1,httpOnly:false,secure:false,sameSite:'Lax'}],origins:[]}},
 projects:[{name:'r21-desktop',use:{viewport:{width:1440,height:1000}}},{name:'r21-mobile',use:{viewport:{width:390,height:844}}},{name:'r21-tablet',use:{viewport:{width:768,height:1024}}}],
});
