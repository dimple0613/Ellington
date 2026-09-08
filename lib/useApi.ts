import { useEffect, useState, useCallback } from "react";
import type { ApiEnvelope } from "./api";

export function useApi<T = any>(path: string, opts: { initial?: T } = {}) {
  const [data, setData] = useState<T | undefined>(opts.initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(path);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | T | null;
      if (json && typeof json === "object" && "ok" in json) {
        if (!(json as ApiEnvelope<T>).ok) throw new Error((json as { error: string | null }).error || "Failed");
        setData((json as ApiEnvelope<T>).data ?? opts.initial);
      } else {
        setData(json as T);
      }
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}