// Read-only Codex native discovery: no model turn, config write or auth output.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { writeFileSync } from 'node:fs';

const cliPath = process.argv[2];
if (!cliPath) throw new Error('Pass the installed Codex CLI JavaScript entrypoint.');
const server = spawn(process.execPath, [cliPath, 'app-server', '--stdio'], {
  stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
});
let finished = false;
const timeout = setTimeout(() => {
  console.error('Codex discovery timed out after 30 seconds.');
  server.kill();
  process.exitCode = 1;
}, 30_000);
const send = (message) => server.stdin.write(`${JSON.stringify(message)}\n`);
server.stderr.on('data', () => {}); // Do not expose machine config or credentials.
createInterface({ input: server.stdout }).on('line', (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  if (message.id === 1) {
    if (message.error) throw new Error(JSON.stringify(message.error));
    send({ method: 'initialized', params: {} });
    send({ id: 2, method: 'skills/list', params: { cwds: [process.cwd()], forceReload: true } });
  }
  if (message.id === 2) {
    const relevant = message.result?.data?.map((entry) => ({
      cwd: entry.cwd,
      skills: entry.skills.filter((skill) => skill.path.replaceAll('\\', '/').includes('/WorkLingo/.agents/skills/'))
        .map(({ name, path, scope, enabled }) => ({ name, path, scope, enabled })),
      errors: entry.errors,
    }));
    if (!relevant) throw new Error(JSON.stringify(message.error ?? 'No discovery data.'));
    writeFileSync('docs/SKILL_DISCOVERY.json', `${JSON.stringify(relevant, null, 2)}\n`);
    console.log(JSON.stringify(relevant, null, 2));
    finished = true;
    clearTimeout(timeout);
    server.stdin.end();
    server.kill();
  }
});
server.on('error', (error) => { console.error(error.message); clearTimeout(timeout); process.exitCode = 1; });
server.on('exit', () => { if (!finished) { clearTimeout(timeout); process.exitCode = 1; } });
send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'worklingo_skill_audit', version: '1.0.0' } } });
