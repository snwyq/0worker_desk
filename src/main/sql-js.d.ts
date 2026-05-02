declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: BufferSource) => SqlJsDatabase;
  }

  export interface SqlJsStatement {
    bind(values?: unknown[] | Record<string, unknown>): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  }

  export interface SqlJsDatabase {
    run(sql: string, params?: unknown[] | Record<string, unknown>): void;
    prepare(sql: string): SqlJsStatement;
    export(): Uint8Array;
  }

  export default function initSqlJs(): Promise<SqlJsStatic>;
}
