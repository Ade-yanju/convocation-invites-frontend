// client/src/api.js
import { auth } from "./firebaseClient";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

// 🌐 Base API URL
export const API =
  process.env.REACT_APP_API ||
  (typeof window !== "undefined"
    ? window.location.origin.replace(/\/$/, "")
    : "") ||
  "http://localhost:8080";

// 🔑 Firebase auth header helper
async function idToken() {
  const u = auth.currentUser;
  return u ? await u.getIdToken(false) : null;
}

async function authHeaders(extra = {}) {
  const t = await idToken();
  return {
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra,
  };
}
// client/src/api.js (add this near the bottom)
export async function createStudent(payload) {
  try {
    const response = await fetch(`${API}/admin/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed: ${response.status} ${text}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Server failed to generate invites");
    }

    return { ok: true, files: data.files || [] };
  } catch (e) {
    console.error("createStudent failed:", e);
    return { ok: false, error: e.message || "Failed to create invites" };
  }
}

// 🧹 Token cleaner
function cleanToken(raw = "") {
  if (!raw) return "";
  let s = String(raw).trim();

  try {
    const j = JSON.parse(s);
    if (j.t || j.token) return String(j.t || j.token);
  } catch (_) {}

  const m = s.match(/\/(?:verify|public-verify)\/([A-Za-z0-9_-]{3,255})/i);
  if (m && m[1]) return m[1];

  s = s
    .replace(/^.*(Admission Token[:\s]*)/i, "")
    .replace(/[^A-Za-z0-9_-]/g, "");
  return s;
}

/**
 * ✅ Verify token (public)
 */
export async function verifyCheckPublic(token) {
  const cleaned = cleanToken(token);
  try {
    const res = await fetch(`${API}/verify-json/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: cleaned }),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message || "Network error" };
  }
}

/**
 * ✅ Admit guest with PIN
 */
export async function verifyUse(token, pin = "1234") {
  const cleaned = cleanToken(token);
  try {
    const res = await fetch(`${API}/verify-json/use-with-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: cleaned, pin }),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message || "Network error" };
  }
}

/* ==============================
   🔐 Auth
   ============================== */
export async function login(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || "Login failed" };
  }
}

export async function logout() {
  try {
    await signOut(auth);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || "Logout failed" };
  }
}

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}
