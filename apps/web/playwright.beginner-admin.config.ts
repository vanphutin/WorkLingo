import {defineConfig,devices} from '@playwright/test';
import {lstatSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {readApprovedBeginnerPermissionSync,preflightBeginnerEnvironment} from '../api/src/beginner/domain/beginner-environment-preflight';
// No legacy config, .env, server startup, database creation or cleanup.
const permission=readApprovedBeginnerPermissionSync(),url=process.env.TEST_DATABASE_URL;
if(!permission||!url||process.env.DATABASE_URL!==url||process.env.NODE_ENV!=='test'||process.env.WORKLINGO_BEGINNER_ISOLATED_TEST!=='1')throw Error('BLOCKED: separate isolated Beginner E2E approval required');
preflightBeginnerEnvironment(permission,url);
if(process.env.WORKLINGO_BEGINNER_WEB_BASE_URL!=='http://127.0.0.1:47772'||process.env.WORKLINGO_BEGINNER_API_BASE_URL!=='http://127.0.0.1:47771')throw Error('BLOCKED: explicit dedicated loopback test servers required');
const state=path.join(permission.ownedTempRoot,permission.runId,'admin-storage-state.json');
if(lstatSync(state).isSymbolicLink()||realpathSync(state)!==state)throw Error('BLOCKED: unsafe synthetic authentication state');
export default defineConfig({testDir:'./e2e',testMatch:/beginner-admin(?:-history)?\.spec\.ts/u,fullyParallel:false,workers:1,retries:0,use:{baseURL:process.env.WORKLINGO_BEGINNER_WEB_BASE_URL,storageState:state,serviceWorkers:'block',permissions:[],trace:'retain-on-failure'},projects:[{name:'beginner-admin-desktop',use:{...devices['Desktop Chrome']}},{name:'beginner-admin-mobile',use:{...devices['Pixel 5'],permissions:[]}}]});
