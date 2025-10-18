import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { verifyCheckPublic } from "../api";

export default function VerifyPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Invalid verification link.");
        setLoading(false);
        return;
      }

      try {
        const res = await verifyCheckPublic(token);
        if (res.ok && res.guest) {
          setGuest(res.guest);
        } else {
          throw new Error(res.error || "This QR code is invalid or expired.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.loading}>⏳ Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, borderColor: "#dc2626" }}>
          <h2 style={{ color: "#dc2626" }}>❌ Invalid Invitation</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!guest) return null;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={{ color: "#16a34a" }}>✅ Verified Invitation</h2>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 10 }}>
          Dominion University, Ibadan
        </p>

        <p>
          <b>Guest:</b> {guest.fullName || "Unknown"}
        </p>
        <p>
          <b>Department:</b> {guest.department || "N/A"}
        </p>
        <p>
          <b>Status:</b>{" "}
          <span
            style={{
              color:
                guest.status === "USED"
                  ? "#dc2626"
                  : guest.status === "PENDING"
                  ? "#f59e0b"
                  : "#16a34a",
            }}
          >
            {guest.status}
          </span>
        </p>

        <p style={{ fontSize: 13, marginTop: 20, color: "#94a3b8" }}>
          🎓 You’re invited to the 3rd Convocation Ceremony.
        </p>
        <p style={{ fontSize: 13, color: "#94a3b8" }}>🗓 October 21–26, 2025</p>
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
    border: "2px solid #16a34a",
    padding: 30,
    width: "100%",
    maxWidth: 400,
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
  loading: {
    color: "#3b82f6",
    fontSize: 16,
  },
};
