// client/src/components/Login.jsx
import React, { useEffect, useState } from "react";
import { login, isAuthed } from "../api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@school.edu");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (isAuthed()) nav("/admin");
  }, [nav]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!email.trim() || !password) {
      setErr("Email and password are required");
      return;
    }
    setBusy(true);
    const out = await login(email.trim(), password);
    setBusy(false);
    if (out?.ok) {
      // optionally persist a simple flag locally if "remember" is checked
      if (remember) localStorage.setItem("du_remember", "1");
      nav("/admin");
    } else {
      setErr(out?.error || "Invalid credentials");
    }
  }

  const S = {
    page: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(180deg,#f5f6fb,#f0eefb)",
      fontFamily: "Inter, system-ui, Arial, sans-serif",
      padding: 20,
    },
    card: {
      width: "100%",
      maxWidth: 1100,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: "0 12px 40px rgba(11,46,78,0.12)",
      background: "#fff",
    },
    left: {
      padding: 36,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },
    brandRow: { display: "flex", alignItems: "center", gap: 12 },
    logo: { height: 44 },
    brandText: { fontWeight: 900, color: "#0B2E4E", fontSize: 18 },
    title: {
      margin: "14px 0 0 0",
      fontSize: 26,
      fontWeight: 900,
      color: "#0B2E4E",
    },
    subtitle: { margin: "6px 0 18px 0", color: "#6b7280" },
    form: { display: "grid", gap: 12, marginTop: 8 },
    label: { fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 6 },
    input: {
      width: "100%",
      height: 44,
      borderRadius: 10,
      border: "1px solid #e6edf3",
      padding: "0 12px",
      fontSize: 14,
      outline: "none",
    },
    inputRow: { position: "relative" },
    eyeBtn: {
      position: "absolute",
      right: 10,
      top: 6,
      height: 32,
      width: 32,
      borderRadius: 8,
      border: "none",
      background: "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    },
    controlsRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 6,
    },
    remember: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      color: "#64748b",
      fontSize: 13,
    },
    btn: {
      marginTop: 12,
      height: 46,
      borderRadius: 12,
      border: "none",
      background: "#0B2E4E",
      color: "#fff",
      fontWeight: 800,
      cursor: "pointer",
      fontSize: 15,
    },
    note: { marginTop: 6, color: "#64748b", fontSize: 13 },
    err: { marginTop: 10, color: "#dc2626", fontSize: 13 },
    right: {
      background:
        "linear-gradient(135deg,#6b21a8 0%, #7c3aed 30%, #a78bfa 100%)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    hero: {
      width: "100%",
      maxWidth: 420,
      textAlign: "center",
      borderRadius: 14,
      padding: 16,
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
    },
    heroImg: { width: "100%", borderRadius: 12, display: "block" },
    heroTitle: { fontSize: 20, fontWeight: 900, margin: "12px 0 4px 0" },
    heroSubtitle: { fontSize: 13, opacity: 0.9 },
    // responsive
    "@media (maxWidth: 900px)": {},
    wrapperStack: { gridTemplateColumns: "1fr" },
  };

  // small inlined SVGs for the eye icon (visible/hidden)
  const Eye = ({ open = false }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      {open ? (
        <path
          d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
          stroke="#0B2E4E"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path
            d="M17.94 17.94A10.03 10.03 0 0 1 12 19c-6 0-10-7-10-7a19.66 19.66 0 0 1 3.11-4.11"
            stroke="#0B2E4E"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M1 1l22 22"
            stroke="#0B2E4E"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );

  return (
    <div style={S.page}>
      <div
        style={{
          ...S.card,
          // responsive stacking when small screens
          gridTemplateColumns:
            window.innerWidth < 880 ? "1fr" : S.card.gridTemplateColumns,
        }}
      >
        <div style={S.left}>
          <div style={S.brandRow}>
            <img src="/du-logo.png" alt="Dominion University" style={S.logo} />
            <div style={S.brandText}>Dominion University</div>
          </div>

          <h1 style={S.title}>Admin Login</h1>
          <div style={S.subtitle}>
            Sign in to generate and manage DU convocation invites.
          </div>

          <form style={S.form} onSubmit={onSubmit}>
            <div>
              <label style={S.label} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                style={S.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@school.edu"
                autoComplete="username"
                type="email"
              />
            </div>

            <div>
              <label style={S.label} htmlFor="password">
                Password
              </label>
              <div style={S.inputRow}>
                <input
                  id="password"
                  style={S.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((s) => !s)}
                  style={S.eyeBtn}
                >
                  <Eye open={showPassword} />
                </button>
              </div>
            </div>

            <div style={S.controlsRow}>
              <label style={S.remember}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>
                Only admin access
              </div>
            </div>

            <button style={S.btn} disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <div style={S.note}>
              If you experience issues logging in, make sure your admin email is
              allowed in the server environment.
            </div>

            {err && (
              <div role="alert" style={S.err}>
                {err}
              </div>
            )}
          </form>
        </div>

        <div style={S.right}>
          <div style={S.hero}>
            <img
              src="/du-hero.png"
              alt="Dominion University"
              style={S.heroImg}
            />
            <div style={S.heroTitle}>Convocation Invites</div>
            <div style={S.heroSubtitle}>
              Generate secure single-entry e-invites with QR — fast,
              mobile-friendly and non-transferable.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
