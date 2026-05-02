import { execFileSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';

describe('electron runtime modules', () => {
  test('compiled update service can be imported by Node ESM runtime', () => {
    expect(() => {
      execFileSync(process.execPath, [
        '--input-type=module',
        '--eval',
        "await import('./dist-electron/src/main/updater/UpdateService.js')",
      ], {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 10_000,
      });
    }).not.toThrow();
  });
});
