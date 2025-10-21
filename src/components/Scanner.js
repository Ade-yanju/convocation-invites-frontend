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
  const navigate = useNavigate();

  const cleanToken = (raw = "") =>
    raw
      .trim()
      .replace(/^.*\/verify\//, "")
      .replace(/[^A-Za-z0-9_-]/g, "");

  const verifyToken = async (token) => {
    setLoading(true);
    setError("");
    setGuestData(null);
    try {
      const res = await verifyCheckPublic(token);
      if (res.ok && res.invite) {
        setGuestData(res.invite);
        setScanResult(token);
      } else {
        throw new Error(res.error || "Invalid token");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScanResult = useCallback((detected) => {
    const raw = detected?.[0]?.rawValue || "";
    if (!raw) return;
    const token = cleanToken(raw);
    if (!token) {
      setError("Invalid QR: no token found");
      return;
    }
    verifyToken(token);
  }, []);

  const handleAdmit = async () => {
    if (!scanResult) return;
    setLoading(true);
    try {
      const res = await verifyUse(scanResult);
      if (res.ok) {
        setGuestData((g) => ({ ...g, status: "USED" }));
      } else {
        throw new Error(res.error || "Failed to admit");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: 420,
          background: "#111827",
          padding: 20,
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "white" }}>QR Code & Token Scanner</h2>
          <p style={{ color: "#94a3b8" }}>Scan QR or paste token</p>
        </div>

        <div
          style={{
            borderRadius: 8,
            overflow: "hidden",
            border: "2px dashed #334155",
          }}
        >
          <Scanner
            allowMultiple={false}
            components={{ audio: false, finder: true }}
            constraints={{ facingMode: "environment" }}
            onScan={(d) => handleScanResult(d)}
            onError={(err) => setError("Unable to access camera")}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <input
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Enter admission token"
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 6,
              background: "#0f172a",
              color: "white",
              border: "none",
            }}
          />
          <button
            onClick={() => verifyToken(cleanToken(tokenInput))}
            style={{ marginTop: 8, width: "100%", padding: 10 }}
          >
            Check Token
          </button>
        </div>

        {loading && (
          <div style={{ color: "#3b82f6", marginTop: 10 }}>Verifying...</div>
        )}
        {error && (
          <div style={{ color: "#ef4444", marginTop: 10 }}>{error}</div>
        )}

        {guestData && (
          <div
            style={{
              marginTop: 12,
              background: "#0b1220",
              padding: 12,
              borderRadius: 8,
            }}
          >
            <div>
              <b>Guest:</b> {guestData.guestName}
            </div>
            <div>
              <b>Student:</b> {guestData.studentName}
            </div>
            <div>
              <b>Matric:</b> {guestData.matricNo}
            </div>
            <div>
              <b>Status:</b> {guestData.status}
            </div>

            {guestData.status !== "USED" && (
              <button
                onClick={handleAdmit}
                style={{ marginTop: 8, width: "100%", padding: 10 }}
              >
                Admit & Mark USED
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
