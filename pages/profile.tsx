import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Shell from "../components/Shell";
import { useSession } from "../lib/useSession";

const ACCENT = "#4F46F5";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function Spinner() {
  return <span className="auth-spinner" aria-hidden />;
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#6B7180", marginBottom: 7 }}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        style={{
          width: "100%",
          height: 42,
          padding: "0 13px",
          border: `1px solid ${error ? "#E5484D" : "#E4E6EE"}`,
          borderRadius: 11,
          fontSize: 13,
          fontFamily: "inherit",
          background: "#fff",
          color: "#14161F",
          outline: "none",
          transition: "border-color 150ms ease, box-shadow 150ms ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = ACCENT;
          e.currentTarget.style.boxShadow = `0 0 0 3px rgba(79,70,245,.10)`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "#E5484D" : "#E4E6EE";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      {hint && !error && (
        <div style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 500, marginTop: 6 }}>{hint}</div>
      )}
      {error && (
        <div id={`${id}-error`} role="alert" style={{ fontSize: 11.5, color: "#E5484D", fontWeight: 600, marginTop: 6 }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const router = useRouter();
  const { user, ready } = useSession();
  const filled = useRef(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ready || filled.current) return;
    filled.current = true;
    if (user) {
      setName(user.full_name || "");
      setEmail(user.email || "");
    }
  }, [ready, user]);

  function clearField(key: string) {
    setErrors((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required.";
    else if (name.trim().length > 80) e.name = "Name must be 80 characters or fewer.";
    if (!email.trim()) e.email = "Email is required.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address.";
    if (newPassword) {
      if (newPassword.length < 8) e.newPassword = "Password must be at least 8 characters.";
      else if (!/[A-Z]/.test(newPassword)) e.newPassword = "Add at least one uppercase letter.";
      else if (!/[a-z]/.test(newPassword)) e.newPassword = "Add at least one lowercase letter.";
      else if (!/[0-9]/.test(newPassword)) e.newPassword = "Add at least one number.";
      else if (!/[^A-Za-z0-9]/.test(newPassword)) e.newPassword = "Add at least one special character.";
      if (!currentPassword) e.currentPassword = "Enter your current password to set a new one.";
      if (newPassword !== confirmPassword) e.confirmPassword = "Passwords do not match.";
    }
    const emailChanged = email.trim().toLowerCase() !== (user?.email || "").toLowerCase();
    if (emailChanged && !currentPassword) e.currentPassword = "Enter your current password to change your email.";
    if (newPassword && newPassword === currentPassword) e.newPassword = "New password must differ from your current password.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setServerError("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim(),
          current_password: currentPassword || undefined,
          new_password: newPassword || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setServerError(json.error || "Current password is incorrect.");
        setBusy(false);
        return;
      }
      if (!res.ok) {
        setServerError(json.error || "Could not update your profile. Please try again.");
        setBusy(false);
        return;
      }
      const credentialsChanged =
        email.trim().toLowerCase() !== (user?.email || "").toLowerCase() || newPassword.length > 0;
      setSaved(true);
      setBusy(false);
      if (credentialsChanged) {
        setTimeout(() => {
          fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          router.replace("/login?next=%2Fdashboard");
        }, 1100);
      }
    } catch {
      setServerError("Unable to reach the server. Please check your connection and try again.");
      setBusy(false);
    }
  }

  const credentialsChanged = email.trim().toLowerCase() !== (user?.email || "").toLowerCase() || newPassword.length > 0;

  return (
    <Shell group="system" active="profile" crumbs={["System", "My profile"]}>
      <div style={{ maxWidth: 620 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>My profile</div>
            <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>
              Update your name, sign-in email and password. These are the credentials used for every future login.
            </div>
          </div>
        </div>

        {!ready || !user ? (
          <div style={{ background: "#fff", border: "1px solid #EDEEF3", borderRadius: 18, padding: 40, textAlign: "center", fontSize: 13, color: "#9AA0AE", fontWeight: 600 }}>Loading profile…</div>
        ) : (
          <>
          <form
            onSubmit={submit}
            noValidate
            style={{ background: "#fff", border: "1px solid #EDEEF3", borderRadius: 18, padding: "24px 26px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.05)" }}
          >
            {serverError && (
              <div role="alert" style={{ display: "flex", gap: 9, alignItems: "flex-start", color: "#E5484D", background: "#FDECEC", fontSize: 12.5, borderRadius: 11, padding: "10px 12px", marginBottom: 16, fontWeight: 600 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
                <span>{serverError}</span>
              </div>
            )}

            {saved && (
              <div role="status" style={{ display: "flex", gap: 9, alignItems: "flex-start", color: "#107A50", background: "#E7F8F0", fontSize: 12.5, borderRadius: 11, padding: "10px 12px", marginBottom: 16, fontWeight: 600 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }}><path d="M20 6 9 17l-5-5" /></svg>
                <span>
                  {credentialsChanged
                    ? "Profile updated. Signing you out so you can sign in with your new credentials…"
                    : "Profile updated."}
                </span>
              </div>
            )}

            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 14 }}>Identity</div>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
              <Field
                id="full_name"
                label="Full name"
                type="text"
                value={name}
                autoComplete="name"
                onChange={(v) => {
                  setName(v);
                  clearField("name");
                }}
                error={errors.name}
              />
              <Field
                id="email"
                label="Email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(v) => {
                  setEmail(v);
                  clearField("email");
                  clearField("currentPassword");
                }}
                error={errors.email}
              />
            </div>

            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase", margin: "24px 0 14px" }}>Security</div>
            <div style={{ display: "grid", gap: 16 }}>
              <Field
                id="current_password"
                label="Current password"
                type="password"
                value={currentPassword}
                autoComplete="current-password"
                onChange={(v) => {
                  setCurrentPassword(v);
                  clearField("currentPassword");
                }}
                error={errors.currentPassword}
                hint={email.trim().toLowerCase() !== (user?.email || "").toLowerCase() || newPassword.length > 0 ? "Required to confirm changes to your email or password." : undefined}
              />

              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ position: "relative" }}>
                  <label htmlFor="new_password" style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#6B7180", marginBottom: 7 }}>New password</label>
                  <input
                    id="new_password"
                    name="new_password"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    autoComplete="new-password"
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      clearField("newPassword");
                      clearField("confirmPassword");
                      clearField("currentPassword");
                    }}
                    placeholder="Leave blank to keep current"
                    aria-invalid={!!errors.newPassword}
                    aria-describedby={errors.newPassword ? "new_password-error" : undefined}
                    style={{
                      width: "100%",
                      height: 42,
                      padding: "0 42px 0 13px",
                      border: `1px solid ${errors.newPassword ? "#E5484D" : "#E4E6EE"}`,
                      borderRadius: 11,
                      fontSize: 13,
                      fontFamily: "inherit",
                      background: "#fff",
                      color: "#14161F",
                      outline: "none",
                      transition: "border-color 150ms ease, box-shadow 150ms ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = ACCENT;
                      e.currentTarget.style.boxShadow = `0 0 0 3px rgba(79,70,245,.10)`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.newPassword ? "#E5484D" : "#E4E6EE";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((s) => !s)}
                    title={showNew ? "Hide password" : "Show password"}
                    aria-label={showNew ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: 6,
                      top: 29,
                      width: 34,
                      height: 34,
                      border: 0,
                      background: "transparent",
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      color: "#9AA0AE",
                    }}
                  >
                    {showNew ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3l18 18M10.5 10.7a2.5 2.5 0 0 0 3.5 3.5M9.9 5.2A9.4 9.4 0 0 1 12 5c5 0 8.5 4 9.5 6.5-.7 1.8-2.7 4.8-6 6.1M6.3 7.5C3.7 9 1.8 11.6 1.5 12c1 2.5 4.5 6.5 9.5 6.5a9.3 9.3 0 0 0 4.2-1" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>
                    )}
                  </button>
                  {errors.newPassword && (
                    <div id="new_password-error" role="alert" style={{ fontSize: 11.5, color: "#E5484D", fontWeight: 600, marginTop: 6 }}>
                      {errors.newPassword}
                    </div>
                  )}
                </div>
                <Field
                  id="confirm_password"
                  label="Confirm new password"
                  type="password"
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(v) => {
                    setConfirmPassword(v);
                    clearField("confirmPassword");
                  }}
                  error={errors.confirmPassword}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 24,
                paddingTop: 18,
                borderTop: "1px solid #F0F1F6",
              }}
            >
              <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, lineHeight: 1.5 }}>
                Password must be 8+ characters with an uppercase letter,
                <br />
                a lowercase letter, a number and a special character.
              </div>
              <button
                type="submit"
                disabled={busy}
                style={{
                  height: 42,
                  padding: "0 20px",
                  border: 0,
                  borderRadius: 11,
                  background: ACCENT,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: busy ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  opacity: busy ? 0.75 : 1,
                  whiteSpace: "nowrap",
                  transition: "transform 120ms ease, opacity 150ms ease",
                }}
              >
                {busy ? (
                  <>
                    <Spinner />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 14, fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, lineHeight: 1.6 }}>
            Changing your email or password signs you out everywhere. Default credentials from the initial setup
            are deactivated the moment you save — from then on, only your database credentials will work.
          </div>
          </>
        )}
      </div>
    </Shell>
  );
}