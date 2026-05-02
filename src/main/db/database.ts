import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';
import { schemaSql } from './schema.js';
import type { Account, CreateAccountInput, CreatePostInput, Post } from '../../shared/types.js';

function now() {
  return new Date().toISOString();
}

function mapAccount(row: Record<string, unknown>): Account {
  return {
    id: Number(row.id),
    name: String(row.name),
    platform: 'weibo',
    browserMode: row.browserMode as Account['browserMode'],
    providerProfileId: String(row.providerProfileId),
    wsEndpoint: String(row.wsEndpoint),
    debuggingPort: row.debuggingPort === null ? null : Number(row.debuggingPort),
    status: row.status as Account['status'],
    notes: String(row.notes),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapPost(row: Record<string, unknown>): Post {
  return {
    id: Number(row.id),
    accountId: Number(row.accountId),
    content: String(row.content),
    mediaPaths: JSON.parse(String(row.mediaPaths)) as string[],
    scheduledAt: String(row.scheduledAt),
    status: row.status as Post['status'],
    lastError: String(row.lastError),
    screenshotPath: String(row.screenshotPath),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function firstRow(statementRows: Array<Record<string, unknown>>): Record<string, unknown> {
  const row = statementRows[0];
  if (!row) {
    throw new Error('Expected database row was not found');
  }
  return row;
}

interface SqlStatement {
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): void;
}

function rows(statement: SqlStatement): Array<Record<string, unknown>> {
  const result: Array<Record<string, unknown>> = [];
  while (statement.step()) {
    result.push(statement.getAsObject() as Record<string, unknown>);
  }
  statement.free();
  return result;
}

export async function createDatabase(filename: string) {
  const SQL = await initSqlJs();
  const hasFile = filename !== ':memory:' && fs.existsSync(filename);
  const fileBuffer = hasFile ? fs.readFileSync(filename) : undefined;
  const sqlite = new SQL.Database(fileBuffer);

  sqlite.run('PRAGMA foreign_keys = ON');
  sqlite.run(schemaSql);

  function persist() {
    if (filename === ':memory:') {
      return;
    }

    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, Buffer.from(sqlite.export()));
  }

  function select(sql: string, params: unknown[] = []) {
    const statement = sqlite.prepare(sql);
    statement.bind(params);
    return rows(statement);
  }

  return {
    accounts: {
      create(input: CreateAccountInput): Account {
        const timestamp = now();
        sqlite.run(`
          INSERT INTO accounts (name, platform, browserMode, providerProfileId, wsEndpoint, debuggingPort, status, notes, createdAt, updatedAt)
          VALUES (@name, @platform, @browserMode, @providerProfileId, @wsEndpoint, @debuggingPort, @status, @notes, @createdAt, @updatedAt)
        `, {
          '@name': input.name,
          '@platform': input.platform,
          '@browserMode': input.browserMode,
          '@providerProfileId': input.providerProfileId,
          '@wsEndpoint': input.wsEndpoint,
          '@debuggingPort': input.debuggingPort,
          '@status': input.status,
          '@notes': input.notes,
          '@createdAt': timestamp,
          '@updatedAt': timestamp,
        });
        const id = Number(firstRow(select('SELECT last_insert_rowid() AS id')).id);
        persist();
        return mapAccount(firstRow(select('SELECT * FROM accounts WHERE id = ?', [id])));
      },
      list(): Account[] {
        return select('SELECT * FROM accounts ORDER BY id DESC').map(mapAccount);
      },
      findById(id: number): Account | null {
        const row = select('SELECT * FROM accounts WHERE id = ?', [id])[0];
        return row ? mapAccount(row) : null;
      },
    },
    posts: {
      create(input: CreatePostInput): Post {
        const timestamp = now();
        sqlite.run(`
          INSERT INTO posts (accountId, content, mediaPaths, scheduledAt, status, createdAt, updatedAt)
          VALUES (@accountId, @content, @mediaPaths, @scheduledAt, @status, @createdAt, @updatedAt)
        `, {
          '@accountId': input.accountId,
          '@content': input.content,
          '@mediaPaths': JSON.stringify(input.mediaPaths),
          '@scheduledAt': input.scheduledAt,
          '@status': input.status,
          '@createdAt': timestamp,
          '@updatedAt': timestamp,
        });
        const id = Number(firstRow(select('SELECT last_insert_rowid() AS id')).id);
        persist();
        return mapPost(firstRow(select('SELECT * FROM posts WHERE id = ?', [id])));
      },
      list(): Post[] {
        return select('SELECT * FROM posts ORDER BY createdAt DESC, id DESC').map(mapPost);
      },
      findById(id: number): Post | null {
        const row = select('SELECT * FROM posts WHERE id = ?', [id])[0];
        return row ? mapPost(row) : null;
      },
      listDue(nowIso: string): Post[] {
        return select(`
          SELECT * FROM posts
          WHERE status = 'queued' AND scheduledAt <= ?
          ORDER BY scheduledAt ASC, id ASC
        `, [nowIso]).map(mapPost);
      },
      updateStatus(id: number, status: Post['status'], lastError = '', screenshotPath = ''): void {
        sqlite.run(`
          UPDATE posts
          SET status = ?, lastError = ?, screenshotPath = ?, updatedAt = ?
          WHERE id = ?
        `, [status, lastError, screenshotPath, now(), id]);
        persist();
      },
      delete(id: number): boolean {
        sqlite.run('DELETE FROM publish_logs WHERE postId = ?', [id]);
        sqlite.run('DELETE FROM posts WHERE id = ?', [id]);
        persist();
        return !this.findById(id);
      },
    },
  };
}

export type AppDatabase = Awaited<ReturnType<typeof createDatabase>>;
