// client/src/pages/PublicVerifyPage.js
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

  useEffect(() => {
    async function check() {
      const r = await verifyCheckPublic(token);
      if (r.ok && r.guest) {
        setGuest(r.guest);
        setStatus(r.guest.status);
      } else {
        setError(r.error || "Invalid or expired QR");
      }
    }
    check();
  }, [token]);

  async function markUsed() {
    setConfirming(true);
    const r = await verifyUseWithPin(token, pin || "");
    setConfirming(false);
    if (r.ok) {
      setStatus("USED");
      alert("✅ Guest admitted successfully");
      window.location.href = "/admin"; // redirect to dashboard
    } else {
      alert(r.error || "Failed to admit guest");
    }
  }

  if (error) return <div style={styles.page}>❌ {error}</div>;
  if (!guest) return <div style={styles.page}>Checking QR...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Guest Verification</h2>
        <p>
          <b>Guest:</b> {guest.guestName}
        </p>
        <p>
          <b>Student:</b> {guest.student?.studentName}
        </p>
        <p>
          <b>Matric No:</b> {guest.student?.matricNo}
        </p>
        <p>
          <b>Status:</b>{" "}
          <span style={{ color: status === "USED" ? "red" : "green" }}>
            {status}
          </span>
        </p>

        {status === "UNUSED" ? (
          <>
            <input
              type="password"
              placeholder="Enter gate PIN (optional)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={styles.input}
            />
            <button
              onClick={markUsed}
              disabled={confirming}
              style={styles.button}
            >
              {confirming ? "Marking..." : "Admit & Mark Used"}
            </button>
          </>
        ) : (
          <div style={{ marginTop: 12, color: "#666" }}>
            Already used — access logged.
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#f8fafc",
  },
  card: {
    background: "#fff",
    padding: 24,
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    width: 300,
  },
  title: {
    marginBottom: 12,
    color: "#0B2E4E",
  },
  input: {
    width: "100%",
    padding: 8,
    marginTop: 8,
    borderRadius: 8,
    border: "1px solid #ddd",
  },
  button: {
    marginTop: 12,
    width: "100%",
    background: "#0B2E4E",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 0",
    fontWeight: 600,
    cursor: "pointer",
  },
};
