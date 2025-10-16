// client/src/api.js
import { auth } from "./firebaseClient";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

export const API =
  process.env.REACT_APP_API ||
  (typeof window !== "undefined"
    ? window.location.origin.replace(/\/$/, "")
    : "") ||
  "http://localhost:8080";

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

export async function verifyCheck(token) {
  try {
    const headers = await authHeaders({ "Content-Type": "application/json" });
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

export async function verifyUse(token) {
  try {
    const r = await fetch(`${API}/verify/json/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    return await r.json();
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

export async function verifyCheckPublic(token) {
  try {
    const res = await fetch(
      `https://invite-server-0gv6.onrender.com/verify-json/check/${token}`
    );
    return res.json();
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

export async function verifyUseWithPin(token, pin) {
  try {
    const r = await fetch(`${API}/verify-json/use-with-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, pin }),
    });
    return await r.json();
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

export async function downloadInvitePdf(token) {
  try {
    const t = await idToken();
    if (!t) return { ok: false, error: "Unauthorized" };

    const r = await fetch(
      `${API}/admin/download/${encodeURIComponent(token)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${t}` },
      }
    );

    if (!r.ok) {
      let msg = `Failed to download: ${r.status}`;
      try {
        const j = await r.json();
        msg = j?.error || JSON.stringify(j);
      } catch {
        try {
          const txt = await r.text();
          if (txt) msg = txt;
        } catch {}
      }
      return { ok: false, error: msg };
    }

    const blob = await r.blob();
    return { ok: true, blob };
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

export async function fetchDownloadAsBlob(downloadUrl) {
  try {
    const headers = await authHeaders();
    const resp = await fetch(downloadUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Download failed: ${resp.status} ${txt}`);
    }
    const blob = await resp.blob();
    return {
      ok: true,
      blob,
      contentType:
        resp.headers.get("content-type") || "application/octet-stream",
    };
  } catch (e) {
    return { ok: false, error: e?.message || "Download failed" };
  }
}
