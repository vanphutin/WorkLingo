import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create, update, transition, find, validate, reindex, recover } from './store.mjs';

const help = `Mandate Steward — local proposal register (Node 20+)
Run from repository root:
  node .agents/skills/mandate-steward/scripts/mandate.mjs <command> [options]
Commands:
  create --input proposal.json [--date YYYY-MM-DD]  Capture; default date is UTC.
  update --id MND-YYYYMMDD-NNN --input proposal.json  Reset to captured; revoke approval.
  transition --id ID --status STATUS --input decision.json  Record a guarded lifecycle decision.
  find --query "audio fallback"  Search active AND archived proposals; inspect conceptual duplicates.
  validate  Check schema, references, history, approval hashes, IDs, archive and INDEX.
  reindex   Explicitly repair/rebuild the derived INDEX after inspecting items.
  recover   Finish an interrupted relocation after inspecting .pending.json and writer lock.
All commands accept --root PATH. Input is JSON; frontmatter is JSON between YAML delimiters.
No command executes product changes, tests, migrations, code, scheduler jobs or publication.
Decision: actor + reason; triaged adds owner; approved adds human authorization reference;
verified adds checks [{command, result: "passed", reference}]. Authorization cannot be inferred
from an actor string: agent must verify the source with the human's actual scope.\n`;

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help' || command === 'help') { process.stdout.write(help); }
  else {
    const flags = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i];
      if (!['--root', '--input', '--id', '--status', '--date', '--query'].includes(key) || args[i + 1] === undefined || key in flags) throw new Error(`Invalid argument ${key}`);
      flags[key] = args[i + 1];
    }
    const root = flags['--root'] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
    const payload = () => {
      if (!flags['--input']) throw new Error('--input JSON file required');
      return JSON.parse(readFileSync(flags['--input'], 'utf8').replace(/^\uFEFF/, ''));
    };
    const actions = {
      create: () => create(root, payload(), flags['--date']), update: () => update(root, flags['--id'], payload()),
      transition: () => transition(root, flags['--id'], flags['--status'], payload()),
      find: () => find(root, flags['--query']), validate: () => validate(root), reindex: () => reindex(root),
      recover: () => recover(root),
    };
    if (!Object.hasOwn(actions, command)) throw new Error(`Unknown command ${command}`);
    process.stdout.write(`${JSON.stringify(actions[command](), null, 2)}\n`);
  }
} catch (error) { process.stderr.write(`Mandate error: ${error.message}\n`); process.exitCode = 1; }
