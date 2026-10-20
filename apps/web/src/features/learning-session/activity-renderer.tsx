'use client';

import { useT } from '../../i18n/provider';
import { learningSessionMessages } from '../../i18n/messages/learningSession';

import React from 'react';

import type { LearnerActivityDto, RecordingSubmissionResult, SubmitRecordingInput } from '../../lib/api/api-client';
import { ListeningActivity, type ListeningResponseValue } from './activity-renderers/listening-activity';
import { ReadingActivity, type ReadingResponseValue } from './activity-renderers/reading-activity';
import { SpeakingActivity } from './activity-renderers/speaking-activity';
import { WritingActivity } from './activity-renderers/writing-activity';
import { ActivityWorkspace, type ActivityWorkspaceTools } from './activity-workspace';

export type ActivityResponseState =
  | ReadingResponseValue
  | ListeningResponseValue
  | string;

interface ActivityRendererProps {
  readonly activity: LearnerActivityDto;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly savedResponse?: unknown;
  readonly disabled?: boolean;
  readonly sessionId: string;
  readonly tools?: ActivityWorkspaceTools;
  readonly onSubmitRecording?: (input: SubmitRecordingInput) => Promise<RecordingSubmissionResult>;
}

export function isActivityComplete(activity: LearnerActivityDto, value: unknown): boolean {
  switch (activity.activityType) {
    case 'reading': {
      const questions =
        (activity.payload.questions as Array<{ options?: readonly unknown[] }>) ?? [];
      const readingVal = value as ReadingResponseValue | undefined;
      if (!readingVal || !Array.isArray(readingVal.answerIndexes)) return false;
      if (questions.length === 0) return true;
      return (
        readingVal.answerIndexes.length === questions.length &&
        questions.every((question, index) => {
          const answerIndex = readingVal.answerIndexes[index];
          return (
            typeof answerIndex === 'number' &&
            Number.isInteger(answerIndex) &&
            answerIndex >= 0 &&
            answerIndex < (question.options?.length ?? 0)
          );
        })
      );
    }
    case 'listening': {
      const questions =
        (activity.payload.questions as Array<{ options?: readonly unknown[] }>) ?? [];
      const listenVal = value as ListeningResponseValue | undefined;
      if (!listenVal || !Array.isArray(listenVal.answerIndexes)) return false;
      if (questions.length === 0) return true;
      return (
        listenVal.answerIndexes.length === questions.length &&
        questions.every((question, index) => {
          const answerIndex = listenVal.answerIndexes[index];
          return (
            typeof answerIndex === 'number' &&
            Number.isInteger(answerIndex) &&
            answerIndex >= 0 &&
            answerIndex < (question.options?.length ?? 0)
          );
        })
      );
    }
    case 'speaking': {
      return typeof value === 'string' && value.trim().length > 0;
    }
    case 'writing': {
      return typeof value === 'string' && value.trim().length > 0;
    }
    default: {
      const _exhaustiveCheck: never = activity.activityType;
      return false;
    }
  }
}

export function ActivityRenderer({
  activity,
  value,
  onChange,
  disabled = false,
  sessionId,
  onSubmitRecording,
  tools,
}: ActivityRendererProps) {
  const t = useT('learningSession', learningSessionMessages);
  let response: React.ReactNode;
  switch (activity.activityType) {
    case 'reading': {
      const readingValue: ReadingResponseValue =
        value && typeof value === 'object' && 'answerIndexes' in value
          ? (value as ReadingResponseValue)
          : { answerIndexes: [] };

      response = (
        <ReadingActivity
          activity={activity}
          value={readingValue}
          onChange={onChange}
          disabled={disabled}
        />
      );
      break;
    }
    case 'listening': {
      const listeningValue: ListeningResponseValue =
        value && typeof value === 'object' && 'answerIndexes' in value
          ? (value as ListeningResponseValue)
          : { answerIndexes: [] };

      return (
        <ListeningActivity
          {...(tools ? { tools } : {})}
          activity={activity}
          sessionId={sessionId}
          value={listeningValue}
          onChange={onChange}
          disabled={disabled}
        />
      );
    }
    case 'speaking': {
      const speakingValue = typeof value === 'string' ? value : '';
      response = (
        <SpeakingActivity
          activity={activity}
          sessionId={sessionId}
          onSubmitRecording={onSubmitRecording ?? (async () => {
            throw new Error(t('recordingNotConfigured'));
          })}
          value={speakingValue}
          onChange={onChange}
          disabled={disabled}
        />
      );
      break;
    }
    case 'writing': {
      const writingValue = typeof value === 'string' ? value : '';
      response = (
        <WritingActivity
          activity={activity}
          value={writingValue}
          onChange={onChange}
          disabled={disabled}
          sessionId={sessionId}
        />
      );
      break;
    }
    default: {
      const _exhaustiveCheck: never = activity.activityType;
      throw new Error(`Unhandled activity type: ${_exhaustiveCheck}`);
    }
  }
  return <ActivityWorkspace activity={activity} {...(tools ? { tools } : {})}>{response}</ActivityWorkspace>;
}
