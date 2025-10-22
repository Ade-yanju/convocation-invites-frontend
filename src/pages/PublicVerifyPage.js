// src/pages/PublicVerifyPage.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

// ✅ Use CRA-style environment variable
const API_BASE =
  process.env.REACT_APP_API_URL || "https://invite-server-0gv6.onrender.com";

async function verifyCheckPublic(token) {
  const res = await fetch(`${API_BASE}/verify/json/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.json();
}

async function markAsUsed(token) {
  const res = await fetch(`${API_BASE}/verify/json/use`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export default function PublicVerifyPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Invalid or missing token.");
        setLoading(false);
        return;
      }

      try {
        const res = await verifyCheckPublic(token);

        if (res.ok && res.invite) {
          setInvite(res.invite);
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

  const handleMarkUsed = async () => {
    if (!invite || invite.status === "USED") return;
    setActionLoading(true);
    setSuccessMsg("");

    try {
      const res = await markAsUsed(token);
      if (res.ok && res.invite) {
        setInvite(res.invite);
        setSuccessMsg("✅ Guest has been successfully admitted.");
      } else {
        throw new Error(res.error || "Failed to mark as used.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

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

  if (!invite) return null;

  const statusColor =
    invite.status === "USED"
      ? "#dc2626"
      : invite.status === "UNUSED"
      ? "#16a34a"
      : "#f59e0b";

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={{ color: statusColor }}>
          {invite.status === "USED"
            ? "❌ Already Used"
            : "✅ Verified Invitation"}
        </h2>
        <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 10 }}>
          Dominion University, Ibadan
        </p>

        <p>
          <b>Guest:</b> {invite.guestName || "Unknown"}
        </p>
        <p>
          <b>Student:</b> {invite.studentName || "N/A"}
        </p>
        <p>
          <b>Matric No:</b> {invite.matricNo || "N/A"}
        </p>
        <p>
          <b>Status:</b>{" "}
          <span style={{ color: statusColor }}>{invite.status}</span>
        </p>

        {invite.usedAt && (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>
            Used at: {new Date(invite.usedAt).toLocaleString()}
          </p>
        )}

        {invite.status === "UNUSED" && (
          <button
            onClick={handleMarkUsed}
            disabled={actionLoading}
            style={{
              marginTop: 20,
              backgroundColor: "#16a34a",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {actionLoading ? "Marking..." : "✅ Admit Guest"}
          </button>
        )}

        {successMsg && (
          <p style={{ color: "#16a34a", marginTop: 10 }}>{successMsg}</p>
        )}

        <p style={{ fontSize: 13, marginTop: 20, color: "#94a3b8" }}>
          🎓 Dominion University Convocation Ceremony
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
