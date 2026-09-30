// auth-db.ts — Ponte sobre a fachada db.ts.
//
// API:
//   listAllSubscribers()              → PublicUser[]
//   getSubscriberByEmail(email)       → UserRow | null
//   getSubscriberById(id)             → PublicUser | null
//   verifyPassword(row, password)     → boolean
//   DEMO_USERS                        → lista de credenciais demo
//   DEMO_PASSWORD                     → string

import type { UserRow } from "@/lib/db";
import {
  findUserByEmail,
  findUserById,
  listAllUsers,
  verifyPassword as dbVerifyPassword,
} from "@/lib/db";

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
  const users = await listAllUsers();
  return users.map(toPublic);
}

export async function getSubscriberByEmail(email: string): Promise<UserRow | null> {
  const normalized = email.trim().toLowerCase();
  const row = await findUserByEmail(normalized);
  return row ?? null;
}

export async function getSubscriberById(id: string): Promise<PublicUser | null> {
  const row = await findUserById(id);
  return row ? toPublic(row) : null;
}

export async function verifyPassword(row: UserRow, password: string): Promise<boolean> {
  // db.ts tem verifyPassword(email, password) -> UserRow | null.
  // Mantemos a assinatura antiga passando email + senha:
  const result = await dbVerifyPassword(row.email, password);
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