import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const rendererFiles = [
  'src/renderer/pages/AgentEnginePage.tsx',
  'src/renderer/queueErrors.ts',
  'tests/renderer/queue-errors.test.ts',
];

const mojibakeMarkers = [
  '鐢',
  '寰',
  '鍐',
  '瀹',
  '璋',
  '椋',
  '彿',
  '俙',
  '浠',
  '噟',
  '鏍',
  '搸',
];

describe('renderer Chinese copy', () => {
  test.each(rendererFiles)('%s does not contain common mojibake markers', (file) => {
    const content = readFileSync(resolve(process.cwd(), file), 'utf8');

    expect(mojibakeMarkers.filter((marker) => content.includes(marker))).toEqual([]);
  });
});
