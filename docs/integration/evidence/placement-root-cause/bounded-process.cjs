const cp = require('node:child_process');

// Diagnostic lifecycle only. Terminate only the PID/tree that this call created.
async function runBounded(command, args, options) {
  const { timeoutMs, onSpawn, ...spawnOptions } = options;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Finite positive child deadline required');
  const child = cp.spawn(command, args, { ...spawnOptions, detached: process.platform !== 'win32' });
  onSpawn?.(child);
  return new Promise(resolve => {
    let timedOut = false;
    let error;
    let terminationError;
    let grace;
    const timer = setTimeout(() => {
      timedOut = true;
      if (child.pid) {
        try {
          if (process.platform === 'win32') cp.execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 10_000, stdio: 'ignore' });
          else process.kill(-child.pid, 'SIGKILL');
        } catch (cause) {
          terminationError = String(cause);
          child.kill('SIGKILL');
        }
      }
      // Never call an unobserved close successful; report a bounded failure so
      // the owner can clean its database even if OS process termination fails.
      grace = setTimeout(() => resolve({ exitCode: null, timedOut, closed: false, error, terminationError: terminationError || 'Child did not close after termination' }), 10_000);
    }, timeoutMs);
    child.on('error', cause => { error = String(cause); });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer); clearTimeout(grace);
      resolve({ exitCode, signal, timedOut, closed: true, error, terminationError });
    });
  });
}
module.exports = { runBounded };
