// Helpers pra criar/ler o cookie de sessão do Voltrio.
// Sessão stateless: payload = base64url(JSON({userId, role, iat})); assinatura = HMAC-SHA256.
// HttpOnly, SameSite=Lax, Max-Age=7d.

import crypto from "node:crypto";

const COOKIE_NAME = "voltrio_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function getSecret(): string {
  // Em produção, esse secret deveria vir de env (ex.: SESSION_SECRET).
  // Em dev, gera um valor estável por processo pra sobreviver HMR.
  const fromEnv = process.env.VOLTRIO_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  // fallback determinístico (não é seguro pra produção, mas estável em dev)
  return "voltrio-dev-secret-do-not-use-in-production-12345678";
}

function b64urlEncode(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("base64url");
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function sign(payload: string, secret: string): string {
  return b64urlEncode(
    crypto.createHmac("sha256", secret).update(payload).digest(),
  );
}

export type SessionPayload = {
  userId: string;
  role: "motorista" | "donos";
  iat: number; // epoch seconds
};

export function encodeSession(p: SessionPayload): string {
  const secret = getSecret();
  const body = b64urlEncode(Buffer.from(JSON.stringify(p), "utf-8"));
  const sig = sign(body, secret);
  return `${body}.${sig}`;
}

export function decodeSession(raw: string | undefined | null): SessionPayload | null {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(body, getSecret());
  // timing-safe compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  try {
    const json = b64urlDecode(body).toString("utf-8");
    const parsed = JSON.parse(json) as SessionPayload;
    if (!parsed.userId || !parsed.role) return null;
    // expirar 7 dias
    const ageSec = Math.floor(Date.now() / 1000) - (parsed.iat ?? 0);
    if (ageSec > MAX_AGE_SECONDS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE = MAX_AGE_SECONDS;