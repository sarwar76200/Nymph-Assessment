export type AuthMode = "login" | "signup";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  created_at?: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

type AuthCredentials = {
  name?: string;
  email: string;
  password: string;
};

type ValidationError = {
  msg?: string;
};

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SESSION_EVENT = "auth-session-changed";

function getErrorMessage(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const firstError = detail[0] as ValidationError | undefined;
    if (firstError?.msg) {
      return firstError.msg.replace(/^Value error, /, "");
    }
  }

  return "Something went wrong. Please try again.";
}

export async function authenticate(
  mode: AuthMode,
  credentials: AuthCredentials,
): Promise<AuthResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/api/v1/auth/${mode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
  } catch {
    throw new Error("Unable to reach the server. Check that the API is running.");
  }

  const payload = (await response.json().catch(() => null)) as
    | AuthResponse
    | { detail?: unknown }
    | null;

  if (!response.ok) {
    const detail = payload && "detail" in payload ? payload.detail : null;
    throw new Error(getErrorMessage(detail));
  }

  return payload as AuthResponse;
}

export function saveSession(session: AuthResponse): void {
  localStorage.setItem("access_token", session.access_token);
  saveUser(session.user);
}

export function saveUser(user: AuthUser): void {
  localStorage.setItem("auth_user", JSON.stringify(user));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("auth_user");
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeToSession(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SESSION_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SESSION_EVENT, onStoreChange);
  };
}

export function getSessionToken(): string | null | undefined {
  return window.localStorage.getItem("access_token");
}

export function getServerSessionToken(): undefined {
  return undefined;
}
