// client/src/components/AdminForm.jsx
import React, { useMemo, useState, useEffect } from "react";
import { createStudent } from "../api";
import InvitePreview from "./InvitePreview";
import { useNavigate } from "react-router-dom";
import { fetchDownloadAsBlob } from "../api";

/**
 * Upgraded AdminForm (drop-in replacement)
 * - Export CSV for current batch or full history
 * - Per-invite direct PDF download (fetch -> save)
 * - Bulk "Download all PDFs" (sequential)
 * - No requirement to "create twice" to enable download
 *
 * NOTE: If you plan to download many PDFs at once (100+), consider
 * adding a server-side ZIP endpoint to avoid browser multiple-download limits.
 */

/* ---------------- Palette & base styles ---------------- */
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

/* ---------------- Utilities ---------------- */
function downloadCSV(rows = [], filename = "invites.csv") {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h] ?? "";
          return `"${String(v).replace(/"/g, '""')}"`;
        })
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

/**
 * Download a single file (PDF) by fetching and saving it.
 * Uses fetch to get blob and triggers a client download.
 */
async function downloadFile(url, filename) {
  if (!url) throw new Error("No URL");
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error(`Failed to fetch ${resp.status}`);
  const blob = await resp.blob();
  const a = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  a.href = objectUrl;
  a.download = filename || "invite.pdf";
  // append to DOM to make Safari happy
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
}

/**
 * Download all files sequentially. This keeps memory usage low and
 * avoids firing lots of simultaneous requests that could get blocked.
 *
 * NOTE: browsers may block multiple downloads or require user interaction.
 * For large batches consider a server-side ZIP endpoint (recommended).
 */
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
      // eslint-disable-next-line no-await-in-loop
      await downloadFile(url, filename);
      // small pause between downloads so browser doesn't choke
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, 350));
    } catch (err) {
      onProgress(i + 1, rows.length, `Failed: ${err?.message || err}`);
    }
  }
  onProgress(rows.length, rows.length, "Done");
}

