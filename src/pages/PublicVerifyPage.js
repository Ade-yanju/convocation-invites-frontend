import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { verifyCheckPublic, verifyUseWithPin } from "../api";
import toast from "react-hot-toast";

export default function PublicVerifyPage() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading");
  const [info, setInfo] = useState(null);
  const [pin, setPin] = useState("");

  useEffect(() => {
    const checkToken = async () => {
      try {
        const res = await verifyCheckPublic(token);
        if (!res.ok) {
          setStatus("error");
          toast.error(res.error || "Invalid or expired QR code");
        } else {
          setInfo(res.data || res);
          setStatus("ok");
        }
      } catch (e) {
        setStatus("error");
        toast.error("Network error while verifying token");
      }
    };
    checkToken();
  }, [token]);

  const handleMarkUsed = async () => {
    if (!pin.trim()) return toast.error("Please enter a PIN");

    const res = await verifyUseWithPin(token, pin);
    if (res.ok) {
      toast.success("Marked as used successfully ✅");
      setInfo({ ...info, used: true, usedAt: new Date().toISOString() });
    } else {
      toast.error(res.error || "Failed to mark as used");
    }
  };

  if (status === "loading") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Verifying invite…</h2>
      </div>
    );
  }

  if (status === "error" || !info) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "red" }}>
        <h2>❌ Invalid or expired invite</h2>
        <p>Please contact event support for assistance.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "40px auto",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        padding: 24,
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 20 }}>
        🎓 Convocation Invite
      </h1>

      <div style={{ marginBottom: 16 }}>
        <strong>Name:</strong> {info.name || "N/A"}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Department:</strong> {info.department || "N/A"}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Seat Number:</strong> {info.seat || "Not Assigned"}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Status:</strong>{" "}
        {info.used ? (
          <span style={{ color: "red", fontWeight: "bold" }}>USED</span>
        ) : (
          <span style={{ color: "green", fontWeight: "bold" }}>VALID</span>
        )}
      </div>

      {!info.used && (
        <div style={{ marginTop: 30 }}>
          <label
            style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}
          >
            Enter Security PIN
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              marginBottom: 12,
            }}
          />
          <button
            onClick={handleMarkUsed}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            ✅ Mark as Used
          </button>
        </div>
      )}

      {info.used && info.usedAt && (
        <p style={{ marginTop: 20, color: "#666", fontSize: 14 }}>
          Used at: {new Date(info.usedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
