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
   🎓 ADMIN: CREATE STUDENT INVITES
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
   🧹 TOKEN CLEANER (safe for Firestore)
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
   ✅ PUBLIC: VERIFY INVITE TOKEN
   ====================================================== */
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

/* ======================================================
   ✅ ADMIN/SCANNER: ADMIT GUEST WITH PIN
   ====================================================== */
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

/* ======================================================
   🔐 AUTHENTICATION (Login, Logout, State)
   ====================================================== */
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

/* ======================================================
   🧾 PDF DOWNLOAD HELPERS (Admin Dashboard)
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
    return { ok: false, error: e.message || "Download failed" };
  }
}

/* ======================================================
   🧩 FETCH FILE AS BLOB (for Cloudinary or direct URL)
   ====================================================== */
export async function fetchDownloadAsBlob(downloadUrl) {
  try {
    const res = await fetch(downloadUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
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
