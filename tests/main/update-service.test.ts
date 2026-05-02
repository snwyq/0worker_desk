import { describe, expect, test } from 'vitest';
import { createDatabase } from '../../src/main/db/database.js';
import { readUpdateConfig } from '../../src/main/updater/UpdateService.js';

describe('update service config', () => {
  test('reports disabled updates when owner and repo are missing', async () => {
    const db = await createDatabase(':memory:');

    expect(readUpdateConfig(db)).toEqual({
      enabled: true,
      provider: 'github',
      owner: '',
      repo: '',
      channel: 'latest',
      canCheck: false,
      reason: 'GitHub Releases owner and repo are required before update checks can run',
    });
  });

  test('allows GitHub Releases checks when config is complete', async () => {
    const db = await createDatabase(':memory:');
    db.settings.set('updates.owner', 'example-owner');
    db.settings.set('updates.repo', '0worker-desk');
    db.settings.set('updates.channel', 'beta');

    expect(readUpdateConfig(db)).toEqual({
      enabled: true,
      provider: 'github',
      owner: 'example-owner',
      repo: '0worker-desk',
      channel: 'beta',
      canCheck: true,
    });
  });
});
