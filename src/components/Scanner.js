import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { verifyCheckPublic, verifyUse } from "../api";
import { useNavigate } from "react-router-dom";

export default function ScannerPage() {
  const [guest, setGuest] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleScan = async (token) => {
    if (!token || scanned) return;
    setScanned(true);
    setLoading(true);
    setGuest(null);
    setError("");
    setSuccess(false);

    try {
      const res = await verifyCheckPublic(token);
      if (res.ok) {
        setGuest({ ...res.guest, token });
      } else {
        setError(res.error || "Invalid or expired QR code");
      }
    } catch (err) {
      setError("Error verifying QR code");
    } finally {
      setLoading(false);
    }
  };

  const handleAdmit = async () => {
    if (!guest?.token) return;
    setLoading(true);
    setError("");

    try {
      const res = await verifyUse(guest.token);
      if (res.ok) {
        setGuest({ ...guest, status: "USED" });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 1500);
      } else {
        setError(res.error || "Error admitting guest");
      }
    } catch (err) {
      setError("Failed to mark guest as admitted");
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setGuest(null);
    setError("");
    setScanned(false);
    setSuccess(false);
  };

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "40px auto",
        textAlign: "center",
        background: "#fff",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ color: "#0B2E4E", marginBottom: 10 }}>Gate Scanner</h2>

      {!guest && !error && (
        <>
          <div style={{ width: "100%", borderRadius: 12, overflow: "hidden" }}>
            <Scanner
              onScan={(result) => {
                if (result) handleScan(result);
              }}
              onError={(err) => console.error(err)}
              constraints={{ facingMode: "environment" }}
              style={{ width: "100%" }}
            />
          </div>
          <p style={{ color: "#64748b", marginTop: 10 }}>
            Point your camera at a guest’s QR code
          </p>
        </>
      )}

      {loading && <p style={{ color: "#64748b" }}>Processing...</p>}

      {error && (
        <div style={{ color: "#dc2626", fontWeight: 600, marginTop: 10 }}>
          {error}
          <div>
            <button
              style={{
                marginTop: 12,
                background: "#f1f5f9",
                border: "none",
                padding: "8px 14px",
                borderRadius: 8,
                cursor: "pointer",
              }}
              onClick={resetScanner}
            >
              Scan Again
            </button>
          </div>
        </div>
      )}

      {guest && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ color: "#0f172a" }}>Guest Details</h3>
          <div
            style={{
              background: "#f8fafc",
              borderRadius: 12,
              padding: "12px 16px",
              textAlign: "left",
              marginTop: 8,
            }}
          >
            <p>
              <strong>Name:</strong> {guest.guestName}
            </p>
            <p>
              <strong>Student:</strong> {guest.studentName || "-"}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                style={{
                  color: guest.status === "USED" ? "#dc2626" : "#16a34a",
                  fontWeight: 600,
                }}
              >
                {guest.status}
              </span>
            </p>
          </div>

          {guest.status !== "USED" ? (
            <button
              style={{
                marginTop: 16,
                background: success ? "#16a34a" : "#0B2E4E",
                color: "#fff",
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                transform: success ? "scale(1.1)" : "scale(1)",
                boxShadow: success
                  ? "0 0 10px 2px rgba(22,163,74,0.5)"
                  : "none",
                transition: "all 0.3s ease",
              }}
              onClick={handleAdmit}
              disabled={loading || success}
            >
              {success ? "✅ Admitted!" : "Admit Guest"}
            </button>
          ) : (
            <p style={{ color: "#dc2626", fontWeight: 600, marginTop: 12 }}>
              Already Admitted
            </p>
          )}

          <div>
            <button
              style={{
                marginTop: 16,
                background: "#f1f5f9",
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
              }}
              onClick={resetScanner}
            >
              Scan Another
            </button>
          </div>

          <div>
            <button
              style={{
                marginTop: 10,
                background: "#0f172a",
                color: "#fff",
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => navigate("/admin")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