/* ---------------- Component ---------------- */
export default function AdminForm() {
  const nav = useNavigate();

  // event
  const [event, setEvent] = useState({
    title: "Dominion University Convocation 2025",
    date: "",
    time: "",
    venue: "",
    notes: "Please arrive 45 minutes early with a valid ID.",
    guestLimit: 2,
  });

  // form state
  const [student, setStudent] = useState({
    matricNo: "",
    studentName: "",
    phone: "",
  });
  const [guests, setGuests] = useState(() => [{ guestName: "", phone: "" }]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  // generated for current session/batch (returned by server)
  const [generated, setGenerated] = useState([]);

  // persistent history (all previously generated invites)
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // UI: download progress for bulk
  const [bulkProgress, setBulkProgress] = useState({ i: 0, total: 0, msg: "" });

  // responsive
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 940);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 940);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // keep guests array length to guestLimit
  useEffect(() => {
    const limit = Math.max(1, Number(event.guestLimit || 1));
    setGuests((prev) => {
      const copy = prev.slice(0, limit);
      while (copy.length < limit) copy.push({ guestName: "", phone: "" });
      return copy;
    });
  }, [event.guestLimit]);

  // computed
  const canGenerate = useMemo(() => {
    if (!student.matricNo.trim() || !student.studentName.trim()) return false;
    return guests.some((g) => g.guestName.trim() && g.phone.trim());
  }, [student, guests]);

  function setGuestAt(i, patch) {
    setGuests((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], ...patch };
      return copy;
    });
  }
  function addGuestRow() {
    if (guests.length >= Number(event.guestLimit || 1)) return;
    setGuests((p) => [...p, { guestName: "", phone: "" }]);
  }
  function removeGuestRow(i) {
    setGuests((p) => p.filter((_, idx) => idx !== i));
  }

  // persist history to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  // submit -> create invites via API
  async function onSubmit(e) {
    e?.preventDefault();
    if (!canGenerate) {
      setStatus(
        "Please provide student details and at least one guest (name + phone)."
      );
      return;
    }
    setBusy(true);
    setStatus("Generating invites…");

    const payloadGuests = guests
      .map((g) => ({
        guestName: (g.guestName || "").trim(),
        phone: (g.phone || "").trim(),
      }))
      .filter((g) => g.guestName && g.phone);

    try {
      const out = await createStudent({
        event,
        student,
        guests: payloadGuests,
      });

      if (!out?.ok) {
        setStatus(`Error: ${out?.error || "Unknown error"}`);
        setGenerated([]);
      } else {
        const files = out.files || [];
        // ensure files is an array even if server returns a single object
        setGenerated(Array.isArray(files) ? files : [files]);
        setStatus("Done — invites generated.");

        // append to history: create friendly entries (one row per guest)
        const newRows = (Array.isArray(files) ? files : [files]).map((f) => ({
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
          publicUrl: f.publicUrl || "",
          downloadUrl: f.downloadUrl || "",
          filename: f.filename || "",
        }));

        setHistory((prev) => {
          const merged = [...newRows, ...prev];
          return merged.slice(0, 5000);
        });
      }
    } catch (err) {
      setStatus(`Network error: ${err?.message || err}`);
      setGenerated([]);
    } finally {
      setBusy(false);
    }
  }

  // CSV rows (current batch + full history)
  const currentBatchCsvRows = useMemo(
    () =>
      generated.map((r) => ({
        guestName: r.guestName,
        guestPhone: r.phone,
        studentName: student.studentName,
        studentPhone: student.phone || "",
        matricNo: student.matricNo,
        token: r.token,
        publicUrl: r.downloadUrl || r.publicUrl || "",
        filename: r.filename || "",
      })),
    [generated, student]
  );

  const fullHistoryCsvRows = useMemo(
    () =>
      history.map((h) => ({
        createdAt: h.createdAt,
        eventTitle: h.eventTitle,
        eventDate: h.eventDate,
        eventTime: h.eventTime,
        eventVenue: h.eventVenue,
        studentName: h.studentName,
        studentPhone: h.studentPhone,
        matricNo: h.matricNo,
        guestName: h.guestName,
        guestPhone: h.guestPhone,
        token: h.token,
        publicUrl: h.publicUrl || h.downloadUrl || "",
        filename: h.filename || "",
      })),
    [history]
  );

  // group history by student for listing
  const historyByStudent = useMemo(() => {
    const map = new Map();
    for (const row of history) {
      const key = `${row.matricNo}::${row.studentName}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return Array.from(map.entries()).map(([k, v]) => ({
      key: k,
      student: v[0].studentName,
      matricNo: v[0].matricNo,
      rows: v,
    }));
  }, [history]);

  // inline CSS
  const injectedCss = `
    .du-app { background: ${
      PALETTE.softBg
    }; min-height:100vh; padding:28px; box-sizing:border-box; font-family: Inter, system-ui, Arial, sans-serif; }
    .du-topbar { display:flex; align-items:center; gap:12px; padding:12px 18px; background: linear-gradient(90deg, ${
      PALETTE.navy
    }, rgba(11,46,78,0.9)); color: #fff; border-radius:12px; box-shadow: 0 8px 28px rgba(11,46,78,0.06); }
    .du-logo { height:36px; width:auto; }
    .du-grid { display:grid; grid-template-columns: 1fr 480px; gap:18px; margin-top:16px; align-items:start; }
    .du-card { background: ${
      PALETTE.panel
    }; border-radius:12px; border:1px solid ${
    PALETTE.border
  }; overflow:hidden; box-shadow: 0 6px 20px rgba(11,46,78,0.04); }
    .du-header { padding:14px 16px; border-bottom:1px solid ${
      PALETTE.border
    }; font-weight:800; color:${PALETTE.navy}; }
    .du-body { padding:16px; }
    .du-form-grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
    .du-input, .du-textarea { width:100%; padding:10px 12px; border-radius:10px; border:1px solid ${
      PALETTE.border
    }; box-sizing:border-box; font-size:14px; }
    .du-textarea { min-height:90px; resize:vertical; }
    .du-guest-row { display:grid; grid-template-columns: 1fr 160px 44px; gap:8px; align-items:center; margin-bottom:6px; }
    .du-btn { ${Object.entries(baseBtn)
      .map(([k, v]) => `${k}:${v};`)
      .join(" ")} }
    .du-primary { background:${PALETTE.navy}; color:#fff; }
    .du-ghost { background:transparent; border:1px solid ${
      PALETTE.border
    }; color:${PALETTE.navy}; }
    .du-results-table { width:100%; border-collapse:collapse; margin-top:8px; font-size:14px; }
    .du-results-table th { text-align:left; padding:10px; color:${
      PALETTE.muted
    }; border-bottom:1px solid ${PALETTE.border}; }
    .du-results-table td { padding:10px; border-bottom:1px solid ${
      PALETTE.border
    }; vertical-align:top; }
    .du-hint { color:${PALETTE.muted}; font-size:13px; }
    .du-top-actions { margin-left:auto; display:flex; gap:8px; align-items:center; }
    @media (max-width: 980px) { .du-grid { grid-template-columns: 1fr; } .du-topbar { flex-direction:column; align-items:flex-start; gap:8px; } }
  `;

  /* ---------------- Actions available in UI ---------------- */

  // download a single generated invite PDF (prefer downloadUrl)
  async function handleDownloadSingle(r) {
    try {
      setStatus(`Downloading ${r.filename || "invite.pdf"}...`);
      const url = r.downloadUrl || r.publicUrl || "";
      if (!url) throw new Error("No download URL available for this invite.");
      await downloadFile(
        url,
        r.filename || `invite-${r.token || Date.now()}.pdf`
      );
      setStatus("Downloaded.");
    } catch (err) {
      setStatus(`Download failed: ${err?.message || err}`);
    }
  }

  // somewhere in AdminForm.jsx (if you want to use fetchDownloadAsBlob)

  async function handleDownloadUsingApi(downloadUrl, filename) {
    const { ok, blob, error } = await fetchDownloadAsBlob(downloadUrl);
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
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  }

  // bulk download for provided rows (current batch or history subset)
  async function handleDownloadAll(rows) {
    if (!rows || rows.length === 0) return;
    // warn user about many downloads
    if (rows.length > 20) {
      const ok = window.confirm(
        `You are about to download ${rows.length} files. This may open many browser prompts or be blocked. For large batches consider generating a server-side ZIP instead. Continue?`
      );
      if (!ok) return;
    }
    setBulkProgress({ i: 0, total: rows.length, msg: "Starting..." });
    await downloadAllSequential(rows, (i, total, msg) =>
      setBulkProgress({ i, total, msg })
    );
    setTimeout(() => setBulkProgress({ i: 0, total: 0, msg: "" }), 2000);
  }

  return (
    <div className="du-app" role="main">
      <style>{injectedCss}</style>

      <div className="du-topbar" role="banner">
        <img
          className="du-logo"
          src="/du-logo.png"
          alt="Dominion University logo"
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Event Management</div>
          <div style={{ fontSize: 13, opacity: 0.95 }}>
            Event QR Invites — create, manage and export single-entry invites
          </div>
        </div>

        <div className="du-top-actions" aria-hidden={false}>
          <button
            className="du-btn du-ghost"
            onClick={() =>
              downloadCSV(
                fullHistoryCsvRows,
                `invites_history_${new Date().toISOString().slice(0, 10)}.csv`
              )
            }
            title="Export full history"
          >
            Export full CSV
          </button>

          <button
            className="du-btn du-primary"
            onClick={() => nav("/scan")}
            title="Open scanner"
            aria-label="Open scanner"
          >
            Open Scanner
          </button>
        </div>
      </div>

      <div className="du-grid">
        {/* left: form */}
        <div className="du-card" aria-labelledby="event-generator">
          <div className="du-header" id="event-generator">
            Event & Invite Generator
          </div>
          <div className="du-body">
            <form onSubmit={onSubmit}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 8, fontWeight: 800 }}>
                  Event details
                </div>

                <div className="du-form-grid">
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 6,
                        color: PALETTE.navy,
                        fontWeight: 700,
                      }}
                    >
                      Event title
                    </label>
                    <input
                      className="du-input"
                      value={event.title}
                      onChange={(e) =>
                        setEvent((p) => ({ ...p, title: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 6,
                        color: PALETTE.navy,
                        fontWeight: 700,
                      }}
                    >
                      Guest limit (per student)
                    </label>
                    <input
                      className="du-input"
                      type="number"
                      min={1}
                      max={20}
                      value={event.guestLimit}
                      onChange={(e) =>
                        setEvent((p) => ({
                          ...p,
                          guestLimit: Math.max(1, Number(e.target.value || 1)),
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 6,
                        color: PALETTE.navy,
                        fontWeight: 700,
                      }}
                    >
                      Date
                    </label>
                    <input
                      className="du-input"
                      type="date"
                      value={event.date}
                      onChange={(e) =>
                        setEvent((p) => ({ ...p, date: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 6,
                        color: PALETTE.navy,
                        fontWeight: 700,
                      }}
                    >
                      Time
                    </label>
                    <input
                      className="du-input"
                      type="time"
                      value={event.time}
                      onChange={(e) =>
                        setEvent((p) => ({ ...p, time: e.target.value }))
                      }
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 6,
                        color: PALETTE.navy,
                        fontWeight: 700,
                      }}
                    >
                      Venue
                    </label>
                    <input
                      className="du-input"
                      value={event.venue}
                      onChange={(e) =>
                        setEvent((p) => ({ ...p, venue: e.target.value }))
                      }
                      placeholder="Main Auditorium, Dominion University"
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 6,
                        color: PALETTE.navy,
                        fontWeight: 700,
                      }}
                    >
                      Notes
                    </label>
                    <textarea
                      className="du-textarea"
                      value={event.notes}
                      onChange={(e) =>
                        setEvent((p) => ({ ...p, notes: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ marginBottom: 8, fontWeight: 800 }}>Student</div>
                <div className="du-form-grid" style={{ marginBottom: 12 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 6,
                        color: PALETTE.navy,
                        fontWeight: 700,
                      }}
                    >
                      Matric No
                    </label>
                    <input
                      className="du-input"
                      value={student.matricNo}
                      onChange={(e) =>
                        setStudent((p) => ({ ...p, matricNo: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 6,
                        color: PALETTE.navy,
                        fontWeight: 700,
                      }}
                    >
                      Student name
                    </label>
                    <input
                      className="du-input"
                      value={student.studentName}
                      onChange={(e) =>
                        setStudent((p) => ({
                          ...p,
                          studentName: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 6,
                        color: PALETTE.navy,
                        fontWeight: 700,
                      }}
                    >
                      Student phone (optional)
                    </label>
                    <input
                      className="du-input"
                      value={student.phone}
                      onChange={(e) =>
                        setStudent((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <div style={{ marginBottom: 8, fontWeight: 800 }}>
                  Guests (max {event.guestLimit})
                </div>
                <div>
                  {guests.map((g, i) => (
                    <div key={i} className="du-guest-row">
                      <input
                        className="du-input"
                        placeholder={`Guest ${i + 1} name`}
                        value={g.guestName}
                        onChange={(e) =>
                          setGuestAt(i, { guestName: e.target.value })
                        }
                      />
                      <input
                        className="du-input"
                        placeholder="Phone (WhatsApp)"
                        value={g.phone}
                        onChange={(e) =>
                          setGuestAt(i, { phone: e.target.value })
                        }
                      />
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          justifyContent: "flex-end",
                        }}
                      >
                        {guests.length > 1 && (
                          <button
                            type="button"
                            className="du-btn du-ghost"
                            onClick={() => removeGuestRow(i)}
                            aria-label="Remove guest"
                          >
                            −
                          </button>
                        )}
                        {i === guests.length - 1 &&
                          guests.length < Number(event.guestLimit || 1) && (
                            <button
                              type="button"
                              className="du-btn du-primary"
                              onClick={addGuestRow}
                              aria-label="Add guest"
                            >
                              +
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <button
                    type="submit"
                    className="du-btn du-primary"
                    disabled={!canGenerate || busy}
                    style={{ opacity: !canGenerate ? 0.6 : 1 }}
                  >
                    {busy ? "Generating…" : "Generate invites"}
                  </button>

                  <button
                    type="button"
                    className="du-btn du-ghost"
                    onClick={() =>
                      setGuests(
                        Array.from(
                          {
                            length: Math.max(1, Number(event.guestLimit || 1)),
                          },
                          () => ({ guestName: "", phone: "" })
                        )
                      )
                    }
                  >
                    Reset guests
                  </button>

                  <div style={{ marginLeft: "auto", color: PALETTE.muted }}>
                    {status}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* right column */}
        <div style={{ display: "grid", gap: 12 }}>
          <div className="du-card">
            <div className="du-header">Invite Preview</div>
            <div className="du-body">
              <InvitePreview
                studentName={student.studentName || "Student Name"}
                guestName={(guests[0] && guests[0].guestName) || "Guest Name"}
                event={{
                  title: event.title,
                  date: event.date,
                  time: event.time,
                  venue: event.venue,
                  notes: event.notes,
                }}
              />
            </div>
          </div>

          <div className="du-card">
            <div className="du-header">Generated Invites & History</div>
            <div className="du-body">
              {/* current batch actions */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  className="du-btn du-primary"
                  onClick={() =>
                    downloadCSV(
                      currentBatchCsvRows,
                      `invites_batch_${student.matricNo || "batch"}.csv`
                    )
                  }
                  disabled={!currentBatchCsvRows.length}
                >
                  Export current batch CSV
                </button>

                <button
                  className="du-btn du-ghost"
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Clear all saved invite history? This cannot be undone locally."
                      )
                    )
                      return;
                    setHistory([]);
                    setGenerated([]);
                    try {
                      localStorage.removeItem(STORAGE_KEY);
                    } catch {}
                  }}
                >
                  Clear history
                </button>

                <button
                  className="du-btn du-primary"
                  style={{ marginLeft: "auto" }}
                  disabled={!generated.length}
                  onClick={() =>
                    handleDownloadAll(
                      generated.map((r) => ({
                        downloadUrl: r.downloadUrl,
                        publicUrl: r.publicUrl,
                        filename:
                          r.filename || `invite-${r.token || Date.now()}.pdf`,
                      }))
                    )
                  }
                >
                  Download all PDFs (batch)
                </button>
              </div>

              {/* download progress */}
              {bulkProgress.total > 0 && (
                <div style={{ marginBottom: 8, color: PALETTE.muted }}>
                  {bulkProgress.i}/{bulkProgress.total} — {bulkProgress.msg}
                </div>
              )}

              {/* results table for current batch */}
              {generated.length > 0 && (
                <>
                  <div style={{ marginBottom: 8, fontWeight: 800 }}>
                    Last generated (this batch)
                  </div>
                  <table className="du-results-table" role="table">
                    <thead>
                      <tr>
                        <th>Guest</th>
                        <th>File</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generated.map((r, idx) => {
                        const publicUrl = r.downloadUrl || r.publicUrl || "";
                        const filename =
                          r.filename ||
                          (publicUrl
                            ? publicUrl.split("/").pop()
                            : `invite-${idx + 1}.pdf`);
                        const waLink =
                          r.whatsappLink ||
                          `https://wa.me/${String(r.phone || "").replace(
                            /\D/g,
                            ""
                          )}?text=${encodeURIComponent(r.caption || "")}`;
                        return (
                          <tr key={r.token || idx}>
                            <td>
                              <div style={{ fontWeight: 700 }}>
                                {r.guestName}
                              </div>
                              <div
                                style={{ color: PALETTE.muted, fontSize: 13 }}
                              >
                                {r.phone}
                              </div>
                            </td>
                            <td>
                              {publicUrl ? (
                                <a
                                  href={publicUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {filename}
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  flexWrap: "wrap",
                                }}
                              >
                                {publicUrl && (
                                  <button
                                    className="du-btn du-ghost"
                                    onClick={() =>
                                      handleDownloadSingle({
                                        downloadUrl: r.downloadUrl,
                                        publicUrl: r.publicUrl,
                                        filename: filename,
                                      })
                                    }
                                  >
                                    Download
                                  </button>
                                )}
                                {publicUrl && (
                                  <a
                                    href={publicUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <button className="du-btn du-ghost">
                                      Open
                                    </button>
                                  </a>
                                )}
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <button className="du-btn du-primary">
                                    WhatsApp
                                  </button>
                                </a>
                                <button
                                  className="du-btn du-ghost"
                                  onClick={() =>
                                    publicUrl &&
                                    navigator.clipboard.writeText(publicUrl)
                                  }
                                >
                                  Copy link
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}

              {/* history listing grouped by student */}
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 8, fontWeight: 800 }}>
                  Saved history
                </div>
                {history.length === 0 ? (
                  <div className="du-hint">
                    No saved invites yet (local history).
                  </div>
                ) : (
                  <>
                    {historyByStudent.slice(0, 20).map((grp) => (
                      <div key={grp.key} style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800 }}>
                              {grp.student}{" "}
                              <span
                                style={{ color: PALETTE.muted, fontSize: 13 }}
                              >
                                ({grp.matricNo})
                              </span>
                            </div>
                            <div style={{ color: PALETTE.muted, fontSize: 13 }}>
                              {grp.rows.length} invite(s)
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="du-btn du-ghost"
                              onClick={() =>
                                downloadCSV(
                                  grp.rows.map((r) => ({
                                    createdAt: r.createdAt,
                                    studentName: r.studentName,
                                    matricNo: r.matricNo,
                                    guestName: r.guestName,
                                    guestPhone: r.guestPhone,
                                    token: r.token,
                                    publicUrl: r.publicUrl,
                                  })),
                                  `invites_${grp.matricNo}.csv`
                                )
                              }
                            >
                              Export student CSV
                            </button>
                            <button
                              className="du-btn du-primary"
                              onClick={() =>
                                handleDownloadAll(
                                  grp.rows.map((r) => ({
                                    downloadUrl: r.downloadUrl,
                                    publicUrl: r.publicUrl,
                                    filename:
                                      r.filename ||
                                      `${grp.matricNo}_${r.guestName}.pdf`,
                                  }))
                                )
                              }
                            >
                              Download student PDFs
                            </button>
                          </div>
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                            }}
                          >
                            <thead>
                              <tr
                                style={{ color: PALETTE.muted, fontSize: 13 }}
                              >
                                <th style={{ textAlign: "left", padding: 8 }}>
                                  Guest
                                </th>
                                <th style={{ textAlign: "left", padding: 8 }}>
                                  Phone
                                </th>
                                <th style={{ textAlign: "left", padding: 8 }}>
                                  File
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {grp.rows.map((r) => (
                                <tr
                                  key={r.token}
                                  style={{
                                    borderTop: "1px solid " + PALETTE.border,
                                  }}
                                >
                                  <td
                                    style={{ padding: 8, verticalAlign: "top" }}
                                  >
                                    {r.guestName}
                                  </td>
                                  <td
                                    style={{ padding: 8, verticalAlign: "top" }}
                                  >
                                    {r.guestPhone}
                                  </td>
                                  <td
                                    style={{ padding: 8, verticalAlign: "top" }}
                                  >
                                    {r.publicUrl ? (
                                      <a
                                        href={r.publicUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {r.filename ||
                                          r.publicUrl.split("/").pop()}
                                      </a>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    {history.length > 20 && (
                      <div style={{ color: PALETTE.muted, fontSize: 13 }}>
                        Showing 20 most recent student groups. Full export
                        available from top bar.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
