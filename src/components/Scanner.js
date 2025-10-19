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

  // 🧩 Clean token (same as backend)
  const cleanToken = (raw = "") =>
    raw
      .trim()
      .replace(/^.*(Admission Token[:\s]*)/i, "")
      .replace(/^.*\/verify\//, "")
      .replace(/[^A-Za-z0-9_-]/g, "");

  // 🧠 Scan handler
  const handleResult = useCallback(
    async (result) => {
      if (!result || loading) return;

      const token = cleanToken(result);
      if (!token) {
        setError("Invalid QR code: token not found");
        return;
      }

      await verifyToken(token);
    },
    [loading]
  );

  // 🔍 Verify scanned or entered token
  const verifyToken = async (token) => {
    setLoading(true);
    setError("");
    setGuestData(null);
    setSuccess(false);

    try {
      const response = await verifyCheckPublic(token);
      if (response.ok && response.invite) {
        setGuestData(response.invite);
        setSuccess(true);
        setScanResult(token);
      } else {
        throw new Error(response.error || "Invalid or expired token");
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Admit guest
  const handleAdmit = async () => {
    if (!scanResult) return;
    setLoading(true);
    try {
      const res = await verifyUse(scanResult);
      if (res.ok) {
        setGuestData((g) => ({ ...g, status: "USED" }));
        setSuccess(true);
      } else {
        throw new Error(res.error || "Failed to admit guest");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={styles.iconCircle}>
            <span style={{ fontSize: 28 }}>📷</span>
          </div>
          <h1 style={styles.title}>QR Code & Token Scanner</h1>
          <p style={styles.subtitle}>
            Scan QR or enter admission token manually
          </p>
        </div>

        {/* 🔲 QR SCANNER */}
        <div style={styles.qrBox}>
          <Scanner
            allowMultiple={false}
            components={{ audio: false, finder: true }}
            constraints={{ facingMode: "environment" }}
            onScan={(detected) => {
              const val = detected?.[0]?.rawValue;
              if (val) handleResult(val);
            }}
            onError={(err) => {
              console.error("Scanner error:", err);
              setError("Unable to access camera");
            }}
            style={{ width: "100%" }}
          />
        </div>

        {/* ✍️ MANUAL ENTRY */}
        <div style={{ marginTop: 20 }}>
          <input
            type="text"
            placeholder="Enter Admission Token"
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

        {/* STATUS MESSAGES */}
        {loading && <p style={styles.loadingText}>⏳ Verifying token...</p>}
        {error && <p style={styles.errorText}>❌ {error}</p>}

        {/* ✅ GUEST DATA */}
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
    background: "linear-gradient(to bottom, #0f172a, #1e293b)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    color: "white",
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
  iconCircle: {
    background: "#1d4ed8",
    borderRadius: "50%",
    width: 50,
    height: 50,
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontSize: 22, marginBottom: 6, fontWeight: "600" },
  subtitle: { fontSize: 14, color: "#94a3b8" },
  qrBox: {
    border: "2px dashed #334155",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 16,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "none",
    outline: "none",
    background: "#1e293b",
    color: "white",
    marginBottom: 10,
  },
  loadingText: { color: "#3b82f6", textAlign: "center", marginTop: 12 },
  errorText: { color: "#ef4444", textAlign: "center", marginTop: 12 },
  resultBox: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 14,
    marginTop: 18,
  },
  resultTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  button: {
    width: "100%",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 0",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 10,
    backgroundColor: "#1d4ed8",
  },
};
