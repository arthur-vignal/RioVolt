// auth-db.ts — Ponte sobre o banco SQLite principal (src/lib/db.ts).
// O subagent #1 (db) e o subagent #2 (auth) divergiram: db.ts tem users com
// bcrypt, auth-db.ts tem users com scrypt. Pra evitar dois bancos divergentes,
// este módulo delega TUDO ao db.ts e re-expõe a API que o subagent #2 construiu.
//
// Senha demo: "volta123" para todos os usuários.
//
// API pública:
//   listAllSubscribers()              → PublicUser[]
//   getSubscriberByEmail(email)       → UserRow | null
//   getSubscriberById(id)             → PublicUser | null
//   verifyPassword(row, password)     → boolean
//   DEMO_USERS                        → lista de credenciais demo
//   DEMO_PASSWORD                     → string
//
// Esta camada é provisória: numa próxima fase o db.ts assume auth+ops e este
// arquivo vira um simples re-export.

import type { UserRow } from "@/lib/db";

export type Role = "motorista" | "donos";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

// Re-export de UserRow do db.ts (pra preservar o tipo usado pelo resto do app).
export type { UserRow } from "@/lib/db";

export async function listAllSubscribers(): Promise<PublicUser[]> {
  const { listAllUsers } = require("@/lib/db") as typeof import("@/lib/db");
  const users = await listAllUsers();
  return users.map(toPublic);
}

export async function getSubscriberByEmail(email: string): Promise<UserRow | null> {
  const { findUserByEmail } = require("@/lib/db") as typeof import("@/lib/db");
  const normalized = email.trim().toLowerCase();
  const row = await findUserByEmail(normalized);
  return row ?? null;
}

export async function getSubscriberById(id: string): Promise<PublicUser | null> {
  const { findUserById } = require("@/lib/db") as typeof import("@/lib/db");
  const row = await findUserById(id);
  return row ? toPublic(row) : null;
}

export async function verifyPassword(row: UserRow, password: string): Promise<boolean> {
  const { verifyPassword: dbVerify } = require("@/lib/db") as typeof import("@/lib/db");
  // db.ts tem verifyPassword(email, password) -> UserRow | null.
  // Mantemos a assinatura antiga passando email + senha:
  const result = await dbVerify(row.email, password);
  return result !== null;
}

function toPublic(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as Role,
  };
}

/** Lista das credenciais demo exibidas na tela de login pra banca testar.
 *  Reflete exatamente o seed do db.ts. */
export const DEMO_USERS: Array<{ email: string; name: string; role: Role }> = [
  { email: "mariana@voltrio.app", name: "Mariana Souza", role: "motorista" },
  { email: "rafael@voltrio.app", name: "Rafael Mendes", role: "motorista" },
  { email: "carlos@voltrio.app", name: "Carlos Andrade", role: "motorista" },
  { email: "dono@voltrio.app", name: "Bruno Tavares", role: "donos" },
];

export const DEMO_PASSWORD = "volta123";
