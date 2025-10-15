import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { verifyCheckPublic, verifyUseWithPin } from "../api";

export default function PublicVerifyPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const res = await verifyCheckPublic(token);
      if (res.ok) setData(res);
      else setMessage(res.error || "Verification failed");
      setLoading(false);
    }
    fetchData();
  }, [token]);

  async function handleAdmit() {
    if (!pin) return setMessage("Enter gate PIN first");
    const res = await verifyUseWithPin(token, pin);
    if (res.ok) setMessage("✅ Guest admitted successfully!");
    else setMessage(`❌ ${res.error}`);
  }

  if (loading) return <div>Checking invite...</div>;
  if (message && !data) return <div>{message}</div>;

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>🎟️ Guest Verification</h2>
      <p>
        <strong>Guest:</strong> {data.guestName}
      </p>
      <p>
        <strong>Student:</strong> {data.studentName}
      </p>
      <p>
        <strong>Status:</strong> {data.status}
      </p>

      {data.status === "UNUSED" ? (
        <>
          <input
            type="password"
            value={pin}
            placeholder="Enter gate PIN"
            onChange={(e) => setPin(e.target.value)}
            style={{ padding: "0.5rem", marginTop: "1rem" }}
          />
          <button
            onClick={handleAdmit}
            style={{ marginLeft: "1rem", padding: "0.5rem 1rem" }}
          >
            Admit Guest
          </button>
        </>
      ) : (
        <p style={{ color: "red" }}>❌ Already Used</p>
      )}

      {message && <p style={{ marginTop: "1rem" }}>{message}</p>}
    </div>
  );
}
