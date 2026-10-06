import type { NestExpressApplication } from '@nestjs/platform-express';

// A 500,000-character lesson source can exceed the default 100 KB JSON limit,
// especially when text contains escaped Unicode characters.
export function configureContentSourceBodyParser(app: NestExpressApplication): void {
  app.useBodyParser('json', { limit: '4mb' });
}
