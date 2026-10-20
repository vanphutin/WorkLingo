import { z } from 'zod';

export interface TopicJsonDiagnostic { path: string; message: string; singleLine?: boolean; line?: number; column?: number; offset?: number }
export function topicJsonDiagnostics(error: unknown, source: string): TopicJsonDiagnostic[] {
  if (error instanceof z.ZodError) return error.issues.slice(0, 10).map(issue => ({
    path: issue.path.reduce<string>((path, part) => typeof part === 'number' ? `${path}[${part}]` : `${path}${path ? '.' : ''}${String(part)}`, '') || '$',
    message: issue.message, singleLine: issue.message === 'Use a single line; replace line breaks with spaces.',
  }));
  const message = error instanceof Error ? error.message : 'Invalid JSON.';
  let offset: number | undefined;
  const position = /position\s+(\d+)/iu.exec(message);
  const location = /line\s+(\d+)\s+column\s+(\d+)/iu.exec(message);
  if (position) offset = Number(position[1]);
  else if (location) offset = source.split('\n').slice(0, Number(location[1]) - 1).reduce((size, line) => size + line.length + 1, 0) + Number(location[2]) - 1;
  else if (/end|unterminated/iu.test(message)) offset = source.length;
  if (offset === undefined) return [{ path: '$', message }];
  offset = Math.max(0, Math.min(source.length, offset));
  const lines = source.slice(0, offset).split('\n');
  return [{ path: '$', message, offset, line: lines.length, column: lines.at(-1)!.length + 1 }];
}
