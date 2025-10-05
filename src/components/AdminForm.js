import React, { useMemo, useState } from "react";
import { createStudent } from "../api";
import InvitePreview from "./InvitePreview";

// ---------- Inline styles ----------
const S = {
  page: {
    maxWidth: 960,
    margin: "0 auto",
    padding: 16,
    fontFamily: "Inter, system-ui, Arial, sans-serif",
    color: "#0f172a",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    background: "#fff",
    marginBottom: 24,
  },
  header: { padding: "16px 20px 8px 20px", borderBottom: "1px solid #eef2f7" },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontWeight: 600,
    fontSize: 18,
  },
  badge: {
    display: "inline-flex",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    background: "rgba(37, 99, 235, 0.12)",
    color: "#2563eb",
    fontWeight: 700,
  },
  body: { padding: 20 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    height: 40,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.02)",
  },
  sep: { height: 1, background: "#f1f5f9", margin: "8px 0" },
  group: { border: "1px solid #eef2f7", borderRadius: 16, padding: 16 },
  tag: (outline = false) => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    color: "#2563eb",
    background: outline ? "transparent" : "rgba(37,99,235,0.08)",
    border: outline ? "1px solid rgba(37,99,235,0.35)" : "none",
  }),
  btnRow: { display: "flex", alignItems: "center", gap: 12, paddingTop: 8 },
  btn: (kind = "primary", size = "md") => {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      border: "1px solid transparent",
      cursor: "pointer",
      fontWeight: 600,
      userSelect: "none",
    };
    const sizes = {
      sm: { height: 34, padding: "0 12px", fontSize: 12 },
      md: { height: 40, padding: "0 16px", fontSize: 14 },
    };
    const kinds = {
      primary: { background: "#2563eb", color: "#fff" },
      secondary: {
        background: "#f1f5f9",
        color: "#0f172a",
        border: "1px solid #e2e8f0",
      },
      outline: {
        background: "#fff",
        color: "#0f172a",
        border: "1px solid #e2e8f0",
      },
      ghost: { background: "transparent", color: "#0f172a" },
    };
    return { ...base, ...sizes[size], ...kinds[kind] };
  },
  hint: { fontSize: 12, color: "#64748b" },
  grid: { display: "grid", gridTemplateColumns: "1fr", gap: 24 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left",
    color: "#64748b",
    borderBottom: "1px solid #e5e7eb",
    padding: "10px 12px",
  },
  td: { borderBottom: "1px solid #f1f5f9", padding: "12px" },
  link: {
    color: "#2563eb",
    textDecoration: "underline",
    textUnderlineOffset: 3,
  },
  status: { fontSize: 12, color: "#64748b" },
};

