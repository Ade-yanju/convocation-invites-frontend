// client/src/pages/ScannerPage.jsx
import React, { useState, useCallback } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { verifyCheckPublic, verifyUse } from "../api";
import { useNavigate } from "react-router-dom";

export default function ScannerPage() {
  const [tokenInput, setTokenInput] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [guestData, setGuestData] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // ✅ Sanitiser matches backend
  const cleanToken = (raw = "") =>
    String(raw || "")
      .trim()
      .replace(/^.*(Admission Token[:\s]*)/i, "")
      .replace(/^.*\/verify\//, "")
      .replace(/[^A-Za-z0-9_-]/g, "");

  const verifyToken = async (token) => {
    setLoading(true);
    setError("");
    setGuestData(null);
    setSuccess(false);
    try {
      const res = await verifyCheckPublic(token);
      if (res.ok && res.invite) {
        setGuestData(res.invite);
        setSuccess(true);
        setScanResult(token);
      } else throw new Error(res.error || "Invalid or expired token");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResult = useCallback(
    async (detected) => {
      if (!detected || loading) return;
      const raw = detected?.[0]?.rawValue || detected?.[0]?.text || detected;
      console.log("📷 Scanner raw value:", raw);
      const token = cleanToken(raw);
      if (!token) return setError("Invalid QR content");
      await verifyToken(token);
    },
    [loading]
  );

  const handleAdmit = async () => {
    if (!scanResult) return;
    setLoading(true);
    try {
      const res = await verifyUse(scanResult);
      if (res.ok) {
        setGuestData((g) => ({ ...g, status: "USED" }));
        setSuccess(true);
      } else throw new Error(res.error || "Failed to admit guest");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={styles.iconCircle}>
            <span style={{ fontSize: 28 }}>🎓</span>
          </div>
          <h1 style={styles.title}>Convocation Guest Scanner</h1>
          <p style={styles.subtitle}>
            Scan QR or enter token manually to verify admission
          </p>
        </div>

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
              setError("Unable to access camera");
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
            onClick={() => verifyToken(cleanToken(tokenInput))}
            disabled={loading || !tokenInput.trim()}
          >
            🔍 Check Token
          </button>
        </div>

        {loading && <p style={styles.loading}>⏳ Checking...</p>}
        {error && <p style={styles.error}>❌ {error}</p>}

        {guestData && (
          <div style={styles.resultBox}>
            <h3 style={styles.resultTitle}>
              {guestData.status === "USED"
                ? "⚠️ Already Admitted"
                : "✅ Guest Verified"}
            </h3>

            <p>
              <b>Guest:</b> {guestData.guestName}
            </p>
            <p>
              <b>Invited By:</b> {guestData.studentName}
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
                onClick={handleAdmit}
                disabled={loading}
                style={{
                  ...styles.button,
                  backgroundColor: loading ? "#64748b" : "#0B2E4E",
                }}
              >
                {loading ? "Processing..." : "✅ Admit Guest"}
              </button>
            )}

            <button
              onClick={() => navigate("/dashboard")}
              style={{ ...styles.button, backgroundColor: "#4b5563" }}
            >
              🔙 Back to Dashboard
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
    background: "linear-gradient(180deg, #0B2E4E 0%, #1e3a8a 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: 420,
  },
  iconCircle: {
    background: "#D4AF37",
    color: "#fff",
    height: 60,
    width: 60,
    borderRadius: "50%",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#0B2E4E",
    fontWeight: 900,
    fontSize: 20,
    marginTop: 10,
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 14,
  },
  qrBox: {
    border: "2px dashed #D4AF37",
    borderRadius: 12,
    overflow: "hidden",
    background: "#f9fafb",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    marginBottom: 8,
  },
  button: {
    width: "100%",
    backgroundColor: "#D4AF37",
    color: "#fff",
    fontWeight: 700,
    border: "none",
    borderRadius: 8,
    padding: "12px 14px",
    cursor: "pointer",
    transition: "0.2s ease-in-out",
    fontSize: 15,
  },
  loading: {
    color: "#0B2E4E",
    textAlign: "center",
    marginTop: 8,
    fontWeight: 500,
  },
  error: {
    color: "#dc2626",
    background: "#fee2e2",
    padding: 8,
    borderRadius: 8,
    fontSize: 14,
    marginTop: 10,
  },
  resultBox: {
    background: "#f9fafb",
    padding: 14,
    borderRadius: 12,
    marginTop: 14,
  },
  resultTitle: {
    fontWeight: 800,
    color: "#0B2E4E",
  },
};
