import type { Page } from '@playwright/test';
import { installLearningFixtures } from './phase4-learning-contracts';
import { installSessionFixtures, sessionId as learningId } from './phase4-session-contracts';
import { installOrientationBridgeFixtures, moduleId } from './phase4-orientation-bridge-contracts';
import { installExamFixtures, sessionId, attemptId } from './phase4-exam-contracts';
import { installAuthoringFixtures, importId } from './phase4-authoring-contracts';
import { installSettingsFixtures } from './phase4-settings-contracts';
export const auditRoutes = [
  ['public','/','main h1'],['public','/login','input[type=email]'],['public','/register','input[type=email]'],
  ['learning','/dashboard','.next-mission-card'],['learning','/programs','.program-card'],['learning','/mastery','.mastery-block'],
  ['onboarding','/onboarding','.onboarding-methods'],['placement',`/onboarding/placement/${learningId}`,'.activity-container'],['session',`/sessions/${learningId}`,'.activity-container'],
  ['orientation','/ielts/orientation','.orientation-question'],['bridge','/ielts/bridge','.bridge-module-card'],['bridge',`/ielts/bridge/${moduleId}`,'.bridge-stage-card'],
  ['integrated','/ielts/practice','.bridge-stage-card'],['integrated',`/ielts/practice/${sessionId}`,'[role=timer]'],['pathway','/ielts/pathway','.band-pathway-card'],['mock','/ielts/mock-tests','.bridge-stage-card'],['mock',`/ielts/mock-tests/${attemptId}`,'[role=timer]'],
  ['content','/admin/content','.content-table'],['content','/admin/content/new','#raw-source-input'],['content',`/admin/content/${importId}`,'.editor-textarea'],['curriculum','/admin/curriculum','.admin-page-header'],['authorOrientation','/admin/ielts-orientation','.orientation-editor'],['authorBridge','/admin/ielts-bridge','.bridge-editor'],['authorIntegrated','/admin/ielts-integrated','.bridge-stage-card input'],['band','/admin/ielts-band-curriculum','.band-editor input'],['authorMock','/admin/ielts-mocks','.authoring-fields input'],
  ['settings','/settings','.settings-grid'],['audio','/settings/audio','.audio-source-list'],['ai','/settings/ai','.admin-ai-fieldset'],['adminAudio','/admin/settings/audio','.admin-provider-card'],['adminAi','/admin/settings/ai','.admin-ai-fieldset'],['audit','/admin/audit','.audit-events-list'],['operations','/admin/operations','.observability-table'],['analytics','/admin/analytics','.observability-table'],
] as const;
export type AuditRoute = typeof auditRoutes[number];
export async function prepareAuditRoute(page: Page, item: AuditRoute) {
  // Settle the previous route's prefetches before destroying its origin/context.
  // WebKit otherwise reports the fixture's navigation cancellation as a CORS error.
  await page.waitForLoadState('networkidle');
  await page.goto('about:blank'); await page.unrouteAll({ behavior: 'wait' });
  const kind=item[0];
  if(kind==='public') { await page.route('**/api/v1/me',r=>r.fulfill({status:401,json:{message:'Guest fixture'}})); return; }
  if(kind==='learning') { await installLearningFixtures(page); return; }
  if(kind==='session'||kind==='placement'||kind==='onboarding') { await installSessionFixtures(page,{kind,skill:'reading'}); return; }
  if(kind==='orientation'||kind==='bridge') { await installOrientationBridgeFixtures(page,{kind}); return; }
  if(kind==='integrated'||kind==='pathway'||kind==='mock') { await installExamFixtures(page,{kind}); return; }
  if(kind==='content'||kind==='curriculum'||kind==='band'||kind.startsWith('author')) {
    const authorKind=kind==='authorOrientation'?'orientation':kind==='authorBridge'?'bridge':kind==='authorIntegrated'?'integrated':kind==='authorMock'?'mock':kind as 'content'|'curriculum'|'band';
    await installAuthoringFixtures(page,{kind:authorKind}); return;
  }
  await installSettingsFixtures(page,{kind});
}
