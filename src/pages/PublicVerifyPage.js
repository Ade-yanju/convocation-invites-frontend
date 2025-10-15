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

  useEffect(() => {
    async function check() {
      try {
        const r = await verifyCheckPublic(token);
        if (r.ok && r.guest) {
          setGuest(r.guest);
          setStatus(r.guest.status);
        } else {
          setError(r.error || "Invalid or expired QR");
        }
      } catch (err) {
        setError("Unable to verify QR at the moment");
      }
    }
    check();
  }, [token]);

  async function markUsed() {
    setConfirming(true);
    try {
      const r = await verifyUseWithPin(token, pin || "");
      if (r.ok) {
        setStatus("USED");
        setVerified(true);
        // brief confirmation screen before redirect
        setTimeout(() => {
          window.location.href = "/admin";
        }, 1800);
      } else {
        alert(r.error || "Failed to admit guest");
      }
    } catch (err) {
      alert("Network error while verifying guest");
    } finally {
      setConfirming(false);
    }
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>❌ Invalid QR</h2>
          <p style={{ color: "#dc2626" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h3 style={{ color: "#64748b" }}>Checking QR...</h3>
        </div>
      </div>
    );
  }

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
          <span
            style={{
              color: status === "USED" ? "#dc2626" : "#16a34a",
              fontWeight: 700,
            }}
          >
            {status}
          </span>
        </p>

        {verified && (
          <div style={{ marginTop: 14, color: "#16a34a", fontWeight: 700 }}>
            ✅ Guest Verified Successfully!
          </div>
        )}

        {status === "UNUSED" && !verified && (
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
              style={{
                ...styles.button,
                background: confirming ? "#64748b" : "#0B2E4E",
              }}
            >
              {confirming ? "Verifying..." : "✅ Verify Guest"}
            </button>
          </>
        )}

        {status === "USED" && !verified && (
          <div style={{ marginTop: 12, color: "#dc2626", fontWeight: 600 }}>
            Already Admitted — Access Logged
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
    padding: 16,
  },
  card: {
    background: "#fff",
    padding: 24,
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: 350,
    textAlign: "center",
  },
  title: {
    marginBottom: 12,
    color: "#0B2E4E",
  },
  input: {
    width: "100%",
    padding: 8,
    marginTop: 12,
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
