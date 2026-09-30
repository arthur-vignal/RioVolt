export type SessionUser = { id: string; email: string; role: "motorista" | "donos" } | null;

const KEY = "voltrio_session";

export function getLocalSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setLocalSession(user: SessionUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearLocalSession() {
  localStorage.removeItem(KEY);
}
