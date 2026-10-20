"""Semantic merge decisions for the recorded13 overlapping files, keyed per hunk."""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[3]
records=json.loads((root/'.superpowers/sdd/plan/lg-conflicts.json').read_text(encoding='utf8'))
decisions=[]
for row in records:
    file=root/row['file'];text=file.read_text(encoding='utf8')
    if '<<<<<<< ' not in text:
        decisions.append({'file':row['file'],'decision':'Already resolved during prior interrupted script: localized label plus API enum assertion; verify exact diff and test.'})
        continue
    for n,b in enumerate(row['blocks']):
        left='\n'.join(b['ours'])+'\n' if b['ours'] else '';right='\n'.join(b['lg'])+'\n' if b['lg'] else ''
        name=file.name;reason=''
        if name=='foundation-session.spec.ts':replacement=right;reason='Keep localized visible label and stronger persisted API enum assertion.'
        elif row['file'].endswith('app/(admin)/layout.tsx'):
            if n==0:replacement="import { AdminLink as Link, AdminNavigationGuardProvider } from '../../features/admin-dashboard/admin-navigation-guard';\nimport { usePathname, useRouter } from 'next/navigation';\n"
            elif n==1:replacement="import { AdminBreadcrumbs, useAdminNavigationItems } from '../../features/admin-dashboard/admin-navigation';\n"+right
            elif n==2:replacement="  const destinations = useAdminNavigationItems();\n  const pathname = usePathname();\n  const context = [...destinations].sort((a, b) => b.href.length - a.href.length).find((item) => isNavigationItemActive(pathname, item.href))?.label ?? t('adminWorkspace');\n"
            elif n==3:replacement='    <AdminNavigationGuardProvider>\n'+right
            elif n==4:replacement=right.replace('href="/admin/content"','href="/admin"')
            reason='Keep role/auth/navigation guard and new feature destinations; GlassSurface/header/disclosure/main ownership from LG; guarded link seam follows in TDD.'
        elif name=='content-authoring-workspace.tsx':replacement=left+right;reason='Narration review feature and authoring styles are complementary imports.'
        elif name=='content-list.tsx':replacement=right+''.join(line+'\n' for line in b['ours'][1:]);reason='Keep named keyboard scroll region plus new reload/error/lifecycle behavior.'
        elif name=='band-curriculum-workspace.tsx':
            replacement=left+right if n==0 else right.replace('className="bridge-shell authoring-experience"','className="bridge-shell authoring-experience band-config"');reason='Keep BandStageEditor/scoped feature CSS and LG section semantics/material classes; new handlers stay outside hunk.'
        elif name=='ielts-mock-workspace.tsx':replacement=right.replace('className="bridge-shell authoring-experience">','className="bridge-shell authoring-experience" aria-busy={busy}>');reason='Single admin main owns landmark; retain actual authoring busy state.'
        elif name=='audio-settings-panel.tsx':
            replacement=left+"import './preferences-experience.css';\n" if n==0 else left.replace('className="audio-settings-state"','className="audio-settings-state preferences-experience"');reason='Voice registry/store is the approved new owner, not obsolete direct speech hook; retain LG preference classes and unavailable saved voice logic.'
        elif name=='ielts-bridge.css':replacement=left+right;reason='New media/data-table styles and existing LG bridge owners both required; later browser reflow validates cascade.'
        elif name=='ielts-mock.tsx':
            replacement=left+right if n==0 else left;reason='Preserve V2/V3 preflight/idempotent start/pause/resume/recordings/expiry/revision recovery; reapply LG presentation without reverting server policy.'
        elif name=='dashboard-view.test.tsx':replacement=left;reason='Keep actual new overview API fixture used by dashboard tests.'
        elif name=='dashboard-view.tsx':
            if n==0:replacement=left+right
            else:replacement='              <strong className="stat-value">{formatLevel((currentLevelCode !== undefined ? currentLevelCode : analytics ? activeProgram?.currentLevelCode : progress?.currentLevelCode) ?? dashboardT(\'noLevel\'), locale)}</strong>\n'
            reason='Preserve new dashboard analytics/program level selection and honest missing level; localize actual known Foundation code without inventing default.'
        elif name=='evaluation-feedback.test.tsx':replacement=left+right;reason='Retain both real model-processing steps and LG inline/busy/delete/draft identity coverage.'
        elif name=='ieltsMock.ts':replacement=left+right;reason='Retain all media/V3 translations and LG answer-state labels in both locales.'
        else:raise RuntimeError(row['file'])
        start=text.index('<<<<<<< ');separator=text.index('\n=======\n',start);end=text.index('\n>>>>>>> ',separator);end=text.index('\n',end+1)+1
        assert text[start:separator].partition('\n')[2].rstrip('\n')==left.rstrip('\n'),(row['file'],n,'hunk shifted')
        text=text[:start]+replacement+text[end:]
        decisions.append({'file':row['file'],'hunk':n,'originalLine':b['line'],'decision':reason,'combinedSHA256':hashlib.sha256(replacement.encode()).hexdigest()})
    assert '<<<<<<< ' not in text
    if row['file'].endswith('app/(admin)/layout.tsx'):
        old='''      <div className="ad-workspace">
        <AdminNavigation />
        <main id="admin-main-content" tabIndex={-1} className="admin-main-content">
          <AdminBreadcrumbs />
          {children}
        </main>
      </div>'''
        new='''      <WorkspaceNavigation items={destinations} label={t('adminWorkspace')} variant="admin" linkComponent={Link} />
      <main id="admin-main-content" tabIndex={-1} className="admin-main-content">
        <AdminBreadcrumbs />
        {children}
      </main>'''
        assert old in text;text=text.replace(old,new)
    file.write_text(text,encoding='utf8')
(root/'docs/integration/evidence/glass-resolutions.json').write_text(json.dumps(decisions,indent=2)+'\n',encoding='utf8')
print(json.dumps({'owners':len(records),'reviewedHunks':len(decisions),'pendingAdaptations':['Admin guard link seam/destinations tests','Mock V3 presentation','New feature scoped Glass token consumers']}))
