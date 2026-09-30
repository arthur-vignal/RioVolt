/**
 * Declaração ambient para better-sqlite3 (substitui @types/better-sqlite3).
 *
 * Em prod o módulo better-sqlite3 nunca é executado (dispatcher detecta
 * DATABASE_URL). Esta declaração é só para type-check passar no build.
 */
declare module "better-sqlite3" {
  namespace Database {
    interface RunResult {
      changes: number;
      lastInsertRowid: number;
    }
    interface Statement {
      run(...params: unknown[]): RunResult;
      get(...params: unknown[]): unknown;
      all(...params: unknown[]): unknown[];
      iterate(...params: unknown[]): IterableIterator<unknown>;
      pluck(toggle?: boolean): this;
      expand(): this;
      raw(toggle?: boolean): this;
      busyTimer(ms: number): this;
      columns(): { name: string }[];
      bind(...params: unknown[]): unknown;
    }
    interface Database {
      prepare(sql: string): Statement;
      exec(sql: string): Database;
      transaction<T extends (...args: unknown[]) => unknown>(fn: T): T;
      pragma(pragma: string): unknown;
      close(): void;
      function(name: string, fn: (...args: unknown[]) => unknown): void;
      loadExtension(path: string): void;
    }
    interface DatabaseOptions {
      readonly?: boolean;
      fileMustExist?: boolean;
      timeout?: number;
      verbose?: (...args: unknown[]) => void;
      nativeBinding?: string;
    }
  }

  interface BetterSqlite3Static {
    new (filename: string, options?: Database.DatabaseOptions): Database.Database;
  }
  const Database: BetterSqlite3Static;
  export default Database;
  export { Database };
}