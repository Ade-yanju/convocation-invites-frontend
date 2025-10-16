import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { verifyCheckPublic, verifyUse } from "../api";
import { useNavigate } from "react-router-dom";

export default function ScannerPage() {
  const [guest, setGuest] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const navigate = useNavigate();

  const handleScan = async (result) => {
    if (!result || loading) return;
    setLoading(true);
    setError("");

    try {
      let token = result;
      const match = result.match(/\/([a-zA-Z0-9\-]+)$/);
      if (match) token = match[1];

      const res = await verifyCheckPublic(token);
      if (res.ok) {
        setGuest({ ...res.guest, token });
        setModalVisible(true);
      } else {
        setError(res.error || "Invalid or expired QR code");
      }
    } catch (err) {
      console.error("QR verify error:", err);
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
        setTimeout(() => {
          setSuccess(false);
          setModalVisible(false);
        }, 1500);
      } else {
        setError(res.error || "Error admitting guest");
      }
    } catch (err) {
      setError("Failed to mark guest as admitted");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setGuest(null);
    setError("");
    setSuccess(false);
  };

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div
      style={{
        maxWidth: isMobile ? "100%" : 500,
        margin: isMobile ? 0 : "40px auto",
        textAlign: "center",
        background: isMobile ? "#0B2E4E" : "#ffffff",
        color: isMobile ? "#fff" : "#000",
        borderRadius: isMobile ? 0 : 20,
        padding: isMobile ? 0 : 24,
        minHeight: isMobile ? "100vh" : "auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <h2
        style={{
          color: isMobile ? "#fff" : "#0B2E4E",
          marginBottom: 14,
          fontWeight: 800,
          fontSize: 22,
          marginTop: isMobile ? 20 : 0,
        }}
      >
        🎟️ Gate Scanner
      </h2>

      {/* SCANNER VIEW */}
      <div
        style={{
          position: "relative",
          flexGrow: 1,
          width: "100%",
          borderRadius: isMobile ? 0 : 16,
          overflow: "hidden",
          background: "#000",
        }}
      >
        <Scanner
          onScan={(result) => result && handleScan(result)}
          onError={(err) => console.error(err)}
          constraints={{ facingMode: "environment" }}
          style={{
            width: "100%",
            height: isMobile ? "100vh" : 400,
            objectFit: "cover",
          }}
        />

        {/* Overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.3)",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              border: "3px solid #22c55e",
              width: 220,
              height: 220,
              borderRadius: 16,
              boxShadow: "0 0 12px rgba(34,197,94,0.7)",
              animation: "scanbox 2s infinite alternate ease-in-out",
            }}
          ></div>
          <p
            style={{
              color: "#fff",
              marginTop: 20,
              fontSize: 15,
              fontWeight: 500,
              textShadow: "0 0 5px rgba(0,0,0,0.7)",
            }}
          >
            📷 Point camera at guest’s QR code
          </p>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255, 0, 0, 0.9)",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 8,
            fontWeight: 600,
            animation: "fadeIn 0.3s ease-in",
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* MODAL POPUP */}
      {modalVisible && guest && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.3s ease-in",
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: "#fff",
              color: "#0B2E4E",
              borderRadius: 16,
              padding: 24,
              width: "90%",
              maxWidth: 400,
              textAlign: "center",
              boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
              transform: "scale(1)",
              animation: "popIn 0.3s ease-out",
            }}
          >
            <h3 style={{ marginBottom: 10 }}>Guest Verified ✅</h3>
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

            {/* ACTION BUTTONS */}
            {guest.status !== "USED" && (
              <button
                style={{
                  marginTop: 16,
                  background: success ? "#22c55e" : "#0B2E4E",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  width: "100%",
                  transition: "all 0.3s ease",
                }}
                onClick={handleAdmit}
                disabled={loading || success}
              >
                {success ? "✅ Admitted!" : "Admit Guest"}
              </button>
            )}

            {guest.status === "USED" && (
              <p style={{ color: "#dc2626", marginTop: 12 }}>
                🚫 Already Admitted
              </p>
            )}

            <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
              <button
                style={{
                  flex: 1,
                  background: "#f1f5f9",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
                onClick={closeModal}
              >
                🔄 Scan Again
              </button>
              <button
                style={{
                  flex: 1,
                  background: "#0B2E4E",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
                onClick={() => navigate("/admin")}
              >
                🏠 Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>
        {`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes scanbox {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1.05); opacity: 1; }
        }
      `}
      </style>
    </div>
  );
}
