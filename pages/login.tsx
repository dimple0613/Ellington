import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", { method: "POST", body: { email, password } });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    marginTop: 6,
    padding: "11px 13px",
    border: "1px solid #E4E6EE",
    borderRadius: 12,
    fontSize: 13.5,
    fontFamily: "inherit",
    background: "#fff",
    color: "#14161F",
    outline: "none",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "#F3F4F8",
        fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 392,
          background: "#fff",
          border: "1px solid #EDEEF3",
          borderRadius: 24,
          padding: "32px 30px 30px",
          boxShadow: "0 1px 3px rgba(20,22,31,.05)",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "#14161F",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: "-.02em",
            marginBottom: 24,
          }}
        >
          EH
        </div>
        <h1 style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.03em", margin: "0 0 5px", color: "#14161F" }}>
          Sign in to Ellington
        </h1>
        <p style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, margin: "0 0 24px" }}>
          Developer sales console · ORN 21281
        </p>
        <form onSubmit={submit} noValidate>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7180", marginBottom: 14 }}>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@developer.com" style={inputStyle} />
          </label>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7180", marginBottom: 16 }}>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
          </label>
          {error && (
            <div style={{ color: "#E5484D", background: "#FDECEC", fontSize: 12.5, borderRadius: 10, padding: "9px 12px", marginBottom: 14, fontWeight: 600 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              padding: "12px",
              border: 0,
              borderRadius: 12,
              background: "#4F46F5",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13.5,
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}