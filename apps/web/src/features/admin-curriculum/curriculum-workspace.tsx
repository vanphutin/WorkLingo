'use client';

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

export function CurriculumWorkspace() {
  const { t, number, label, message: displayMessage } = useAdminCurriculum();
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

  const handleOpenFoundation = async (mission: AdminMissionItemDto) => {
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

  if (isLoading && !tree) {
    return (
      <div className="curriculum-container" role="status">
        <p>{t('loadingTree')}</p>
      </div>
    );
  }

  return (
    <div className="curriculum-container">
      <header className="curriculum-header">
        <div>
          <h1>{t('title')}</h1>
          <p className="node-meta">{t('help')}</p>
        </div>
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
      </header>

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

      <div className="curriculum-tree">
        {tree?.paths.map((path) => (
          <section key={path.id} className="path-card" aria-label={t('pathRegion', { name: path.name })}>
            <div className="path-header">
              <div className="node-title-group">
                <h2 className="node-title">{path.name}</h2>
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
              {path.levels.map((level, levelIndex) => (
                <div key={level.id} className="level-card">
                  <div className="level-header">
                    <div className="node-title-group">
                      <h3 className="node-title">
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
                    {level.missions.map((mission, missionIndex) => (
                      <div key={mission.id} className="mission-card">
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
                              className="action-button action-button-secondary"
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

                        {activeFoundationMissionId === mission.id ? (
                          <FoundationDefinitionEditor
                            missionId={mission.id}
                            missionTitle={mission.title}
                            prerequisiteOptions={prerequisiteOptions}
                            onClose={() => setActiveFoundationMissionId(null)}
                          />
                        ) : null}

                        {mission.lessons.length > 0 && (
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
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
