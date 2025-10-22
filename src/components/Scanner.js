import React, { useState, useCallback } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { verifyCheckPublic, verifyUse } from "../api";
import { useNavigate } from "react-router-dom";

export default function ScannerPage() {
  const [tokenInput, setTokenInput] = useState("");
  const [guestData, setGuestData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const extractToken = (raw) => {
    if (!raw) return "";
    let str = String(raw).trim();

    // Try JSON
    try {
      const j = JSON.parse(str);
      if (j.t || j.token) return String(j.t || j.token).trim();
    } catch (_) {}

    // Try URL
    const m = str.match(/\/(?:verify|public-verify)\/([A-Za-z0-9_-]{3,255})/i);
    if (m && m[1]) return m[1];

    // Fallback clean
    return str.replace(/[^A-Za-z0-9_-]/g, "");
  };

  const verifyToken = async (token) => {
    setError("");
    setLoading(true);
    try {
      const res = await verifyCheckPublic(token);
      if (res.ok && res.invite) {
        setGuestData(res.invite);
      } else throw new Error(res.error || "Invalid or expired token");
    } catch (e) {
      setError(e.message);
      setGuestData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResult = useCallback(
    async (detected) => {
      if (!detected || loading) return;
      let raw =
        Array.isArray(detected) && detected[0]
          ? detected[0].rawValue || detected[0].text || detected[0]
          : detected;
      console.log("📷 Scanner detected:", raw);
      const token = extractToken(raw);
      if (!token) return setError("Invalid QR content");
      await verifyToken(token);
    },
    [loading]
  );

  const handleAdmit = async (token) => {
    setLoading(true);
    try {
      const res = await verifyUse(token);
      if (res.ok && res.invite) {
        setGuestData({ ...guestData, status: "USED" });
        alert("✅ Guest admitted successfully!");
      } else throw new Error(res.error || "Failed to mark as used");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🎓 Guest QR Scanner</h1>
        <p style={styles.subtitle}>
          Scan a QR code or enter the admission token manually.
        </p>

        <div style={styles.qrBox}>
          <Scanner
            allowMultiple={false}
            components={{ audio: false, finder: true }}
            constraints={{ facingMode: "environment" }}
            onScan={(detected) => {
              if (detected?.length) handleResult(detected);
            }}
            onError={(err) => {
              console.error("Scanner error:", err);
              setError("Camera access failed.");
            }}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <input
            type="text"
            placeholder="Enter admission token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            style={styles.input}
          />
          <button
            style={styles.button}
            onClick={() => verifyToken(extractToken(tokenInput))}
            disabled={!tokenInput.trim() || loading}
          >
            🔍 Check Token
          </button>
        </div>

        {loading && <p style={styles.loading}>Checking...</p>}
        {error && <p style={styles.error}>{error}</p>}

        {guestData && (
          <div style={styles.resultBox}>
            <h3>
              {guestData.status === "USED" ? "⚠️ Already Used" : "✅ Verified"}
            </h3>
            <p>
              <b>Guest:</b> {guestData.guestName}
            </p>
            <p>
              <b>Student:</b> {guestData.studentName}
            </p>
            <p>
              <b>Matric No:</b> {guestData.matricNo}
            </p>
            <p>
              <b>Status:</b>{" "}
              <span
                style={{
                  color: guestData.status === "USED" ? "#dc2626" : "#16a34a",
                  fontWeight: 600,
                }}
              >
                {guestData.status}
              </span>
            </p>

            {guestData.status !== "USED" && (
              <button
                onClick={() => handleAdmit(guestData.token)}
                style={{ ...styles.button, backgroundColor: "#0B2E4E" }}
              >
                ✅ Admit Guest
              </button>
            )}

            <button
              onClick={() => navigate("/admin")}
              style={{ ...styles.button, backgroundColor: "#4b5563" }}
            >
              🔙 Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0B2E4E, #1e3a8a)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
  },
  title: { textAlign: "center", color: "#0B2E4E", fontWeight: 900 },
  subtitle: { textAlign: "center", color: "#6b7280", marginBottom: 16 },
  qrBox: {
    border: "2px dashed #D4AF37",
    borderRadius: 12,
    overflow: "hidden",
    background: "#f9fafb",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #ccc",
    borderRadius: 8,
    marginBottom: 8,
  },
  button: {
    width: "100%",
    backgroundColor: "#D4AF37",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 8,
  },
  loading: { textAlign: "center", color: "#0B2E4E" },
  error: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    padding: 10,
    borderRadius: 8,
    textAlign: "center",
  },
  resultBox: {
    marginTop: 12,
    background: "#f9fafb",
    padding: 14,
    borderRadius: 12,
    textAlign: "center",
  },
};