// -------- ResultRow (uses backend caption + links) --------
function ResultRow({ row }) {
  // Prefer backend values. Compute fallbacks if absent.
  const publicUrl =
    row.publicUrl ||
    (row.pdfPath?.includes("uploads/")
      ? `${process.env.REACT_APP_API || "http://localhost:8080"}/uploads/${
          row.pdfPath.split("uploads/")[1]
        }`
      : "");

  const filename =
    row.filename || (publicUrl ? publicUrl.split("/").pop() : "");
  const caption =
    row.caption ||
    `Hello ${row.guestName},

You are invited to the convocation ceremony.

Please download your QR invite PDF and bring it to the hall:
${publicUrl}`;

  const waTextLink =
    row.whatsappLink ||
    `https://wa.me/${String(row.phone || "").replace(
      /\D/g,
      ""
    )}?text=${encodeURIComponent(caption)}`;

  const canShare = !!(navigator && navigator.share);

  async function shareWithFile() {
    try {
      // Try to fetch PDF and share as a file (best UX on mobile)
      const resp = await fetch(publicUrl);
      const blob = await resp.blob();
      const file = new File([blob], filename || "invite.pdf", {
        type: "application/pdf",
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: caption,
          title: "Convocation Invite",
        });
      } else {
        // Fallback to URL share if files aren’t supported
        await navigator.share({
          title: "Convocation Invite",
          text: caption,
          url: publicUrl,
        });
      }
    } catch {
      // as a last fallback do nothing (user canceled etc.)
    }
  }

  function copyLink() {
    if (publicUrl) navigator.clipboard.writeText(publicUrl);
  }
  function copyCaption() {
    navigator.clipboard.writeText(caption);
  }

  return (
    <tr>
      <td style={S.td}>
        <div style={{ fontWeight: 600 }}>{row.guestName}</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{row.phone}</div>
      </td>

      {/* File name (hidden on narrow layouts via CSS if you add media query; left visible here) */}
      <td style={S.td}>
        {publicUrl ? (
          <a href={publicUrl} target="_blank" rel="noreferrer" style={S.link}>
            {filename}
          </a>
        ) : (
          "-"
        )}
      </td>

      <td style={S.td}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <button style={S.btn("secondary", "sm")}>Open PDF</button>
            </a>
          )}

          {/* WhatsApp (prefilled chat with caption) */}
          <a href={waTextLink} target="_blank" rel="noreferrer">
            <button style={S.btn("primary", "sm")}>WhatsApp (text)</button>
          </a>

          {/* Web Share with file attach (mobile, modern browsers) */}
          {canShare && publicUrl && (
            <button style={S.btn("outline", "sm")} onClick={shareWithFile}>
              Share PDF…
            </button>
          )}

          <button style={S.btn("ghost", "sm")} onClick={copyLink}>
            Copy link
          </button>
          <button style={S.btn("ghost", "sm")} onClick={copyCaption}>
            Copy caption
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------- Admin Form ----------
export default function AdminForm() {
  const [student, setStudent] = useState({
    matricNo: "",
    studentName: "",
    phone: "",
  });
  const [g1, setG1] = useState({ guestName: "", phone: "" });
  const [g2, setG2] = useState({ guestName: "", phone: "" });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState([]);

  const canGenerate = useMemo(() => {
    const hasG1 = g1.guestName && g1.phone;
    const hasG2 = g2.guestName && g2.phone;
    return (
      student.matricNo.trim() && student.studentName.trim() && (hasG1 || hasG2)
    );
  }, [student, g1, g2]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canGenerate) return;
    setBusy(true);
    setStatus("Generating PDFs…");

    const guests = [
      ...(g1.guestName && g1.phone ? [g1] : []),
      ...(g2.guestName && g2.phone ? [g2] : []),
    ];

    const out = await createStudent({ student, guests });

    if (out.ok) {
      setGenerated(out.files || []);
      setStatus("Done — Download or share on WhatsApp.");
    } else {
      setStatus(`Error: ${out.error || "unknown"}`);
    }
    setBusy(false);
  }

  return (
    <div style={S.page}>
      {/* Form */}
      <div style={S.card}>
        <div style={S.header}>
          <div style={S.titleRow}>
            <span style={S.badge}>QR</span>
            <span>Convocation Admin</span>
          </div>
        </div>
        <div style={S.body}>
          <form onSubmit={onSubmit}>
            <div style={S.twoCol}>
              <div>
                <label style={S.label}>Matric No</label>
                <input
                  style={S.input}
                  value={student.matricNo}
                  onChange={(e) =>
                    setStudent({ ...student, matricNo: e.target.value })
                  }
                  placeholder="DU1234"
                  required
                />
              </div>
              <div>
                <label style={S.label}>Student Name</label>
                <input
                  style={S.input}
                  value={student.studentName}
                  onChange={(e) =>
                    setStudent({ ...student, studentName: e.target.value })
                  }
                  placeholder="Oyinlola Ojelere"
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={S.label}>Student Phone (optional)</label>
              <input
                style={S.input}
                value={student.phone}
                onChange={(e) =>
                  setStudent({ ...student, phone: e.target.value })
                }
                placeholder="0803…"
              />
            </div>

            <div style={S.sep} />

            <div style={S.twoCol}>
              <div style={S.group}>
                <div style={{ marginBottom: 8 }}>
                  <span style={S.tag(false)}>Guest 1</span>
                </div>
                <label style={S.label}>Name</label>
                <input
                  style={S.input}
                  value={g1.guestName}
                  onChange={(e) => setG1({ ...g1, guestName: e.target.value })}
                  placeholder="Mr John Doe"
                />
                <div style={{ marginTop: 12 }}>
                  <label style={S.label}>Phone (WhatsApp)</label>
                  <input
                    style={S.input}
                    value={g1.phone}
                    onChange={(e) => setG1({ ...g1, phone: e.target.value })}
                    placeholder="0803…"
                  />
                </div>
              </div>

              <div style={S.group}>
                <div style={{ marginBottom: 8 }}>
                  <span style={S.tag(true)}>Guest 2</span>
                </div>
                <label style={S.label}>Name</label>
                <input
                  style={S.input}
                  value={g2.guestName}
                  onChange={(e) => setG2({ ...g2, guestName: e.target.value })}
                  placeholder="Ms Jane Doe"
                />
                <div style={{ marginTop: 12 }}>
                  <label style={S.label}>Phone (WhatsApp)</label>
                  <input
                    style={S.input}
                    value={g2.phone}
                    onChange={(e) => setG2({ ...g2, phone: e.target.value })}
                    placeholder="0803…"
                  />
                </div>
              </div>
            </div>

            <div style={S.btnRow}>
              <button
                type="submit"
                style={S.btn("primary")}
                disabled={!canGenerate || busy}
              >
                {busy ? "Working…" : "Generate PDFs"}
              </button>
              {!canGenerate && (
                <span style={S.hint}>
                  Enter matric no + student name, and at least one guest (name +
                  phone).
                </span>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Preview */}
      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.header}>
            <div style={S.titleRow}>
              <span>Invitation Preview</span>
            </div>
          </div>
          <div style={S.body}>
            <InvitePreview
              studentName={student.studentName || "Oyinlola Ojelere"}
              guestName={g1.guestName || "Mr John Doe"}
              event={{
                title: "Dominion University Convocation 2025",
                date: "September 13, 2025",
                time: "10:00 AM",
                venue: "Main Auditorium, Dominion University, Ibadan",
                notes: "Please arrive 45 minutes early with a valid ID.",
              }}
            />
          </div>
        </div>

        {/* Results */}
        <div style={S.card}>
          <div style={S.header}>
            <div style={S.titleRow}>
              <span>Generated invites</span>
            </div>
          </div>
          <div style={S.body}>
            {generated.length === 0 ? (
              <div style={S.status}>None yet.</div>
            ) : (
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Guest</th>
                      <th style={S.th}>File</th>
                      <th style={S.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generated.map((g, i) => (
                      <ResultRow key={g.token || i} row={g} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {status && (
            <div style={{ padding: "0 20px 16px 20px" }}>
              <span style={S.status}>{status}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
