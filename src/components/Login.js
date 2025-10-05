import React, { useEffect, useState } from "react";
import { login, isAuthed } from "../api";
import { useNavigate } from "react-router-dom";

const S = {
  wrap: {
    maxWidth: 420,
    margin: "60px auto",
    padding: 20,
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    fontFamily: "Inter, system-ui, Arial, sans-serif",
  },
  h: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 12,
    color: "#0B2E4E",
  },
  p: { margin: "6px 0 18px 0", fontSize: 13, color: "#64748b" },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
  },
  btn: {
    width: "100%",
    height: 46,
    marginTop: 14,
    borderRadius: 12,
    border: "1px solid transparent",
    background: "#0B2E4E",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  err: { marginTop: 10, fontSize: 12, color: "#dc2626" },
  logoRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  logo: { height: 36 },
  uni: { fontWeight: 900, color: "#0B2E4E" },
};

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@school.edu");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (isAuthed()) nav("/admin");
  }, [nav]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const out = await login(email, password);
    setBusy(false);
    if (out?.ok) nav("/admin");
    else setErr(out?.error || "Login failed");
  }

  return (
    <div style={S.wrap}>
      <div style={S.logoRow}>
        <img style={S.logo} alt="Dominion University" src="/du-logo.png" />
        <div style={S.uni}>Dominion University • Admin</div>
      </div>
      <h1 style={S.h}>Admin Login</h1>
      <p style={S.p}>Sign in to generate and manage convocation invites.</p>
      <form onSubmit={onSubmit}>
        <label style={S.label}>Email</label>
        <input
          style={S.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div style={{ height: 10 }} />

        <label style={S.label}>Password</label>
        <input
          type="password"
          style={S.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={S.btn} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {err && <div style={S.err}>{err}</div>}
      </form>
    </div>
  );
}
