'use client';

import React, { useEffect, useState } from 'react';
import type {
  AdminCurriculumTreeDto,
  AdminLearningPathItemDto,
  AdminLevelItemDto,
  AdminMissionItemDto,
} from '@worklingo/contracts';

import { adminCurriculumClient } from '../../lib/api/admin-curriculum-client';
import './curriculum.css';

export function CurriculumWorkspace() {
  const [tree, setTree] = useState<AdminCurriculumTreeDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forms state
  const [isCreatingPath, setIsCreatingPath] = useState(false);
  const [pathName, setPathName] = useState('');
  const [pathSlug, setPathSlug] = useState('');

  const [activeLevelFormPathId, setActiveLevelFormPathId] = useState<string | null>(null);
  const [levelCode, setLevelCode] = useState('');
  const [levelName, setLevelName] = useState('');
  const [levelCefr, setLevelCefr] = useState('');

  const [activeMissionFormLevelId, setActiveMissionFormLevelId] = useState<string | null>(null);
  const [missionTitle, setMissionTitle] = useState('');
  const [missionSlug, setMissionSlug] = useState('');
  const [missionObjective, setMissionObjective] = useState('');

  const loadTree = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await adminCurriculumClient.getTree();
      setTree(data);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to load curriculum tree',
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
        slug: pathSlug.trim(),
      });
      setSuccessMessage(`Path "${pathName}" created successfully.`);
      setIsCreatingPath(false);
      setPathName('');
      setPathSlug('');
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to create learning path',
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
      setSuccessMessage(`Path "${path.name}" published successfully.`);
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to publish path',
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
      setSuccessMessage(`Path "${path.name}" archived successfully.`);
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to archive path',
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
      setSuccessMessage(`Level "${levelName}" created successfully.`);
      setActiveLevelFormPathId(null);
      setLevelCode('');
      setLevelName('');
      setLevelCefr('');
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to create level',
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
      setSuccessMessage(`Level "${level.name}" published successfully.`);
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to publish level',
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
      setSuccessMessage(`Level "${level.name}" archived successfully.`);
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to archive level',
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
        err instanceof Error ? err.message : 'Failed to reorder levels',
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
      setSuccessMessage(`Mission "${missionTitle}" created successfully.`);
      setActiveMissionFormLevelId(null);
      setMissionTitle('');
      setMissionSlug('');
      setMissionObjective('');
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to create mission',
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
      setSuccessMessage(`Mission "${mission.title}" published successfully.`);
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to publish mission',
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
      setSuccessMessage(`Mission "${mission.title}" archived successfully.`);
      await loadTree();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to archive mission',
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
        err instanceof Error ? err.message : 'Failed to reorder missions',
      );
    }
  };

  if (isLoading && !tree) {
    return (
      <div className="curriculum-container" role="status">
        <p>Loading curriculum tree…</p>
      </div>
    );
  }

  return (
    <div className="curriculum-container">
      <header className="curriculum-header">
        <div>
          <h1>Curriculum Management</h1>
          <p className="node-meta">
            Manage learning paths, CEFR levels, and published missions with playability rules.
          </p>
        </div>
        <div className="curriculum-actions">
          <button
            type="button"
            className="action-button action-button-secondary"
            onClick={loadTree}
          >
            Refresh Tree
          </button>
          <button
            type="button"
            className="action-button action-button-primary"
            onClick={() => setIsCreatingPath((prev) => !prev)}
          >
            {isCreatingPath ? 'Cancel New Path' : '+ New Path'}
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="curriculum-alert curriculum-alert-error" role="alert">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="action-button-icon"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="curriculum-alert curriculum-alert-success" role="status">
          <span>{successMessage}</span>
          <button
            type="button"
            className="action-button-icon"
            onClick={() => setSuccessMessage(null)}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {isCreatingPath && (
        <form onSubmit={handleCreatePath} className="curriculum-form-card">
          <h2>Create Learning Path</h2>
          <div className="form-group">
            <label htmlFor="path-name">Path Name</label>
            <input
              id="path-name"
              type="text"
              className="form-control"
              value={pathName}
              onChange={(e) => setPathName(e.target.value)}
              placeholder="e.g. General English"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="path-slug">Slug</label>
            <input
              id="path-slug"
              type="text"
              className="form-control"
              value={pathSlug}
              onChange={(e) => setPathSlug(e.target.value)}
              placeholder="e.g. general-english"
              required
            />
          </div>
          <div className="curriculum-actions">
            <button type="submit" className="action-button action-button-primary">
              Create Path
            </button>
            <button
              type="button"
              className="action-button action-button-secondary"
              onClick={() => setIsCreatingPath(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="curriculum-tree">
        {tree?.paths.map((path) => (
          <section key={path.id} className="path-card" aria-label={`Learning Path ${path.name}`}>
            <div className="path-header">
              <div className="node-title-group">
                <h2 className="node-title">{path.name}</h2>
                <span className="node-meta">({path.slug})</span>
                <span className={`status-badge status-${path.status}`}>{path.status}</span>
                <span className="node-meta">rev {path.revision}</span>
                {path.archiveBlockers.length > 0 && (
                  <span className="blocker-tag">
                    Archive Blockers: {path.archiveBlockers.join(', ')}
                  </span>
                )}
              </div>
              <div className="curriculum-actions">
                {path.status !== 'PUBLISHED' && (
                  <button
                    type="button"
                    className="action-button action-button-primary"
                    onClick={() => handlePublishPath(path)}
                    aria-label={`Publish Path ${path.name}`}
                  >
                    Publish Path
                  </button>
                )}
                {path.status !== 'ARCHIVED' && (
                  <button
                    type="button"
                    className="action-button action-button-danger"
                    onClick={() => handleArchivePath(path)}
                    disabled={path.archiveBlockers.length > 0}
                    aria-label={`Archive Path ${path.name}`}
                  >
                    Archive Path
                  </button>
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
                  {activeLevelFormPathId === path.id ? 'Cancel Level' : '+ Add Level'}
                </button>
              </div>
            </div>

            {activeLevelFormPathId === path.id && (
              <form
                onSubmit={(e) => handleCreateLevel(path.id, e)}
                className="curriculum-form-card"
                style={{ margin: '1rem 1.25rem' }}
              >
                <h3>Add Level to {path.name}</h3>
                <div className="form-group">
                  <label htmlFor="level-code">Level Code (e.g. BEG_1)</label>
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
                  <label htmlFor="level-name">Level Name</label>
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
                  <label htmlFor="level-cefr">CEFR Reference (e.g. A1)</label>
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
                  <button type="submit" className="action-button action-button-primary">
                    Create Level
                  </button>
                  <button
                    type="button"
                    className="action-button action-button-secondary"
                    onClick={() => setActiveLevelFormPathId(null)}
                  >
                    Cancel
                  </button>
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
                      <span className="node-meta">CEFR {level.cefrReference}</span>
                      <span className={`status-badge status-${level.status}`}>{level.status}</span>
                      <span className="node-meta">rev {level.revision}</span>
                      {!level.isPlayable && level.playabilityReasons.length > 0 && (
                        <span className="playability-tag">
                          {level.playabilityReasons.join(', ')}
                        </span>
                      )}
                      {level.archiveBlockers.length > 0 && (
                        <span className="blocker-tag">
                          Archive Blockers: {level.archiveBlockers.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="curriculum-actions">
                      <button
                        type="button"
                        className="action-button-icon"
                        onClick={() => handleReorderLevel(path.id, path.levels, levelIndex, 'up')}
                        disabled={levelIndex === 0}
                        aria-label={`Move level ${level.name} up`}
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
                        aria-label={`Move level ${level.name} down`}
                      >
                        ▼
                      </button>
                      {level.status !== 'PUBLISHED' && (
                        <button
                          type="button"
                          className="action-button action-button-primary"
                          onClick={() => handlePublishLevel(level)}
                          aria-label={`Publish Level ${level.name}`}
                        >
                          Publish
                        </button>
                      )}
                      {level.status !== 'ARCHIVED' && (
                        <button
                          type="button"
                          className="action-button action-button-danger"
                          onClick={() => handleArchiveLevel(level)}
                          disabled={level.archiveBlockers.length > 0}
                          aria-label={`Archive Level ${level.name}`}
                        >
                          Archive
                        </button>
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
                          ? 'Cancel Mission'
                          : '+ Add Mission'}
                      </button>
                    </div>
                  </div>

                  {activeMissionFormLevelId === level.id && (
                    <form
                      onSubmit={(e) => handleCreateMission(level.id, e)}
                      className="curriculum-form-card"
                    >
                      <h4>Add Mission to {level.name}</h4>
                      <div className="form-group">
                        <label htmlFor="mission-title">Mission Title</label>
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
                        <label htmlFor="mission-slug">Slug</label>
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
                        <label htmlFor="mission-objective">Objective</label>
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
                        <button type="submit" className="action-button action-button-primary">
                          Create Mission
                        </button>
                        <button
                          type="button"
                          className="action-button action-button-secondary"
                          onClick={() => setActiveMissionFormLevelId(null)}
                        >
                          Cancel
                        </button>
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
                              {mission.status}
                            </span>
                            <span className="node-meta">rev {mission.revision}</span>
                            {!mission.isPlayable && mission.playabilityReasons.length > 0 && (
                              <span className="playability-tag">
                                {mission.playabilityReasons.join(', ')}
                              </span>
                            )}
                            {mission.archiveBlockers.length > 0 && (
                              <span className="blocker-tag">
                                Archive Blockers: {mission.archiveBlockers.join(', ')}
                              </span>
                            )}
                          </div>
                          <div className="curriculum-actions">
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
                              aria-label={`Move mission ${mission.title} up`}
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
                              aria-label={`Move mission ${mission.title} down`}
                            >
                              ▼
                            </button>
                            {mission.status !== 'PUBLISHED' && (
                              <button
                                type="button"
                                className="action-button action-button-primary"
                                onClick={() => handlePublishMission(mission)}
                                aria-label={`Publish Mission ${mission.title}`}
                              >
                                Publish
                              </button>
                            )}
                            {mission.status !== 'ARCHIVED' && (
                              <button
                                type="button"
                                className="action-button action-button-danger"
                                onClick={() => handleArchiveMission(mission)}
                                disabled={mission.archiveBlockers.length > 0}
                                aria-label={`Archive Mission ${mission.title}`}
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </div>

                        {mission.lessons.length > 0 && (
                          <ul className="lessons-list">
                            {mission.lessons.map((lesson) => (
                              <li key={lesson.id} className="lesson-item">
                                <span>
                                  {lesson.title ?? lesson.slug} (v
                                  {lesson.currentPublishedVersionNumber ?? '-'})
                                </span>
                                <span className="node-meta">
                                  {lesson.hasAudio ? '🎧 Audio ready' : '⚠️ No audio'}
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
