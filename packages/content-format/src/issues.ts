import type { SourceRange } from './source-location.ts';

export type ContentIssueSeverity = 'error' | 'warning';

export type ContentIssue = {
  readonly code: string;
  readonly severity: ContentIssueSeverity;
  readonly message: string;
  readonly path?: string | undefined;
  readonly range: SourceRange;
  readonly suggestion?: string | undefined;
};
