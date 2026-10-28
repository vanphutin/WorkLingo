import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import type * as PrismaTypes from '@prisma/client';
import { beforeEach, vi } from 'vitest';
const deny = () => { throw new Error('ISOLATION_NETWORK_DENIED'); };
// Patch actual builtins,including default exports/prototype,not only Vitest named mocks.
net.connect = deny;
net.createConnection = deny;
net.Socket.prototype.connect = deny;
http.request = deny;
http.get = deny;
https.request = deny;
https.get = deny;
syncBuiltinESMExports();
vi.stubGlobal('fetch', deny); // Installed before the test module is imported.
const originalRead = fs.readFileSync;
vi.spyOn(fs, 'readFileSync').mockImplementation(((path, ...args) => {
    if (/(^|[/\\])\.env(?:\.[^/\\]*)?$/u.test(String(path)))
        throw new Error('ISOLATION_ENV_DENIED');
    return Reflect.apply(originalRead, fs, [path, ...args]);
}) as typeof fs.readFileSync);
syncBuiltinESMExports();
vi.mock('@prisma/client', async (original) => ({ ...await original<typeof PrismaTypes>(), PrismaClient: class {
        constructor() { throw new Error('ISOLATION_PRISMA_DENIED'); }
    } }));
vi.spyOn(process, 'loadEnvFile').mockImplementation(() => { throw new Error('ISOLATION_ENV_DENIED'); });
beforeEach(() => { vi.stubGlobal('fetch', deny); });
