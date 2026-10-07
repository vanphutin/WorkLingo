import type { LearningSkill } from '../../lib/api/api-client';

export const SKILLS: readonly LearningSkill[] = ['reading', 'listening', 'speaking', 'writing'];
export const skillLabels: Record<LearningSkill, string> = {
  reading: 'Reading', listening: 'Listening', speaking: 'Speaking', writing: 'Writing',
};
const evidenceLabels: Record<string, string> = {
  NEW: 'New', LEARNING: 'Learning', REVIEW_DUE: 'Review due', STABLE: 'Stable',
  NEEDS_ATTENTION: 'Needs attention', OVERDUE: 'Overdue', DUE: 'Due', UPCOMING: 'Upcoming',
};
export function evidenceLabel(value: string): string {
  return evidenceLabels[value] ?? 'Review recommended';
}
export function percent(score: number): string {
  return `${Math.round(score * 100)}%`;
}
export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}
export function formatLevel(code: string): string {
  return code.toLowerCase().split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
