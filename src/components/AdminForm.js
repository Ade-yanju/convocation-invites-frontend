import React, { useMemo, useState, useEffect } from "react";
import { createStudent, fetchDownloadAsBlob } from "../api";
import InvitePreview from "./InvitePreview";
import { useNavigate } from "react-router-dom";

/**
 * ADMIN FORM (Compatible with latest api.js)
 * ------------------------------------------------
 * ✔ Uses createStudent() from api.js
 * ✔ Uses fetchDownloadAsBlob() for secure PDF fetch
 * ✔ Handles full local invite history
 * ✔ Exports CSV + per-student & batch downloads
 * ✔ Fully responsive layout
 */

const PALETTE = {
  navy: "#0B2E4E",
  gold: "#D4AF37",
  softBg: "#f8fafc",
  panel: "#ffffff",
  border: "#e6eef6",
  muted: "#64748b",
};

const baseBtn = {
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
  border: "1px solid transparent",
};

const STORAGE_KEY = "du.invites.history.v1";

/* ---------------- UTILITIES ---------------- */

function downloadCSV(rows = [], filename = "invites.csv") {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Browser-safe file download */
async function downloadFile(url, filename) {
  if (!url) throw new Error("No file URL provided.");
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error(`Download failed (${resp.status})`);
  const blob = await resp.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename || "invite.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

/** Sequential download handler for batch */
async function downloadAllSequential(rows, onProgress = () => {}) {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const url = r.downloadUrl || r.publicUrl || "";
    const filename = r.filename || `invite-${i + 1}.pdf`;
    try {
      if (!url) {
        onProgress(i + 1, rows.length, `No URL for ${filename}`);
        continue;
      }
      onProgress(i + 1, rows.length, `Downloading ${filename}...`);
      await downloadFile(url, filename);
      await new Promise((res) => setTimeout(res, 300));
    } catch (err) {
      onProgress(i + 1, rows.length, `Failed: ${err?.message || err}`);
    }
  }
  onProgress(rows.length, rows.length, "✅ Done");
}

/* ---------------- COMPONENT ---------------- */

export default function AdminForm() {
  const nav = useNavigate();

  const [event, setEvent] = useState({
    title: "Dominion University Convocation 2025",
    date: "",
    time: "",
    venue: "",
    notes: "Please arrive 45 minutes early with a valid ID.",
    guestLimit: 2,
  });

  const [student, setStudent] = useState({
    matricNo: "",
    studentName: "",
    phone: "",
  });

  const [guests, setGuests] = useState([{ guestName: "", phone: "" }]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [generated, setGenerated] = useState([]);
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [bulkProgress, setBulkProgress] = useState({ i: 0, total: 0, msg: "" });

  // keep guests consistent with guestLimit
  useEffect(() => {
    const limit = Math.max(1, Number(event.guestLimit || 1));
    setGuests((prev) => {
      const copy = prev.slice(0, limit);
      while (copy.length < limit) copy.push({ guestName: "", phone: "" });
      return copy;
    });
  }, [event.guestLimit]);

  // persist history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {}
  }, [history]);

  const canGenerate = useMemo(() => {
    if (!student.matricNo.trim() || !student.studentName.trim()) return false;
    return guests.some((g) => g.guestName.trim() && g.phone.trim());
  }, [student, guests]);

  /* ---------------- SUBMIT ---------------- */
  async function onSubmit(e) {
    e?.preventDefault();
    if (!canGenerate) {
      setStatus("⚠️ Fill in student and guest info first.");
      return;
    }

    setBusy(true);
    setStatus("Generating invites…");

    const payloadGuests = guests
      .map((g) => ({
        guestName: g.guestName.trim(),
        phone: g.phone.trim(),
      }))
      .filter((g) => g.guestName && g.phone);

    try {
      const result = await createStudent({
        event,
        student,
        guests: payloadGuests,
      });

      if (!result.ok)
        throw new Error(result.error || "Invite generation failed");

      const files = Array.isArray(result.files) ? result.files : [result.files];
      setGenerated(files);
      setStatus("✅ Invites generated successfully.");

      const newRows = files.map((f) => ({
        id: f.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventVenue: event.venue,
        studentName: student.studentName,
        matricNo: student.matricNo,
        studentPhone: student.phone || "",
        guestName: f.guestName,
        guestPhone: f.phone,
        token: f.token,
        publicUrl: f.publicUrl,
        downloadUrl: f.downloadUrl,
        filename: f.filename,
      }));

      setHistory((prev) => [...newRows, ...prev].slice(0, 5000));
    } catch (err) {
      setStatus(`❌ ${err.message}`);
      setGenerated([]);
    } finally {
      setBusy(false);
    }
  }

  /* ---------------- DOWNLOAD HELPERS ---------------- */

  async function handleDownloadSingle(r) {
    try {
      const url = r.downloadUrl || r.publicUrl || "";
      if (!url) throw new Error("No valid URL found.");
      setStatus(`Downloading ${r.filename || "invite.pdf"}...`);
      await downloadFile(url, r.filename || `invite-${r.token}.pdf`);
      setStatus("✅ Downloaded.");
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  async function handleDownloadUsingApi(url, filename) {
    const { ok, blob, error } = await fetchDownloadAsBlob(url);
    if (!ok) {
      alert("Download failed: " + (error || "unknown"));
      return;
    }
    const a = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = filename || "invite.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
  }

  async function handleDownloadAll(rows) {
    if (!rows?.length) return;
    if (rows.length > 20 && !window.confirm(`Download ${rows.length} files?`))
      return;

    setBulkProgress({ i: 0, total: rows.length, msg: "Starting..." });
    await downloadAllSequential(rows, (i, total, msg) =>
      setBulkProgress({ i, total, msg })
    );
    setTimeout(() => setBulkProgress({ i: 0, total: 0, msg: "" }), 2000);
  }

  /* ---------------- RENDER ---------------- */

  return (
    <div className="du-app">
      <style>{`
        .du-app { background:${
          PALETTE.softBg
        }; min-height:100vh; padding:28px; font-family:Inter, sans-serif; }
        .du-btn { ${Object.entries(baseBtn)
          .map(([k, v]) => `${k}:${v};`)
          .join(" ")} }
        .du-primary { background:${PALETTE.navy}; color:#fff; }
        .du-ghost { background:transparent; border:1px solid ${
          PALETTE.border
        }; color:${PALETTE.navy}; }
      `}</style>

      <div
        className="du-topbar"
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <img src="/du-logo.png" alt="DU logo" style={{ height: 36 }} />
        <div>
          <div style={{ fontWeight: 800 }}>Admin Event Panel</div>
          <div style={{ fontSize: 13, color: PALETTE.muted }}>
            Manage student invites, export and verify.
          </div>
        </div>
        <button
          className="du-btn du-primary"
          style={{ marginLeft: "auto" }}
          onClick={() => nav("/scan")}
        >
          Open Scanner
        </button>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} style={{ marginBottom: 20 }}>
        <h3 style={{ color: PALETTE.navy }}>🎓 Create New Invites</h3>

        <div style={{ display: "grid", gap: 8 }}>
          <input
            className="du-input"
            placeholder="Student Name"
            value={student.studentName}
            onChange={(e) =>
              setStudent({ ...student, studentName: e.target.value })
            }
          />
          <input
            className="du-input"
            placeholder="Matric No"
            value={student.matricNo}
            onChange={(e) =>
              setStudent({ ...student, matricNo: e.target.value })
            }
          />
          <input
            className="du-input"
            placeholder="Student Phone (optional)"
            value={student.phone}
            onChange={(e) => setStudent({ ...student, phone: e.target.value })}
          />
        </div>

        <h4 style={{ marginTop: 10 }}>Guests (max {event.guestLimit})</h4>
        {guests.map((g, i) => (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <input
              className="du-input"
              placeholder={`Guest ${i + 1} name`}
              value={g.guestName}
              onChange={(e) =>
                setGuests((arr) =>
                  arr.map((r, j) =>
                    j === i ? { ...r, guestName: e.target.value } : r
                  )
                )
              }
            />
            <input
              className="du-input"
              placeholder="Phone"
              value={g.phone}
              onChange={(e) =>
                setGuests((arr) =>
                  arr.map((r, j) =>
                    j === i ? { ...r, phone: e.target.value } : r
                  )
                )
              }
            />
          </div>
        ))}

        <button
          type="submit"
          className="du-btn du-primary"
          disabled={!canGenerate || busy}
          style={{ marginTop: 12 }}
        >
          {busy ? "Generating…" : "Generate Invites"}
        </button>

        <p style={{ color: PALETTE.muted, marginTop: 8 }}>{status}</p>
      </form>

      {/* Generated Table */}
      {generated.length > 0 && (
        <>
          <h3>Generated Invites</h3>
          <table className="du-results-table">
            <tbody>
              {generated.map((r, i) => (
                <tr key={i}>
                  <td>{r.guestName}</td>
                  <td>
                    <button
                      className="du-btn du-ghost"
                      onClick={() => handleDownloadSingle(r)}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
