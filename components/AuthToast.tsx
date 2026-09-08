import { useEffect, useState } from "react";

const TOAST_KEY = "auth-toast-message";
const TOAST_DURATION = 3000;

export function flashAuthToast(message: string): void {
  try {
    sessionStorage.setItem(TOAST_KEY, message);
  } catch {
    /* ignore */
  }
}

export default function AuthToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let v: string | null = null;
    try {
      v = sessionStorage.getItem(TOAST_KEY);
      sessionStorage.removeItem(TOAST_KEY);
    } catch {
      /* ignore */
    }
    if (v) setMessage(v);
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), TOAST_DURATION);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#14161F",
        color: "#fff",
        borderRadius: 12,
        padding: "11px 18px",
        boxShadow: "0 12px 32px rgba(20,22,31,.24)",
        fontSize: 12.5,
        fontWeight: 600,
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "'Plus Jakarta Sans',system-ui,-apple-system,sans-serif",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34C08A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      {message}
    </div>
  );
}