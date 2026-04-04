import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getBaseUrl } from "./api-client";

export interface AuthUser {
  userId: string;
  username: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoaded: boolean;
  signIn: (login: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "nutter_jwt";

function getApiBase(): string {
  const base = getBaseUrl();
  if (base) return base;
  return "";
}

async function apiFetch(path: string, body: object): Promise<any> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // On mount, restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      // Quick parse of JWT payload (no verify — backend will reject if expired)
      try {
        const payload = JSON.parse(atob(stored.split(".")[1]));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          setToken(stored);
          setUser({ userId: payload.userId, username: payload.username, email: payload.email });
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoaded(true);
  }, []);

  const saveSession = useCallback((tok: string, u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, tok);
    setToken(tok);
    setUser(u);
  }, []);

  const signIn = useCallback(async (login: string, password: string) => {
    const data = await apiFetch("/api/auth/login", { login, password });
    saveSession(data.token, { userId: data.userId ?? "", username: data.username, email: data.email });
  }, [saveSession]);

  const signUp = useCallback(async (username: string, email: string, password: string) => {
    const data = await apiFetch("/api/auth/register", { username, email, password });
    saveSession(data.token, { userId: data.userId ?? "", username: data.username, email: data.email });
  }, [saveSession]);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoaded, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
