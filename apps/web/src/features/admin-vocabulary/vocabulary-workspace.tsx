'use client';
import { useState } from 'react';
import { useVocabularyT } from './vocabulary-ui';
import { EntriesPanel } from './entries-panel';
import { SourcesPanel } from './sources-panel';
import { ImportPanel } from './import-panel';
import { BatchesPanel } from './batches-panel';
import { CollectionsPanel } from './collections-panel';
import './vocabulary-workspace.css';

export function VocabularyWorkspace() {
  const t = useVocabularyT(); const [view, setView] = useState<'library' | 'sources' | 'batches' | 'collections' | 'import'>('library'); const [selected, setSelected] = useState<string[]>([]);
  return <div className="vocab-workspace"><header className="admin-page-header"><div className="admin-page-heading"><h1>{t('title')}</h1><p>{t('help')}</p></div></header>
    <nav className="vocab-views" aria-label={t('title')}>{(['library', 'sources', 'batches', 'collections', 'import'] as const).map(value => <button type="button" key={value} aria-current={view === value ? 'page' : undefined} onClick={() => setView(value)}>{t(value)}</button>)}</nav>
    {view === 'library' ? <EntriesPanel selected={selected} setSelected={setSelected} /> : view === 'sources' ? <SourcesPanel /> : view === 'batches' ? <BatchesPanel /> : view === 'collections' ? <CollectionsPanel selected={selected} /> : <ImportPanel />}
  </div>;
}
