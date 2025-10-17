import React, { useState, useCallback } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { verifyCheckPublic, verifyUse } from "../api";
import { useNavigate } from "react-router-dom";

export default function ScannerPage() {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [guestData, setGuestData] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // 🧠 stable callback to avoid re-renders breaking scanner
  const handleResult = useCallback(
    async (result) => {
      if (!result || loading) return;

      setLoading(true);
      setError("");
      setGuestData(null);
      setSuccess(false);

      // @yudiel/react-qr-scanner returns a simple string result
      let token = result;

      // try extracting token if full URL is scanned
      try {
        const url = new URL(token);
        const parts = url.pathname.split("/");
        token = parts.pop() || parts.pop();
      } catch {
        token = token
          .replace(/^.*\/verify\//, "")
          .replace(/[^a-zA-Z0-9\-].*$/, "");
      }

      try {
        const response = await verifyCheckPublic(token);
        if (response.ok && response.guest) {
          setGuestData(response.guest);
          setSuccess(true);
        } else {
          throw new Error(response.error || "Invalid or expired QR code");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setScanResult(token);
      }
    },
    [loading]
  );

  const handleAdmit = async () => {
    if (!scanResult) return;
    setLoading(true);
    try {
      const res = await verifyUse(scanResult);
      if (res.ok) {
        setSuccess(true);
        setError("");
        setGuestData((g) => ({ ...g, status: "USED" }));
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
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={styles.iconCircle}>
            <span style={{ fontSize: 28 }}>📷</span>
          </div>
          <h1 style={styles.title}>QR Code Scanner</h1>
          <p style={styles.subtitle}>Scan any guest invite below</p>
        </div>

        <div style={styles.qrBox}>
          <Scanner
            allowMultiple={false}
            components={{ audio: false, finder: true }}
            constraints={{ facingMode: "environment" }}
            onScan={(detected) => {
              if (detected?.[0]?.rawValue) {
                handleResult(detected[0].rawValue);
              }
            }}
            onError={(err) => {
              console.error("Scanner error:", err);
              setError("Unable to access camera");
            }}
            style={{ width: "100%" }}
          />
        </div>

        {loading && <p style={styles.loadingText}>⏳ Verifying QR code...</p>}

        {error && <p style={styles.errorText}>❌ {error}</p>}

        {guestData && (
          <div style={styles.resultBox}>
            <h3 style={styles.resultTitle}>
              {success ? "✅ Guest Verified" : "⚠️ Guest Info"}
            </h3>
            <p>
              <b>Name:</b> {guestData.fullName || "Unknown"}
            </p>
            <p>
              <b>Department:</b> {guestData.department || "N/A"}
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
                {loading ? "Verifying..." : "✅ Admit Guest"}
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
    maxWidth: 400,
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
  },
};
