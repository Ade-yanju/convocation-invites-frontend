// client/src/api.js  (CRA-only)

import { auth } from "./firebaseClient";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

// CRA reads env vars prefixed with REACT_APP_ at build time.
// Set REACT_APP_API in client/.env (e.g. http://localhost:8080).
// If not set, we’ll fall back to same-origin, then localhost.
const API =
  process.env.REACT_APP_API ||
  (typeof window !== "undefined"
    ? window.location.origin.replace(/\/$/, "")
    : "") ||
  "http://localhost:8080";

async function idToken() {
  const u = auth.currentUser;
  return u ? await u.getIdToken(/* forceRefresh */ false) : null;
}

/** Firebase email/password login */
export async function login(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Login failed" };
  }
}

export async function logout() {
  try {
    await signOut(auth);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Logout failed" };
  }
}

/** Quick auth check used by routing/guards */
export function isAuthed() {
  return !!auth.currentUser;
}
// Optional: listener if you need it elsewhere
export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

/** Admin: create PDFs */
export async function createStudent(payload) {
  try {
    const t = await idToken();
    if (!t) return { ok: false, error: "Unauthorized" };
    const r = await fetch(`${API}/admin/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
      },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    return await r.json();
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

/** Scanner: check token (expects JSON endpoints on server) */
export async function verifyCheck(token) {
  try {
    const t = await idToken();
    if (!t) return { ok: false, error: "Unauthorized" };
    const r = await fetch(`${API}/verify-json/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
      },
      body: JSON.stringify({ token }),
    });
    return await r.json();
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

/** Scanner: mark token USED (atomic) */
export async function verifyUse(token) {
  try {
    const t = await idToken();
    if (!t) return { ok: false, error: "Unauthorized" };
    const r = await fetch(`${API}/verify-json/use`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
      },
      body: JSON.stringify({ token }),
    });
    return await r.json();
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}
