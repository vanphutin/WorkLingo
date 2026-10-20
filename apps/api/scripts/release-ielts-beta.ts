import { releaseLocalBeta } from '../src/ielts-beta-release/release.js';

process.env.JOB_WORKER_ENABLED = 'false';
process.loadEnvFile('D:/Projects/WorkLingo/.env');
releaseLocalBeta(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Local IELTS release failed.');
  process.exitCode = 1;
});
