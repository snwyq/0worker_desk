import { afterEach, describe, expect, test } from 'vitest';
import { createDatabase } from '../../src/main/db/database.js';
import { startHttpApi } from '../../src/main/ipc/handlers.js';
import { PublishScheduler } from '../../src/main/publisher/Scheduler.js';

const servers: Array<{ close: () => void }> = [];

afterEach(() => {
  while (servers.length) {
    servers.pop()?.close();
  }
});

describe('http api', () => {
  test('allows CORS preflight for deleting posts', async () => {
    const db = await createDatabase(':memory:');
    const scheduler = new PublishScheduler(db);
    const port = 51830;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/posts/1`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1:5173',
        'Access-Control-Request-Method': 'DELETE',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('DELETE');
    expect(response.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:5173');
  });

  test('reflects localhost origin for delete preflight', async () => {
    const db = await createDatabase(':memory:');
    const scheduler = new PublishScheduler(db);
    const port = 51831;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/posts/1`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'DELETE',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });
});
