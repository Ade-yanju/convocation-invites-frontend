import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { verifyCheckPublic, verifyUseWithPin } from "../api";

export default function PublicVerifyPage() {
  const { token } = useParams();
  const [guest, setGuest] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [verified, setVerified] = useState(false);

  // ✅ Step 1: Verify token when page loads
  useEffect(() => {
    async function check() {
      try {
        if (!token) {
          setError("Missing verification token");
          return;
        }

        const res = await verifyCheckPublic(token);

        if (res.ok && res.guest) {
          setGuest(res.guest);
          setStatus(res.guest.status || "UNUSED");
        } else {
          throw new Error(res.error || "Invalid or expired QR code");
        }
      } catch (err) {
        console.error("Verification failed:", err);
        setError("Unable to verify invite at this time.");
      }
    }

    check();
  }, [token]);

  // ✅ Step 2: Mark invite as USED
  async function markUsed() {
    setConfirming(true);
    try {
      const res = await verifyUseWithPin(token, pin || "");
      if (res.ok) {
        setStatus("USED");
        setVerified(true);
      } else {
        throw new Error(res.error || "Failed to mark invite as used");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  // ✅ Step 3: Render
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.errorTitle}>❌ Invalid Invite</h2>
          <p style={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={{ color: "#94a3b8" }}>🔍 Verifying invite, please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ textAlign: "center" }}>
          <div style={styles.headerCircle}>
            <span style={{ fontSize: 28 }}>🎓</span>
          </div>
          <h1 style={styles.title}>Guest Verification</h1>
          <p style={styles.subtitle}>Mobile Gate Scan Interface</p>
        </div>

        <div style={styles.infoBox}>
          <p><b>Guest Name:</b> {guest.guestName || "N/A"}</p>
          <p><b>Student:</b> {guest.student?.studentName || "N/A"}</p>
          <p><b>Matric No:</b> {guest.student?.matricNo || "N/A"}</p>
          <p>
            <b>Status:</b>{" "}
            <span
              style={{
                color: status === "USED" ? "#dc2626" : "#16a34a",
                fontWeight: 600,
              }}
            >
              {status}
            </span>
          </p>
        </div>

        {/* ✅ Visual Feedback */}
        {verified && (
          <div style={styles.successBox}>✅ Guest Admitted Successfully!</div>
        )}

        {status === "USED" && !verified && (
          <div style={styles.usedBox}>⚠️ This invite has already been verified.</div>
        )}

        {/* ✅ Action Section */}
        {status === "UNUSED" && !verified && (
          <>
            <input
              type="password"
              placeholder="Enter PIN (if required)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={styles.input}
            />
            <button
              onClick={markUsed}
              disabled={confirming}
              style={{
                ...styles.button,
                backgroundColor: confirming ? "#64748b" : "#0B2E4E",
              }}
            >
              {confirming ? "Verifying..." : "✅ Admit Guest"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(to bottom right, #0f172a, #1e293b)",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
    padding: 24,
    width: "100%",
    maxWidth: 400,
    textAlign: "center",
  },
  headerCircle: {
    background: "#0B2E4E",
    width: 60,
    height: 60,
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto 12px",
    color: "#fff",
  },
  title: {
    fontSize: 20,
    color: "#0B2E4E",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 14,
    textAlign: "left",
    color: "#0f172a",
    marginBottom: 16,
  },
  successBox: {
    color: "#16a34a",
    fontWeight: 600,
    marginBottom: 12,
  },
  usedBox: {
    color: "#dc2626",
    fontWeight: 600,
    marginTop: 12,
  },
  errorTitle: {
    color: "#dc2626",
    marginBottom: 8,
  },
  errorText: {
    color: "#9ca3af",
    fontSize: 14,
  },
  input: {
    width: "100%",
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
    outline: "none",
  },
  button: {
    marginTop: 12,
    width: "100%",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 0",
    fontWeight: 600,
    cursor: "pointer",
  },
};
