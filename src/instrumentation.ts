/**
 * instrumentation.ts — Next.js 16+ roda uma vez no boot do servidor.
 *
 * Em produção com DATABASE_URL presente:
 *   1. Cria o schema Postgres (idempotente)
 *   2. Roda o seed se a tabela users estiver vazia
 *   3. Aplica migrations inline (ex.: renomear emails demo de .local → .app)
 *
 * Sem DATABASE_URL, fica inerte (dev local usa SQLite via db-sqlite.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) return;

  try {
    const { initSchema, seedIfEmpty } = await import("@/lib/db-pg");
    await initSchema();
    await seedIfEmpty();
    console.log("[voltrio] Postgres schema + seed inicializados no boot");
  } catch (err) {
    console.error(
      "[voltrio] Falha ao inicializar Postgres schema no boot:",
      err instanceof Error ? err.message : err,
    );
  }
}