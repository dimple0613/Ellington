import { useEffect, useState } from "react";

export type SessionUser = {
  userId: number;
  email: string;
  role: string;
  full_name?: string;
  exp?: number;
};

export function useSession() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.status === 401) {
          if (alive) setUser(null);
        } else if (res.ok) {
          const json = await res.json();
          if (alive) setUser(json.user as SessionUser);
        } else {
          if (alive) setUser(null);
        }
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { user, ready };
}