import { auth } from "./firebaseClient";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

/* ======================================================
   🌍 BASE API CONFIGURATION
   ====================================================== */
export const API =
  process.env.REACT_APP_API ||
  (typeof window !== "undefined"
    ? window.location.origin.replace(/\/$/, "")
    : "") ||
  "http://localhost:8080";

/* ======================================================
   🔐 FIREBASE AUTH HELPERS
   ====================================================== */
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

/* ======================================================
   🧹 CLEAN TOKEN (MATCHES BACKEND SANITIZER)
   ====================================================== */
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

/* ======================================================
   🎓 CREATE STUDENT INVITES (ADMIN)
   ====================================================== */
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

/* ======================================================
   ✅ VERIFY TOKEN (PUBLIC)
   ====================================================== */
export async function verifyCheckPublic(token) {
  const cleanedToken = cleanToken(token);
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

/* ======================================================
   ✅ MARK INVITE AS USED (SCANNER / ADMIN)
   ====================================================== */
export async function verifyUse(token) {
  const cleanedToken = cleanToken(token);
  try {
    const res = await fetch(`${API}/verify-json/use-with-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: cleanedToken,
        pin: "1234", // 🔹 Match process.env.GATE_PIN in backend
      }),
    });
    return await res.json();
  } catch (err) {
    console.error("verifyUse failed:", err);
    return { ok: false, error: err.message || "Network error" };
  }
}

/* ======================================================
   ✅ VERIFY TOKEN (ADMIN-AUTHED VERSION)
   ====================================================== */
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

/* ======================================================
   ✅ USE TOKEN WITH CUSTOM PIN (SCANNER/GATE)
   ====================================================== */
export async function verifyUseWithPin(token, pin) {
  const cleanedToken = cleanToken(token);
  try {
    const res = await fetch(`${API}/verify/json/use-with-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: cleanedToken, pin }),
    });
    return await res.json();
  } catch (e) {
    console.error("verifyUseWithPin failed:", e);
    return { ok: false, error: e?.message || "Network error" };
  }
}

/* ======================================================
   🔐 AUTHENTICATION FUNCTIONS
   ====================================================== */
export async function login(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (e) {
    console.error("login failed:", e);
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

/* ======================================================
   📄 DOWNLOAD INVITE PDF (ADMIN)
   ====================================================== */
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
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`Download failed: ${msg}`);
    }

    const blob = await res.blob();
    return { ok: true, blob };
  } catch (e) {
    console.error("downloadInvitePdf failed:", e);
    return { ok: false, error: e?.message || "Download failed" };
  }
}

/* ======================================================
   🧩 FETCH DOWNLOAD AS BLOB (CLOUDINARY or REMOTE URL)
   ====================================================== */
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
    console.error("fetchDownloadAsBlob failed:", e);
    return { ok: false, error: e?.message || "Download failed" };
  }
}
