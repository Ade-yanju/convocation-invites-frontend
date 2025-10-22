// src/pages/PublicVerifyPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE =
  process.env.REACT_APP_API_BASE || "https://invite-server-0gv6.onrender.com"; // your backend base URL

export default function PublicVerifyPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`${API_BASE}/verify-json/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Invalid token");
        setInvite(data.invite);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [token]);

  const handleAdmit = async () => {
    const pin = prompt("Enter gate PIN:");
    if (!pin) return alert("PIN required.");

    try {
      const res = await fetch(`${API_BASE}/verify-json/use-with-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pin }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("Guest admitted successfully ✅");
        window.location.reload();
      } else {
        alert(data.error || "Failed to mark as used.");
      }
    } catch (e) {
      alert("Server error while admitting guest.");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Verifying QR code...</p>
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <h2 className="text-red-600 text-xl font-semibold mb-2">
          Invalid or Expired QR Code ❌
        </h2>
        <p className="text-gray-600">{error}</p>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      <div className="bg-white shadow-lg rounded-2xl p-6 max-w-md w-full border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <img
            src="/du-logo.png"
            alt="Dominion University"
            className="h-10 w-10"
          />
          <h1 className="text-lg font-bold text-[#0B2E4E]">
            Dominion University
          </h1>
        </div>

        <h2 className="text-xl font-semibold text-center text-[#0B2E4E] mb-4">
          Guest Verification
        </h2>

        <div className="space-y-2 text-gray-700">
          <p>
            <strong>Guest:</strong> {invite.guestName}
          </p>
          <p>
            <strong>Student:</strong> {invite.studentName}
          </p>
          <p>
            <strong>Matric No:</strong> {invite.matricNo}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {invite.status === "USED" ? (
              <span className="text-red-600 font-semibold">USED ❌</span>
            ) : (
              <span className="text-green-600 font-semibold">UNUSED ✅</span>
            )}
          </p>
        </div>

        {invite.status !== "USED" && (
          <button
            onClick={handleAdmit}
            className="mt-6 w-full bg-[#0B2E4E] text-white font-semibold py-2 px-4 rounded-lg hover:bg-[#103e65]"
          >
            Admit Guest
          </button>
        )}

        {invite.status === "USED" && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Already marked as used.
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Powered by Dominion Event System © {new Date().getFullYear()}
      </p>
    </div>
  );
}
