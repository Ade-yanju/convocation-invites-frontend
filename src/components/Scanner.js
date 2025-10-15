// client/src/components/Scanner.jsx
import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import toast from "react-hot-toast";
import { verifyCheckPublic, verifyUseWithPin } from "../api";

const Scanner = () => {
  const readerId = "qr-reader";
  const html5Ref = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [camId, setCamId] = useState("");
  const [result, setResult] = useState(null);
  const [token, setToken] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Load cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices);
        if (devices.length > 0) {
          const backCam = devices.find((c) => /back|rear/i.test(c.label));
          setCamId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch(() => setError("Camera access denied"));
  }, []);

  // Start camera
  useEffect(() => {
    if (!camId) return;

    const html5 = new Html5Qrcode(readerId);
    html5Ref.current = html5;

    html5
      .start(
        { deviceId: { exact: camId } },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess
      )
      .catch((e) => setError("Failed to start camera: " + e.message));

    return () => {
      html5.stop().catch(() => {});
      html5.clear();
    };
  }, [camId]);

  const onScanSuccess = async (decodedText) => {
    const tok = extractToken(decodedText);
    if (!tok) return;
    setToken(tok);
    await handleVerify(tok);
  };

  const extractToken = (str) => {
    try {
      const obj = JSON.parse(str);
      return obj.token || obj.t || str;
    } catch {
      return str.trim();
    }
  };

  const handleVerify = async (tok) => {
    setBusy(true);
    setError("");
    try {
      const res = await verifyCheckPublic(tok);
      if (!res.ok) throw new Error(res.error || "Invalid token");
      setResult(res);
      toast.success("QR verified successfully!");
    } catch (e) {
      setError(e.message);
      toast.error("Invalid or used QR code!");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const handleAdmit = async () => {
    if (!token || !pin) {
      setError("PIN required");
      toast.error("Please enter PIN");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await verifyUseWithPin(token, pin);
      if (!res.ok) throw new Error(res.error || "Admission failed");
      setResult(res);
      toast.success("Guest admitted successfully ✅");
    } catch (e) {
      setError(e.message);
      toast.error(e.message || "Admission failed ❌");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "auto",
        padding: 16,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center", color: "#0B2E4E" }}>
        Dominion University • Gate Scanner
      </h2>

      <div
        style={{
          display: "flex",
          flexDirection: window.innerWidth < 768 ? "column" : "row",
          gap: 16,
          marginTop: 20,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            id={readerId}
            style={{
              width: "100%",
              minHeight: 300,
              border: "2px dashed #e5e7eb",
              borderRadius: 10,
              overflow: "hidden",
            }}
          ></div>
          <select
            style={{
              width: "100%",
              marginTop: 10,
              padding: 8,
              borderRadius: 8,
            }}
            value={camId}
            onChange={(e) => setCamId(e.target.value)}
          >
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>
                {cam.label || cam.id}
              </option>
            ))}
          </select>
          {error && (
            <div style={{ color: "red", marginTop: 10, textAlign: "center" }}>
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 16,
            background: "#fff",
          }}
        >
          <h3 style={{ color: "#0B2E4E" }}>Scan Result</h3>
          {busy && <p>Loading...</p>}
          {!result && !busy && <p>No scan yet</p>}

          {result && (
            <>
              <p>
                <strong>Status:</strong>{" "}
                {result.status === "USED" ? (
                  <span style={{ color: "red" }}>USED</span>
                ) : (
                  <span style={{ color: "green" }}>UNUSED</span>
                )}
              </p>
              {result.guest && (
                <>
                  <p>
                    <strong>Guest:</strong> {result.guest.guestName}
                  </p>
                  <p>
                    <strong>Student:</strong> {result.student?.studentName}
                  </p>
                  <p>
                    <strong>Matric:</strong> {result.student?.matricNo}
                  </p>
                </>
              )}
              {result.status === "UNUSED" && (
                <>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter PIN"
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      marginTop: 8,
                    }}
                  />
                  <button
                    onClick={handleAdmit}
                    disabled={busy}
                    style={{
                      background: "#0B2E4E",
                      color: "#fff",
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      marginTop: 12,
                      cursor: "pointer",
                    }}
                  >
                    Admit Guest
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanner;
