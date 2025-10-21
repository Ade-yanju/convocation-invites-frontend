// client/src/api.js
import { auth } from "./firebaseClient";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

// 🌐 API base URL
export const API =
  process.env.REACT_APP_API ||
  (typeof window !== "undefined"
    ? window.location.origin.replace(/\/$/, "")
    : "") ||
  "http://localhost:8080";

// 🔐 Firebase authentication token helper
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

// src/api.js
// 🧹 Clean token just like backend
function cleanToken(raw = "") {
  return String(raw)
    .trim()
    .replace(/^.*(Admission Token[:\s]*)/i, "")
    .replace(/^.*\/verify\//, "")
    .replace(/[^A-Za-z0-9_-]/g, "");
}

/**
 * ✅ Check if token is valid (public)
 */
export async function verifyCheckPublic(token) {
  const cleanedToken = String(token || "")
    .trim()
    .replace(/^.*\/verify\//, "")
    .replace(/[^A-Za-z0-9_-]/g, "");

  try {
    const res = await fetch(`${API}/verify/json/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: cleanedToken }),
    });
    return await res.json();
  } catch (e) {
    console.error("verifyCheckPublic failed:", e);
    return { ok: false, error: e?.message || "Network error" };
  }
}

/**
 * ✅ Mark invite as used (admin/scanner)
 */
export async function verifyUse(token) {
  const cleanedToken = cleanToken(token);
  try {
    const res = await fetch(`${API}/verify-json/use-with-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: cleanedToken,
        pin: "1234", // 🔹 Change to your configured PIN (VERIFY_ADMIT_PIN)
      }),
    });
    const json = await res.json();
    return json;
  } catch (err) {
    console.error("verifyUse failed:", err);
    return { ok: false, error: err.message || "Network error" };
  }
}

/* ==============================
   🔑 Authentication Functions
   ============================== */
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

/* ==============================
   🎓 Student & Invite Handling
   ============================== */
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

/* ==============================
   🧾 Verification (Admin Auth)
   ============================== */
export async function verifyCheck(token) {
  try {
    const headers = await authHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${API}/verify/json/check`, {
      method: "POST",
      headers,
      body: JSON.stringify({ token }),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

/* ==============================
   🔐 PIN-based Use (optional)
   ============================== */
export async function verifyUseWithPin(token, pin) {
  const cleanedToken = String(token)
    .trim()
    .replace(/^.*(Admission Token[:\s]*)/i, "")
    .replace(/^.*\/verify\//, "")
    .replace(/[^A-Za-z0-9_-]/g, "");

  try {
    const res = await fetch(`${API}/verify/json/use-with-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: cleanedToken, pin }),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

/* ==============================
   📄 PDF Download Helpers
   ============================== */
export async function downloadInvitePdf(token) {
  try {
    const t = await idToken();
    if (!t) return { ok: false, error: "Unauthorized" };

    const res = await fetch(
      `${API}/admin/download/${encodeURIComponent(token)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${t}` },
      }
    );

    if (!res.ok) {
      let msg = `Failed to download: ${res.status}`;
      try {
        const j = await res.json();
        msg = j?.error || JSON.stringify(j);
      } catch {
        try {
          const txt = await res.text();
          if (txt) msg = txt;
        } catch {}
      }
      return { ok: false, error: msg };
    }

    const blob = await res.blob();
    return { ok: true, blob };
  } catch (e) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

export async function fetchDownloadAsBlob(downloadUrl) {
  try {
    const headers = await authHeaders();
    const res = await fetch(downloadUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Download failed: ${res.status} ${txt}`);
    }
    const blob = await res.blob();
    return {
      ok: true,
      blob,
      contentType:
        res.headers.get("content-type") || "application/octet-stream",
    };
  } catch (e) {
    return { ok: false, error: e?.message || "Download failed" };
  }
}
