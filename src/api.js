// client/src/api.js
import { auth } from "./firebaseClient";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

// API base (set REACT_APP_API in client/.env to override)
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

export function isAuthed() {
  return !!auth.currentUser;
}
export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

/** Helper to add Authorization header when idToken exists */
async function authHeaders() {
  const t = await idToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Admin: create PDFs (removed credentials: 'include' to avoid CORS preflight credential mismatch unless you specifically need cookies) */
export async function createStudent(payload) {
  try {
    const headers = {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    };
    const r = await fetch(`${API}/admin/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
      },
      body: JSON.stringify(payload),
    });
    return await r.json();
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

/** Scanner: check token */
export async function verifyCheck(token) {
  try {
    const headers = {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    };
    const r = await fetch(`${API}/verify-json/check`, {
      method: "POST",
      headers,
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
    const headers = {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    };
    const r = await fetch(`${API}/verify-json/use`, {
      method: "POST",
      headers,
      body: JSON.stringify({ token }),
    });
    return await r.json();
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

/**
 * Download proxy: use this when calling server /admin/download (server will stream and set Content-Disposition).
 * If the server requires auth, we include Authorization header. This returns a blob; callers typically call URL.createObjectURL(blob).
 */
export async function fetchDownloadAsBlob(downloadUrl) {
  try {
    const headers = await authHeaders();
    const resp = await fetch(downloadUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Download failed: ${resp.status} ${text}`);
    }
    const blob = await resp.blob();
    return {
      ok: true,
      blob,
      contentType: resp.headers.get("content-type") || "application/pdf",
    };
  } catch (e) {
    return { ok: false, error: e?.message || "Download failed" };
  }
}

export { API };
