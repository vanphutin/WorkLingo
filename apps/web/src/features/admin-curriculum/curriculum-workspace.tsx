'use client';
import { useAdminDraftGuard, useAdminCanNavigate } from '../admin-dashboard/admin-navigation-guard';
import { AdminPageHeader } from '../admin-experience/admin-patterns';

import { useAdminCurriculum } from './i18n';

import React, { useEffect, useState } from 'react';
import type {
  AdminCurriculumTreeDto,
  AdminLearningPathItemDto,
  AdminLevelItemDto,
  AdminMissionItemDto,
} from '@worklingo/contracts';

import { adminCurriculumClient } from '../../lib/api/admin-curriculum-client';
import { curriculumFoundationClient } from '../../lib/api/curriculum-foundation-client';
import { FoundationDefinitionEditor, type PrerequisiteOption } from './foundation-definition-editor';
import './curriculum.css';
import '../admin-content/authoring-experience.css';

export function CurriculumWorkspace() {
  const { t, locale, number, label, message: displayMessage } = useAdminCurriculum();
  const canNavigate = useAdminCanNavigate();
  const [tree, setTree] = useState<AdminCurriculumTreeDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<unknown>(null);
  const [successMessage, setSuccessMessage] = useState<unknown>(null);

  // Forms state
  const [isCreatingPath, setIsCreatingPath] = useState(false);
  const [pathName, setPathName] = useState('');
  const [pathProgramId, setPathProgramId] = useState('');
  const [pathSlug, setPathSlug] = useState('');

  const [activeLevelFormPathId, setActiveLevelFormPathId] = useState<string | null>(null);
  const [levelCode, setLevelCode] = useState('');
  const [levelName, setLevelName] = useState('');
  const [levelCefr, setLevelCefr] = useState('');

  const [activeMissionFormLevelId, setActiveMissionFormLevelId] = useState<string | null>(null);
  const [missionTitle, setMissionTitle] = useState('');
  const [missionSlug, setMissionSlug] = useState('');
  const [missionObjective, setMissionObjective] = useState('');
  const [activeFoundationMissionId, setActiveFoundationMissionId] = useState<string | null>(null);
  const [prerequisiteOptions, setPrerequisiteOptions] = useState<PrerequisiteOption[]>([]);
  const [isOpeningFoundation, setIsOpeningFoundation] = useState(false);

  useAdminDraftGuard(Boolean(pathName || pathSlug || levelCode || levelName || levelCefr || missionTitle || missionSlug || missionObjective));

  // Scalability & Navigation state
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [collapsedLevels, setCollapsedLevels] = useState<Set<string>>(new Set());
  const [isCompactView, setIsCompactView] = useState(false);
  const [selectedPathFilter, setSelectedPathFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [issuesOnlyFilter, setIssuesOnlyFilter] = useState(false);
  const [showTreeOverview, setShowTreeOverview] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [collapsedPrograms, setCollapsedPrograms] = useState<Set<string>>(new Set());

  const toggleProgramCollapse = (programId: string) => {
    setCollapsedPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(programId)) next.delete(programId);
      else next.add(programId);
      return next;
    });
  };

  const togglePathCollapse = (pathId: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(pathId)) next.delete(pathId);
      else next.add(pathId);
      return next;
    });
  };

  const toggleLevelCollapse = (levelId: string) => {
    setCollapsedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(levelId)) next.delete(levelId);
      else next.add(levelId);
      return next;
    });
  };

  const handleExpandAll = () => {
    setCollapsedPrograms(new Set());
    setCollapsedPaths(new Set());
    setCollapsedLevels(new Set());
  };

  const handleCollapseAll = () => {
    if (!tree) return;
    const allProgramIds = tree.programs.map((p) => p.id);
    const allPathIds = tree.paths.map((p) => p.id);
    const allLevelIds = tree.paths.flatMap((p) => p.levels.map((l) => l.id));
    setCollapsedPrograms(new Set(allProgramIds));
    setCollapsedPaths(new Set(allPathIds));
    setCollapsedLevels(new Set(allLevelIds));
  };

  const handleJumpToNode = (targetId: string, pathId?: string, levelId?: string) => {
    if (pathId && tree) {
      const targetPath = tree.paths.find((p) => p.id === pathId);
      if (targetPath?.program?.id && collapsedPrograms.has(targetPath.program.id)) {
        setCollapsedPrograms((prev) => {
          const next = new Set(prev);
          next.delete(targetPath.program.id);
          return next;
        });
      }
    }
    if (pathId && collapsedPaths.has(pathId)) {
      setCollapsedPaths((prev) => {
        const next = new Set(prev);
        next.delete(pathId);
        return next;
      });
    }
    if (levelId && collapsedLevels.has(levelId)) {
      setCollapsedLevels((prev) => {
        const next = new Set(prev);
        next.delete(levelId);
        return next;
      });
    }
    if (pathId && selectedPathFilter !== 'ALL' && selectedPathFilter !== pathId) {
      setSelectedPathFilter('ALL');
    }

    setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.remove('jump-highlight');
        void element.offsetWidth;
        element.classList.add('jump-highlight');
        setTimeout(() => {
          element.classList.remove('jump-highlight');
        }, 2000);
      }
    }, 60);
  };

  const getProgramDisplayName = (program: { slug: string; name: string }) => {
    switch (program.slug) {
      case 'beginner':
        return t('programName_beginner');
      case 'intermediate':
        return t('programName_intermediate');
      case 'toeic':
        return t('programName_toeic');
      case 'ielts':
        return t('programName_ielts');
      default:
        return program.name;
    }
  };

  const handleCopyTree = async () => {
    if (!tree) return;
    const lines: string[] = ['WorkLingo Curriculum'];
    const programOrder: Record<string, number> = {
      beginner: 1,
      intermediate: 2,
      toeic: 3,
      ielts: 4,
    };
    const programsList = tree.programs && tree.programs.length > 0
      ? [...tree.programs].sort((a, b) => (programOrder[a.slug] ?? 99) - (programOrder[b.slug] ?? 99))
      : [];

    if (programsList.length > 0) {
      programsList.forEach((program, prIdx) => {
        const isLastProgram = prIdx === programsList.length - 1;
        const prPrefix = isLastProgram ? '└── ' : '├── ';
        const prIndent = isLastProgram ? '    ' : '│   ';
        const programPaths = tree.paths.filter((p) => p.program.id === program.id);
        const programDisplayName = getProgramDisplayName(program);

        lines.push(`${prPrefix}🎓 ${t('nodeTypeProgram')}: ${programDisplayName} (${label(program.availabilityStatus)})`);

        if (programPaths.length === 0) {
          lines.push(`${prIndent}└── 💬 (${t('noPathsInProgram')})`);
        } else {
          programPaths.forEach((path, pIdx) => {
            const isLastPath = pIdx === programPaths.length - 1;
            const pPrefix = isLastPath ? '└── ' : '├── ';
            const pIndent = isLastPath ? '    ' : '│   ';
            lines.push(`${prIndent}${pPrefix}🗺️ ${t('nodeTypePath')}: ${path.name} (${label(path.status)})`);

            path.levels.forEach((level, lIdx) => {
              const isLastLevel = lIdx === path.levels.length - 1;
              const lPrefix = isLastLevel ? '└── ' : '├── ';
              const lIndent = isLastLevel ? '    ' : '│   ';
              lines.push(`${prIndent}${pIndent}${lPrefix}🏷️ ${t('nodeTypeLevel')}: ${level.name} (${label(level.status)})`);

              level.missions.forEach((mission, mIdx) => {
                const isLastMission = mIdx === level.missions.length - 1;
                const mPrefix = isLastMission ? '└── ' : '├── ';
                const mIndent = isLastMission ? '    ' : '│   ';
                lines.push(`${prIndent}${pIndent}${lIndent}${mPrefix}🎯 ${t('nodeTypeMission')}: ${mission.title} (${label(mission.status)})`);

                mission.lessons.forEach((lesson, lsIdx) => {
                  const isLastLesson = lsIdx === mission.lessons.length - 1;
                  const lsPrefix = isLastLesson ? '└── ' : '├── ';
                  const audioIndicator = lesson.hasAudio ? `(🎧 ${t('nodeAudioReady')})` : `(⏳ ${t('nodeNoAudio')})`;
                  lines.push(`${prIndent}${pIndent}${lIndent}${mIndent}${lsPrefix}📖 ${t('nodeTypeLesson')}: ${lesson.title} ${audioIndicator}`);
                });
              });
            });
          });
        }
      });
    } else {
      tree.paths.forEach((path, pIdx) => {
        const isLastPath = pIdx === tree.paths.length - 1;
        const pPrefix = isLastPath ? '└── ' : '├── ';
        const pIndent = isLastPath ? '    ' : '│   ';
        lines.push(`${pPrefix}🗺️ ${t('nodeTypePath')}: ${path.name} (${label(path.status)})`);

        path.levels.forEach((level, lIdx) => {
          const isLastLevel = lIdx === path.levels.length - 1;
          const lPrefix = isLastLevel ? '└── ' : '├── ';
          const lIndent = isLastLevel ? '    ' : '│   ';
          lines.push(`${pIndent}${lPrefix}🏷️ ${t('nodeTypeLevel')}: ${level.name} (${label(level.status)})`);

          level.missions.forEach((mission, mIdx) => {
            const isLastMission = mIdx === level.missions.length - 1;
            const mPrefix = isLastMission ? '└── ' : '├── ';
            const mIndent = isLastMission ? '    ' : '│   ';
            lines.push(`${pIndent}${lIndent}${mPrefix}🎯 ${t('nodeTypeMission')}: ${mission.title} (${label(mission.status)})`);

            mission.lessons.forEach((lesson, lsIdx) => {
              const isLastLesson = lsIdx === mission.lessons.length - 1;
              const lsPrefix = isLastLesson ? '└── ' : '├── ';
              const audioIndicator = lesson.hasAudio ? `(🎧 ${t('nodeAudioReady')})` : `(⏳ ${t('nodeNoAudio')})`;
              lines.push(`${pIndent}${lIndent}${mIndent}${lsPrefix}📖 ${t('nodeTypeLesson')}: ${lesson.title} ${audioIndicator}`);
            });
          });
        });
      });
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // clipboard might not be available in headless test
    }
  };

  const handleOpenFoundation = async (mission: AdminMissionItemDto) => {
    if (activeFoundationMissionId && !canNavigate()) return;
    if (activeFoundationMissionId === mission.id) { setActiveFoundationMissionId(null); return; }
    setIsOpeningFoundation(true); setErrorMessage(null);
    try {
      const candidates = tree?.paths.flatMap((path) => path.levels.flatMap((level) => level.missions))
        .filter((candidate) => candidate.id !== mission.id) ?? [];
      const drafts = await Promise.all(candidates.map(async (candidate) => ({
        candidate, draft: await curriculumFoundationClient.getDraft(candidate.id).catch(() => null),
      })));
      setPrerequisiteOptions(drafts.flatMap(({ candidate, draft }) => draft?.publishedRevisions
        .filter((revision) => revision.status === 'PUBLISHED')
        .map((revision) => ({ id: revision.id, label: candidate.title, title: candidate.title, revision: revision.revision })) ?? []));
      setActiveFoundationMissionId(mission.id);
    } finally { setIsOpeningFoundation(false); }
  };

  const loadTree = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await adminCurriculumClient.getTree();
      setTree(data);
      setPathProgramId((current) => {
        if (current) return current;
        return data.programs.find((program) => program.slug === 'intermediate')?.id
          ?? data.programs[0]?.id
          ?? '';
      });
    } catch (err) {
      setErrorMessage(
        err
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTree();
  }, []);

  const handleCreatePath = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMessage(null);
      await adminCurriculumClient.createPath({
        idempotencyKey: crypto.randomUUID(),
        name: pathName.trim(),
        programId: pathProgramId,
        slug: pathSlug.trim(),
      });
      setSuccessMessage({ key: 'pathCreated', values: { name: pathName } });
      setIsCreatingPath(false);
      setPathName('');
      setPathProgramId('');
      setPathSlug('');
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err
      );
    }
  };

  const handlePublishPath = async (path: AdminLearningPathItemDto) => {
    try {
      setErrorMessage(null);
      await adminCurriculumClient.publishPath(path.id, {
        expectedRevision: path.revision,
        idempotencyKey: crypto.randomUUID(),
      });
      setSuccessMessage({ key: 'pathPublished', values: { name: path.name } });
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err
      );
    }
  };

  const handleArchivePath = async (path: AdminLearningPathItemDto) => {
    try {
      setErrorMessage(null);
      await adminCurriculumClient.archivePath(path.id, {
        expectedRevision: path.revision,
        idempotencyKey: crypto.randomUUID(),
      });
      setSuccessMessage({ key: 'pathArchived', values: { name: path.name } });
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err
      );
    }
  };

  const handleCreateLevel = async (pathId: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMessage(null);
      await adminCurriculumClient.createLevel({
        cefrReference: levelCefr.trim(),
        code: levelCode.trim(),
        idempotencyKey: crypto.randomUUID(),
        name: levelName.trim(),
        pathId,
      });
      setSuccessMessage({ key: 'levelCreated', values: { name: levelName } });
      setActiveLevelFormPathId(null);
      setLevelCode('');
      setLevelName('');
      setLevelCefr('');
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err
      );
    }
  };

  const handlePublishLevel = async (level: AdminLevelItemDto) => {
    try {
      setErrorMessage(null);
      await adminCurriculumClient.publishLevel(level.id, {
        expectedRevision: level.revision,
        idempotencyKey: crypto.randomUUID(),
      });
      setSuccessMessage({ key: 'levelPublished', values: { name: level.name } });
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err
      );
    }
  };

  const handleArchiveLevel = async (level: AdminLevelItemDto) => {
    try {
      setErrorMessage(null);
      await adminCurriculumClient.archiveLevel(level.id, {
        expectedRevision: level.revision,
        idempotencyKey: crypto.randomUUID(),
      });
      setSuccessMessage({ key: 'levelArchived', values: { name: level.name } });
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err
      );
    }
  };

  const handleReorderLevel = async (
    pathId: string,
    levels: AdminLevelItemDto[],
    index: number,
    direction: 'up' | 'down',
  ) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= levels.length) return;

    const newLevels = [...levels];
    const moved = newLevels.splice(index, 1)[0];
    if (!moved) return;
    newLevels.splice(targetIndex, 0, moved);

    try {
      setErrorMessage(null);
      await adminCurriculumClient.reorderLevels(pathId, {
        idempotencyKey: crypto.randomUUID(),
        orderedIds: newLevels.map((l) => l.id),
      });
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err
      );
    }
  };

  const handleCreateMission = async (levelId: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMessage(null);
      await adminCurriculumClient.createMission({
        idempotencyKey: crypto.randomUUID(),
        levelId,
        objective: missionObjective.trim(),
        purpose: 'LEARNING',
        slug: missionSlug.trim(),
        title: missionTitle.trim(),
      });
      setSuccessMessage({ key: 'missionCreated', values: { name: missionTitle } });
      setActiveMissionFormLevelId(null);
      setMissionTitle('');
      setMissionSlug('');
      setMissionObjective('');
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err
      );
    }
  };

  const handlePublishMission = async (mission: AdminMissionItemDto) => {
    try {
      setErrorMessage(null);
      await adminCurriculumClient.publishMission(mission.id, {
        expectedRevision: mission.revision,
        idempotencyKey: crypto.randomUUID(),
      });
      setSuccessMessage({ key: 'missionPublished', values: { name: mission.title } });
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err
      );
    }
  };

  const handleArchiveMission = async (mission: AdminMissionItemDto) => {
    try {
      setErrorMessage(null);
      await adminCurriculumClient.archiveMission(mission.id, {
        expectedRevision: mission.revision,
        idempotencyKey: crypto.randomUUID(),
      });
      setSuccessMessage({ key: 'missionArchived', values: { name: mission.title } });
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err
      );
    }
  };

  const handleReorderMission = async (
    levelId: string,
    missions: AdminMissionItemDto[],
    index: number,
    direction: 'up' | 'down',
  ) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= missions.length) return;

    const newMissions = [...missions];
    const moved = newMissions.splice(index, 1)[0];
    if (!moved) return;
    newMissions.splice(targetIndex, 0, moved);

    try {
      setErrorMessage(null);
      await adminCurriculumClient.reorderMissions(levelId, {
        idempotencyKey: crypto.randomUUID(),
        orderedIds: newMissions.map((m) => m.id),
      });
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err
      );
    }
  };

  const query = searchQuery.trim().toLowerCase();

  const filteredPaths = (tree?.paths ?? []).filter((path) => {
    if (selectedPathFilter !== 'ALL' && path.id !== selectedPathFilter) {
      return false;
    }

    if (statusFilter !== 'ALL') {
      const matchesPath = path.status === statusFilter;
      const matchesLevel = path.levels.some((l) => l.status === statusFilter);
      const matchesMission = path.levels.some((l) => l.missions.some((m) => m.status === statusFilter));
      if (!matchesPath && !matchesLevel && !matchesMission) return false;
    }

    if (issuesOnlyFilter) {
      const hasPathIssues = path.archiveBlockers.length > 0;
      const hasLevelIssues = path.levels.some((l) => !l.isPlayable || l.archiveBlockers.length > 0);
      const hasMissionIssues = path.levels.some((l) =>
        l.missions.some((m) => !m.isPlayable || m.archiveBlockers.length > 0)
      );
      if (!hasPathIssues && !hasLevelIssues && !hasMissionIssues) return false;
    }

    if (query) {
      const matchPath =
        path.name.toLowerCase().includes(query) ||
        path.slug.toLowerCase().includes(query) ||
        path.program.name.toLowerCase().includes(query);
      const matchLevels = path.levels.some(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.code.toLowerCase().includes(query) ||
          l.cefrReference.toLowerCase().includes(query) ||
          l.missions.some(
            (m) =>
              m.title.toLowerCase().includes(query) ||
              m.slug.toLowerCase().includes(query) ||
              m.objective.toLowerCase().includes(query) ||
              m.lessons.some(
                (ls) =>
                  (ls.title ?? '').toLowerCase().includes(query) ||
                  ls.slug.toLowerCase().includes(query)
              )
          )
      );
      if (!matchPath && !matchLevels) return false;
    }

    return true;
  });

  // Filtering/collapsing the tree must not own the lifetime of an open draft.
  const activeFoundationMission = tree?.paths.flatMap(path => path.levels.flatMap(level => level.missions))
    .find(mission => mission.id === activeFoundationMissionId);

  if (isLoading && !tree) {
    return (
      <div className="curriculum-container authoring-experience" role="status">
        <p>{t('loadingTree')}</p>
      </div>
    );
  }

  return (
    <div className="curriculum-container authoring-experience">
      <AdminPageHeader title={t('title')} description={t('help')} actions={
        <div className="curriculum-actions">
          <button
            type="button"
            className="action-button action-button-secondary"
            onClick={loadTree}
          >{t('refreshTree')}</button>
          <button
            type="button"
            className="action-button action-button-primary"
            onClick={() => setIsCreatingPath((prev) => !prev)}
          >
            {isCreatingPath ? t('cancelNewPath') : t('newPath')}
          </button>
        </div>
      } />

      {Boolean(errorMessage) && (
        <div className="curriculum-alert curriculum-alert-error" role="alert">
          <span>{displayMessage(errorMessage)}</span>
          <button
            type="button"
            className="action-button-icon"
            onClick={() => setErrorMessage(null)}
            aria-label={t('dismissError')}
          >
            ✕
          </button>
        </div>
      )}

      {Boolean(successMessage) && (
        <div className="curriculum-alert curriculum-alert-success" role="status">
          <span>{displayMessage(successMessage)}</span>
          <button
            type="button"
            className="action-button-icon"
            onClick={() => setSuccessMessage(null)}
            aria-label={t('dismissMessage')}
          >
            ✕
          </button>
        </div>
      )}

      {isCreatingPath && (
        <form onSubmit={handleCreatePath} className="curriculum-form-card">
          <h2>{t('createPathTitle')}</h2>
          <div className="form-group">
            <label htmlFor="path-name">{t('pathName')}</label>
            <input
              id="path-name"
              type="text"
              className="form-control"
              value={pathName}
              onChange={(e) => setPathName(e.target.value)}
              placeholder={t('pathNamePlaceholder')}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="path-program">{t('learningProgram')}</label>
            <select
              id="path-program"
              className="form-control"
              value={pathProgramId}
              onChange={(e) => setPathProgramId(e.target.value)}
              required
            >
              {tree?.programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} - {label(program.availabilityStatus)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="path-slug">{t('slug')}</label>
            <input
              id="path-slug"
              type="text"
              className="form-control"
              value={pathSlug}
              onChange={(e) => setPathSlug(e.target.value)}
              placeholder={t('slugPlaceholder')}
              required
            />
          </div>
          <div className="curriculum-actions">
            <button type="submit" className="action-button action-button-primary">{t('createPath')}</button>
            <button
              type="button"
              className="action-button action-button-secondary"
              onClick={() => setIsCreatingPath(false)}
            >{t('cancel')}</button>
          </div>
        </form>
      )}

      {/* Quick Jump Path Tabs */}
      {Boolean(tree && tree.paths.length > 0) && (
        <div className="curriculum-tabs-bar" role="tablist" aria-label={t('filterAllPaths')}>
          <button
            type="button"
            role="tab"
            aria-selected={selectedPathFilter === 'ALL'}
            className={`curriculum-tab ${selectedPathFilter === 'ALL' ? 'curriculum-tab-active' : ''}`}
            onClick={() => setSelectedPathFilter('ALL')}
          >
            <span>🌐 {t('filterAllPaths')}</span>
            <span className="curriculum-tab-count">{tree?.paths.length ?? 0}</span>
          </button>
          {tree?.paths.map((p) => {
            const missionCount = p.levels.reduce((acc, l) => acc + l.missions.length, 0);
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={selectedPathFilter === p.id}
                className={`curriculum-tab ${selectedPathFilter === p.id ? 'curriculum-tab-active' : ''}`}
                onClick={() => setSelectedPathFilter(p.id)}
              >
                <span>🗺️ {p.name}</span>
                <span className="curriculum-tab-count">{missionCount}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Scalable Navigation & Utility Toolbar */}
      {Boolean(tree && tree.paths.length > 0) && (
        <div className="curriculum-nav-toolbar">
          <div className="search-input-wrap">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchCurriculum')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label={t('clearSearch')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="toolbar-controls">
            <select
              className="toolbar-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label={t('filterStatus')}
            >
              <option value="ALL">{t('filterStatus')}: {t('filterAll')}</option>
              <option value="PUBLISHED">{label('PUBLISHED')}</option>
              <option value="DRAFT">{label('DRAFT')}</option>
              <option value="ARCHIVED">{label('ARCHIVED')}</option>
            </select>

            <button
              type="button"
              className={`toolbar-btn ${issuesOnlyFilter ? 'toolbar-btn-active' : ''}`}
              onClick={() => setIssuesOnlyFilter((prev) => !prev)}
            >
              ⚠️ {t('filterIssuesOnly')}
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isCompactView ? 'toolbar-btn-active' : ''}`}
              onClick={() => setIsCompactView((prev) => !prev)}
            >
              {isCompactView ? `📋 ${t('viewCompact')}` : `📑 ${t('viewDetailed')}`}
            </button>

            <div className="toolbar-separator" />

            <button
              type="button"
              className="toolbar-btn"
              onClick={handleCollapseAll}
            >
              <span aria-hidden="true">📁 </span>{t('collapseAll')}
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={handleExpandAll}
            >
              <span aria-hidden="true">📂 </span>{t('expandAll')}
            </button>
            <div className="toolbar-separator" />
            <button
              type="button"
              className={`toolbar-btn ${showTreeOverview ? 'toolbar-btn-active' : ''}`}
              onClick={() => setShowTreeOverview((prev) => !prev)}
              aria-expanded={showTreeOverview}
            >
              🌲 {t('treeOverview')}
            </button>
          </div>
        </div>
      )}

      {showTreeOverview && tree && tree.paths.length > 0 && (
        <section className="tree-overview-card" aria-label={t('treeOverviewTitle')}>
          <div className="tree-overview-header">
            <div className="tree-overview-title-group">
              <h3>🌲 {t('treeOverviewTitle')}</h3>
              <p>{t('treeOverviewHelp')}</p>
            </div>
            <div className="curriculum-actions">
              <button
                type="button"
                className="action-button action-button-secondary"
                onClick={handleCopyTree}
                style={{ fontSize: '0.8125rem' }}
              >
                {isCopied ? `✓ ${t('treeCopied')}` : `📋 ${t('copyTreeText')}`}
              </button>
            </div>
          </div>
          <div className="tree-overview-content" role="region" aria-label={t('treeOverviewTitle')}>
            <div className="tree-node-row" style={{ fontWeight: 700, color: 'var(--primary-fill)' }}>
              <span>📦 WorkLingo Curriculum</span>
            </div>
            {(() => {
              const programOrder: Record<string, number> = {
                beginner: 1,
                intermediate: 2,
                toeic: 3,
                ielts: 4,
              };
              const programsList = tree.programs && tree.programs.length > 0
                ? [...tree.programs].sort((a, b) => (programOrder[a.slug] ?? 99) - (programOrder[b.slug] ?? 99))
                : [];

              if (programsList.length === 0) {
                return tree.paths.map((path, pIdx) => {
                  const isLastPath = pIdx === tree.paths.length - 1;
                  const pBranch = isLastPath ? '└── ' : '├── ';

                  return (
                    <React.Fragment key={path.id}>
                      <div className="tree-node-row">
                        <span className="tree-branch-line">{pBranch}</span>
                        <button
                          type="button"
                          className="tree-node-btn"
                          onClick={() => handleJumpToNode(`path-${path.id}`, path.id)}
                          title={`${t('jumpTo')}: ${path.name}`}
                        >
                          <span>🗺️ <strong>{t('nodeTypePath')}:</strong> {path.name}</span>
                        </button>
                        <span className={`status-badge tree-badge-sm status-${path.status}`}>
                          {label(path.status)}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                });
              }

              return programsList.map((program, prIdx) => {
                const isLastProgram = prIdx === programsList.length - 1;
                const prBranch = isLastProgram ? '└── ' : '├── ';
                const prIndent = isLastProgram ? '    ' : '│   ';
                const programPaths = tree.paths.filter((p) => p.program.id === program.id);
                const programDisplayName = getProgramDisplayName(program);
                const statusClass = `status-program-${program.availabilityStatus.toLowerCase()}`;

                return (
                  <React.Fragment key={program.id}>
                    <div className="tree-node-row tree-program-row">
                      <span className="tree-branch-line">{prBranch}</span>
                      <span className="tree-program-title">
                        🎓 <strong>{t('nodeTypeProgram')}:</strong> {programDisplayName}
                      </span>
                      <span className={`status-badge tree-badge-sm ${statusClass}`}>
                        {label(program.availabilityStatus)}
                      </span>
                    </div>

                    {programPaths.length === 0 ? (
                      <div className="tree-node-row tree-node-empty">
                        <span className="tree-branch-line">{prIndent}└── </span>
                        <span className="tree-empty-text">💬 ({t('noPathsInProgram')})</span>
                      </div>
                    ) : (
                      programPaths.map((path, pIdx) => {
                        const isLastPath = pIdx === programPaths.length - 1;
                        const pBranch = isLastPath ? '└── ' : '├── ';
                        const pIndent = isLastPath ? '    ' : '│   ';

                        return (
                          <React.Fragment key={path.id}>
                            <div className="tree-node-row">
                              <span className="tree-branch-line">{prIndent}{pBranch}</span>
                              <button
                                type="button"
                                className="tree-node-btn"
                                onClick={() => handleJumpToNode(`path-${path.id}`, path.id)}
                                title={`${t('jumpTo')}: ${path.name}`}
                              >
                                <span>🗺️ <strong>{t('nodeTypePath')}:</strong> {path.name}</span>
                              </button>
                              <span className={`status-badge tree-badge-sm status-${path.status}`}>
                                {label(path.status)}
                              </span>
                            </div>

                            {path.levels.map((level, lIdx) => {
                              const isLastLevel = lIdx === path.levels.length - 1;
                              const lBranch = isLastLevel ? '└── ' : '├── ';
                              const lIndent = isLastLevel ? '    ' : '│   ';

                              return (
                                <React.Fragment key={level.id}>
                                  <div className="tree-node-row">
                                    <span className="tree-branch-line">{prIndent}{pIndent}{lBranch}</span>
                                    <button
                                      type="button"
                                      className="tree-node-btn"
                                      onClick={() => handleJumpToNode(`level-${level.id}`, path.id, level.id)}
                                      title={`${t('jumpTo')}: ${level.name}`}
                                    >
                                      <span>🏷️ <strong>{t('nodeTypeLevel')}:</strong> {level.name}</span>
                                    </button>
                                    <span className={`status-badge tree-badge-sm status-${level.status}`}>
                                      {label(level.status)}
                                    </span>
                                  </div>

                                  {level.missions.map((mission, mIdx) => {
                                    const isLastMission = mIdx === level.missions.length - 1;
                                    const mBranch = isLastMission ? '└── ' : '├── ';
                                    const mIndent = isLastMission ? '    ' : '│   ';

                                    return (
                                      <React.Fragment key={mission.id}>
                                        <div className="tree-node-row">
                                          <span className="tree-branch-line">{prIndent}{pIndent}{lIndent}{mBranch}</span>
                                          <button
                                            type="button"
                                            className="tree-node-btn"
                                            onClick={() => handleJumpToNode(`mission-${mission.id}`, path.id, level.id)}
                                            title={`${t('jumpTo')}: ${mission.title}`}
                                          >
                                            <span>🎯 <strong>{t('nodeTypeMission')}:</strong> {mission.title}</span>
                                          </button>
                                          <span className={`status-badge tree-badge-sm status-${mission.status}`}>
                                            {label(mission.status)}
                                          </span>
                                        </div>

                                        {mission.lessons.map((lesson, lsIdx) => {
                                          const isLastLesson = lsIdx === mission.lessons.length - 1;
                                          const lsBranch = isLastLesson ? '└── ' : '├── ';

                                          return (
                                            <div key={lesson.id} className="tree-node-row">
                                              <span className="tree-branch-line">{prIndent}{pIndent}{lIndent}{mIndent}{lsBranch}</span>
                                              <span>📖 {t('nodeTypeLesson')}: {lesson.title}</span>
                                              {lesson.hasAudio ? (
                                                <span className="status-badge tree-badge-sm status-PUBLISHED">
                                                  🎧 {t('nodeAudioReady')}
                                                </span>
                                              ) : (
                                                <span className="status-badge tree-badge-sm status-DRAFT">
                                                  ⏳ {t('nodeNoAudio')}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </React.Fragment>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        );
                      })
                    )}
                  </React.Fragment>
                );
              });
            })()}
          </div>
        </section>
      )}

      {activeFoundationMission ? <FoundationDefinitionEditor
        key={activeFoundationMission.id}
        missionId={activeFoundationMission.id}
        missionTitle={activeFoundationMission.title}
        prerequisiteOptions={prerequisiteOptions}
        onClose={() => setActiveFoundationMissionId(null)}
      /> : null}

      {filteredPaths.length === 0 && (
        <div className="curriculum-empty-hint" role="status">
          <p>{t('noSearchResults')}</p>
          {(searchQuery || statusFilter !== 'ALL' || issuesOnlyFilter || selectedPathFilter !== 'ALL') && (
            <button
              type="button"
              className="action-button action-button-secondary"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setIssuesOnlyFilter(false);
                setSelectedPathFilter('ALL');
              }}
            >
              {t('clearSearch')}
            </button>
          )}
        </div>
      )}

      <div className="curriculum-tree">
        {(() => {
          const renderPathCard = (path: AdminLearningPathItemDto) => {
            const isPathCollapsed = query ? false : collapsedPaths.has(path.id);
            const totalMissions = path.levels.reduce((acc, l) => acc + l.missions.length, 0);

            return (
            <section key={path.id} id={`path-${path.id}`} className="path-card" aria-label={t('pathRegion', { name: path.name })}>
              <div className="path-header">
                <div className="node-title-group">
                  <button
                    type="button"
                    className="collapse-toggle-btn"
                    onClick={() => togglePathCollapse(path.id)}
                    aria-expanded={!isPathCollapsed}
                    aria-label={isPathCollapsed ? t('expandPath', { name: path.name }) : t('collapsePath', { name: path.name })}
                  >
                    {isPathCollapsed ? '▶' : '▼'}
                  </button>
                  <h2
                    className="node-title"
                    onClick={() => togglePathCollapse(path.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {path.name}
                  </h2>
                  <span className="node-meta">({path.slug})</span>
                  <span className="program-label">
                    {t('program')} {path.program.name} ({label(path.program.availabilityStatus)})
                  </span>
                  <span className={`status-badge status-${path.status}`}>{label(path.status)}</span>
                  <span className="node-meta">{t('revisionShort', { count: path.revision })}</span>
                  {path.archiveBlockers.length > 0 && (
                    <span className="blocker-tag">
                      {t('archiveBlockers')} {path.archiveBlockers.map(label).join(', ')}
                    </span>
                  )}
                  {isPathCollapsed && (
                    <span className="node-meta collapse-summary">
                      {t('levelCountSummary', { count: path.levels.length })} · {t('missionCountSummary', { count: totalMissions })}
                    </span>
                  )}
                </div>
                <div className="curriculum-actions">
                  {path.status !== 'PUBLISHED' && (
                    <button
                      type="button"
                      className="action-button action-button-primary"
                      onClick={() => handlePublishPath(path)}
                      aria-label={t('publishPathAria', { name: path.name })}
                    >{t('publishPath')}</button>
                  )}
                  {path.status !== 'ARCHIVED' && (
                    <button
                      type="button"
                      className="action-button action-button-danger"
                      onClick={() => handleArchivePath(path)}
                      disabled={path.archiveBlockers.length > 0}
                      aria-label={t('archivePathAria', { name: path.name })}
                    >{t('archivePath')}</button>
                  )}
                  <button
                    type="button"
                    className="action-button action-button-secondary"
                    onClick={() =>
                      setActiveLevelFormPathId(
                        activeLevelFormPathId === path.id ? null : path.id,
                      )
                    }
                  >
                    {activeLevelFormPathId === path.id ? t('cancelLevel') : t('addLevel')}
                  </button>
                </div>
              </div>

              {!isPathCollapsed && (
                <>
                  {activeLevelFormPathId === path.id && (
                    <form
                      onSubmit={(e) => handleCreateLevel(path.id, e)}
                      className="curriculum-form-card"
                      style={{ margin: '1rem 1.25rem' }}
                    >
                      <h3>{t('addLevelTitle', { name: path.name })}</h3>
                      <div className="form-group">
                        <label htmlFor="level-code">{t('levelCode')}</label>
                        <input
                          id="level-code"
                          type="text"
                          className="form-control"
                          value={levelCode}
                          onChange={(e) => setLevelCode(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="level-name">{t('levelName')}</label>
                        <input
                          id="level-name"
                          type="text"
                          className="form-control"
                          value={levelName}
                          onChange={(e) => setLevelName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="level-cefr">{t('cefrReference')}</label>
                        <input
                          id="level-cefr"
                          type="text"
                          className="form-control"
                          value={levelCefr}
                          onChange={(e) => setLevelCefr(e.target.value)}
                          required
                        />
                      </div>
                      <div className="curriculum-actions">
                        <button type="submit" className="action-button action-button-primary">{t('createLevel')}</button>
                        <button
                          type="button"
                          className="action-button action-button-secondary"
                          onClick={() => setActiveLevelFormPathId(null)}
                        >{t('cancel')}</button>
                      </div>
                    </form>
                  )}

                  <div className="levels-container">
                    {path.levels.length === 0 && (
                      <div className="curriculum-empty-hint">
                        {locale === 'vi'
                          ? 'Chưa có cấp độ nào trong lộ trình này. Nhấn "+ Thêm cấp độ" để bắt đầu.'
                          : 'No levels configured in this path yet. Click "+ Add Level" to start.'}
                      </div>
                    )}
                    {path.levels.map((level, levelIndex) => {
                      const isLevelCollapsed = query ? false : collapsedLevels.has(level.id);
                      const totalLessons = level.missions.reduce((acc, m) => acc + m.lessons.length, 0);

                      return (
                        <div key={level.id} id={`level-${level.id}`} className="level-card">
                          <div className="level-header">
                            <div className="node-title-group">
                              <button
                                type="button"
                                className="collapse-toggle-btn"
                                onClick={() => toggleLevelCollapse(level.id)}
                                aria-expanded={!isLevelCollapsed}
                                aria-label={isLevelCollapsed ? t('expandLevel', { name: level.name }) : t('collapseLevel', { name: level.name })}
                              >
                                {isLevelCollapsed ? '▶' : '▼'}
                              </button>
                              <h3
                                className="node-title"
                                onClick={() => toggleLevelCollapse(level.id)}
                                style={{ cursor: 'pointer' }}
                              >
                                {level.name} ({level.code})
                              </h3>
                              <span className="node-meta" translate="no">CEFR {level.cefrReference}</span>
                              <span className={`status-badge status-${level.status}`}>{label(level.status)}</span>
                              <span className="node-meta">{t('revisionShort', { count: level.revision })}</span>
                              {!level.isPlayable && level.playabilityReasons.length > 0 && (
                                <span className="playability-tag">
                                  {level.playabilityReasons.map(label).join(', ')}
                                </span>
                              )}
                              {level.archiveBlockers.length > 0 && (
                                <span className="blocker-tag">
                                  {t('archiveBlockers')} {level.archiveBlockers.map(label).join(', ')}
                                </span>
                              )}
                              {isLevelCollapsed && (
                                <span className="node-meta collapse-summary">
                                  {t('missionCountSummary', { count: level.missions.length })} · {t('lessonCountSummary', { count: totalLessons })}
                                </span>
                              )}
                            </div>
                            <div className="curriculum-actions">
                              <button
                                type="button"
                                className="action-button-icon"
                                onClick={() => handleReorderLevel(path.id, path.levels, levelIndex, 'up')}
                                disabled={levelIndex === 0}
                                aria-label={t('levelUp', { name: level.name })}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                className="action-button-icon"
                                onClick={() =>
                                  handleReorderLevel(path.id, path.levels, levelIndex, 'down')
                                }
                                disabled={levelIndex === path.levels.length - 1}
                                aria-label={t('levelDown', { name: level.name })}
                              >
                                ▼
                              </button>
                              {level.status !== 'PUBLISHED' && (
                                <button
                                  type="button"
                                  className="action-button action-button-primary"
                                  onClick={() => handlePublishLevel(level)}
                                  aria-label={t('publishLevelAria', { name: level.name })}
                                >{t('publish')}</button>
                              )}
                              {level.status !== 'ARCHIVED' && (
                                <button
                                  type="button"
                                  className="action-button action-button-danger"
                                  onClick={() => handleArchiveLevel(level)}
                                  disabled={level.archiveBlockers.length > 0}
                                  aria-label={t('archiveLevelAria', { name: level.name })}
                                >{t('archive')}</button>
                              )}
                              <button
                                type="button"
                                className="action-button action-button-secondary"
                                onClick={() =>
                                  setActiveMissionFormLevelId(
                                    activeMissionFormLevelId === level.id ? null : level.id,
                                  )
                                }
                              >
                                {activeMissionFormLevelId === level.id
                                  ? t('cancelMission')
                                  : t('addMission')}
                              </button>
                            </div>
                          </div>

                          {!isLevelCollapsed && (
                            <>
                              {activeMissionFormLevelId === level.id && (
                                <form
                                  onSubmit={(e) => handleCreateMission(level.id, e)}
                                  className="curriculum-form-card"
                                >
                                  <h4>{t('addMissionTitle', { name: level.name })}</h4>
                                  <div className="form-group">
                                    <label htmlFor="mission-title">{t('missionTitle')}</label>
                                    <input
                                      id="mission-title"
                                      type="text"
                                      className="form-control"
                                      value={missionTitle}
                                      onChange={(e) => setMissionTitle(e.target.value)}
                                      required
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label htmlFor="mission-slug">{t('slug')}</label>
                                    <input
                                      id="mission-slug"
                                      type="text"
                                      className="form-control"
                                      value={missionSlug}
                                      onChange={(e) => setMissionSlug(e.target.value)}
                                      required
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label htmlFor="mission-objective">{t('objective')}</label>
                                    <textarea
                                      id="mission-objective"
                                      className="form-control"
                                      rows={2}
                                      value={missionObjective}
                                      onChange={(e) => setMissionObjective(e.target.value)}
                                      required
                                    />
                                  </div>
                                  <div className="curriculum-actions">
                                    <button type="submit" className="action-button action-button-primary">{t('createMission')}</button>
                                    <button
                                      type="button"
                                      className="action-button action-button-secondary"
                                      onClick={() => setActiveMissionFormLevelId(null)}
                                    >{t('cancel')}</button>
                                  </div>
                                </form>
                              )}

                              <div className="missions-container">
                                {level.missions.length === 0 && (
                                  <div className="curriculum-empty-hint">
                                    {locale === 'vi'
                                      ? 'Chưa có nhiệm vụ nào trong cấp độ này. Nhấn "+ Thêm nhiệm vụ" để bắt đầu.'
                                      : 'No missions in this level yet. Click "+ Add Mission" to start.'}
                                  </div>
                                )}
                                {level.missions.map((mission, missionIndex) => (
                                  <div key={mission.id} id={`mission-${mission.id}`} className="mission-card">
                                    <div className="mission-header">
                                      <div className="node-title-group">
                                        <h4 className="node-title">{mission.title}</h4>
                                        <span className="node-meta">({mission.slug})</span>
                                        <span className={`status-badge status-${mission.status}`}>
                                          {label(mission.status)}
                                        </span>
                                        <span className="node-meta">{t('revisionShort', { count: mission.revision })}</span>
                                        {!mission.isPlayable && mission.playabilityReasons.length > 0 && (
                                          <span className="playability-tag">
                                            {mission.playabilityReasons.map(label).join(', ')}
                                          </span>
                                        )}
                                        {mission.archiveBlockers.length > 0 && (
                                          <span className="blocker-tag">
                                            {t('archiveBlockers')} {mission.archiveBlockers.map(label).join(', ')}
                                          </span>
                                        )}
                                      </div>
                                      <div className="curriculum-actions">
                                        <button
                                          type="button"
                                          className="action-button action-button-secondary foundation-editor-toggle"
                                          disabled={isOpeningFoundation}
                                          onClick={() => void handleOpenFoundation(mission)}
                                          aria-label={t('editFoundation', { name: mission.title })}
                                        >{t('foundation')}</button>
                                        <button
                                          type="button"
                                          className="action-button-icon"
                                          onClick={() =>
                                            handleReorderMission(
                                              level.id,
                                              level.missions,
                                              missionIndex,
                                              'up',
                                            )
                                          }
                                          disabled={missionIndex === 0}
                                          aria-label={t('missionUp', { name: mission.title })}
                                        >
                                          ▲
                                        </button>
                                        <button
                                          type="button"
                                          className="action-button-icon"
                                          onClick={() =>
                                            handleReorderMission(
                                              level.id,
                                              level.missions,
                                              missionIndex,
                                              'down',
                                            )
                                          }
                                          disabled={missionIndex === level.missions.length - 1}
                                          aria-label={t('missionDown', { name: mission.title })}
                                        >
                                          ▼
                                        </button>
                                        {mission.status !== 'PUBLISHED' && (
                                          <button
                                            type="button"
                                            className="action-button action-button-primary"
                                            onClick={() => handlePublishMission(mission)}
                                            aria-label={t('publishMissionAria', { name: mission.title })}
                                          >{t('publish')}</button>
                                        )}
                                        {mission.status !== 'ARCHIVED' && (
                                          <button
                                            type="button"
                                            className="action-button action-button-danger"
                                            onClick={() => handleArchiveMission(mission)}
                                            disabled={mission.archiveBlockers.length > 0}
                                            aria-label={t('archiveMissionAria', { name: mission.title })}
                                          >{t('archive')}</button>
                                        )}
                                      </div>
                                    </div>

                                    {!isCompactView && mission.lessons.length > 0 && (
                                      <ul className="lessons-list">
                                        {mission.lessons.map((lesson) => (
                                          <li key={lesson.id} className="lesson-item">
                                            <span>
                                              {lesson.title ?? lesson.slug} (<code>v{lesson.currentPublishedVersionNumber !== null ? number(lesson.currentPublishedVersionNumber) : '-'}</code>)
                                            </span>
                                            <span className="node-meta">
                                              {lesson.hasAudio ? t('audioReady') : t('noAudio')}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}

                                    {isCompactView && mission.lessons.length > 0 && (
                                      <div className="compact-lessons-chip">
                                        <span>📖 {t('lessonCountSummary', { count: mission.lessons.length })}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          );
        };

        const programOrder: Record<string, number> = {
          beginner: 1,
          intermediate: 2,
          toeic: 3,
          ielts: 4,
        };
        const programsList = tree?.programs && tree.programs.length > 0
          ? [...tree.programs].sort((a, b) => (programOrder[a.slug] ?? 99) - (programOrder[b.slug] ?? 99))
          : [];

        if (programsList.length === 0) {
          return filteredPaths.map(renderPathCard);
        }

        const isFiltering = Boolean(query || statusFilter !== 'ALL' || issuesOnlyFilter || selectedPathFilter !== 'ALL');
        const visiblePrograms = isFiltering
          ? programsList.filter((program) => filteredPaths.some((p) => p.program.id === program.id))
          : programsList;

        const orphanedPaths = filteredPaths.filter(
          (p) => !programsList.some((pr) => pr.id === p.program.id)
        );

        return (
          <>
            {visiblePrograms.map((program) => {
              const isProgramCollapsed = query ? false : collapsedPrograms.has(program.id);
              const programPaths = filteredPaths.filter((p) => p.program.id === program.id);
              const programDisplayName = getProgramDisplayName(program);
              const statusClass = `status-program-${program.availabilityStatus.toLowerCase()}`;
              const totalLevels = programPaths.reduce((acc, p) => acc + p.levels.length, 0);

              return (
                <div
                  key={program.id}
                  id={`program-${program.id}`}
                  className="program-folder"
                  aria-label={t('programFolderRegion', { name: programDisplayName })}
                >
                  <div className="program-folder-header">
                    <div className="program-folder-title-group">
                      <button
                        type="button"
                        className="collapse-toggle-btn"
                        onClick={() => toggleProgramCollapse(program.id)}
                        aria-expanded={!isProgramCollapsed}
                        aria-label={
                          isProgramCollapsed
                            ? t('expandProgram', { name: programDisplayName })
                            : t('collapseProgram', { name: programDisplayName })
                        }
                      >
                        {isProgramCollapsed ? '▶' : '▼'}
                      </button>
                      <h2
                        className="program-folder-title"
                        onClick={() => toggleProgramCollapse(program.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        🎓 {t('nodeTypeProgram')} — {programDisplayName}
                      </h2>
                      <span className={`status-badge ${statusClass}`}>
                        {label(program.availabilityStatus)}
                      </span>
                      <span className="node-meta">
                        {t('pathCountSummary', { count: programPaths.length })} · {t('levelCountSummary', { count: totalLevels })}
                      </span>
                    </div>
                    <div className="curriculum-actions">
                      <button
                        type="button"
                        className="action-button action-button-secondary"
                        onClick={() => {
                          setPathProgramId(program.id);
                          setIsCreatingPath(true);
                        }}
                        style={{ fontSize: '0.8125rem' }}
                      >
                        + {t('addPath')}
                      </button>
                    </div>
                  </div>

                  {!isProgramCollapsed && (
                    <div className="program-folder-content">
                      {programPaths.length === 0 ? (
                        <div className="curriculum-empty-hint" style={{ margin: 0, padding: '1.25rem' }}>
                          <p>💬 {t('noPathsInProgramHint')}</p>
                          <button
                            type="button"
                            className="action-button action-button-primary"
                            onClick={() => {
                              setPathProgramId(program.id);
                              setIsCreatingPath(true);
                            }}
                            style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}
                          >
                            + {t('addFirstPath')}
                          </button>
                        </div>
                      ) : (
                        <div className="program-paths-list">
                          {programPaths.map(renderPathCard)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {orphanedPaths.length > 0 && (
              <div className="program-folder" aria-label={t('otherPrograms')}>
                <div className="program-folder-header">
                  <div className="program-folder-title-group">
                    <h2 className="program-folder-title">📂 {t('otherPrograms')}</h2>
                  </div>
                </div>
                <div className="program-folder-content">
                  <div className="program-paths-list">
                    {orphanedPaths.map(renderPathCard)}
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
    </div>
  );
}
