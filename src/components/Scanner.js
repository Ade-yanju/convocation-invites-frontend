// client/src/components/Scanner.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { verifyCheck, verifyUse } from "../api";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const DU = {
  primary: "#0B2E4E", // Dominion navy
  accent: "#D4AF37", // Dominion gold
  ink: "#0f172a",
  soft: "#f1f5f9",
  line: "#e5e7eb",
  ok: "#16a34a",
  bad: "#dc2626",
};

const S = {
  wrap: {
    maxWidth: 980,
    margin: "0 auto",
    padding: 16,
    fontFamily: "Inter, system-ui, Arial, sans-serif",
    color: DU.ink,
  },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  card: {
    border: `1px solid ${DU.line}`,
    borderRadius: 16,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  head: {
    padding: "14px 18px",
    borderBottom: `1px solid ${DU.line}`,
    fontWeight: 800,
    color: DU.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  body: { padding: 16 },
  input: {
    width: "100%",
    height: 40,
    borderRadius: 12,
    border: `1px solid ${DU.line}`,
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
  },
  btnRow: { display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" },
  btn: (v = "primary") => ({
    height: 40,
    padding: "0 16px",
    borderRadius: 12,
    border: "1px solid transparent",
    background: v === "primary" ? DU.primary : DU.soft,
    color: v === "primary" ? "#fff" : DU.ink,
    fontWeight: 800,
    cursor: "pointer",
  }),
  select: {
    height: 40,
    padding: "0 12px",
    borderRadius: 12,
    border: `1px solid ${DU.line}`,
    background: "#fff",
  },
  mono: {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    background: "#f8fafc",
    padding: "8px 10px",
    borderRadius: 8,
    border: `1px dashed ${DU.line}`,
  },
  ok: { color: DU.ok, fontWeight: 800 },
  bad: { color: DU.bad, fontWeight: 800 },
  pill: (c) => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 999,
    background: c,
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
  }),
  hint: { fontSize: 12, color: "#64748b" },
};

export default function Scanner() {
  const readerId = "qr-reader";
  const qrRef = useRef(null);
  const [cams, setCams] = useState([]);
  const [camId, setCamId] = useState("");
  const [torchOn, setTorchOn] = useState(false);

  const [token, setToken] = useState("");
  const [result, setResult] = useState(null); // {ok, status, guest, student, usedAt}
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // --- camera bootstrap
  useEffect(() => {
    (async () => {
      try {
        const found = await Html5Qrcode.getCameras();
        setCams(found || []);
        if (found?.[0]?.id) setCamId(found[0].id);
      } catch {
        setErr("Camera unavailable. Use manual token input.");
      }
    })();
  }, []);

  // --- start/stop when camId changes
  useEffect(() => {
    let disposed = false;
    async function start() {
      if (!camId) return;
      const html5QrCode = new Html5Qrcode(readerId, { verbose: false });
      qrRef.current = html5QrCode;

      try {
        await html5QrCode.start(
          { deviceId: { exact: camId } },
          {
            fps: 8,
            qrbox: 260,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          },
          onScanSuccess,
          () => {}
        );
        // try to set torch if supported
        setTimeout(() => toggleTorch(torchOn, true), 200);
      } catch (e) {
        if (!disposed) setErr("Could not start camera.");
      }
    }
    start();

    return () => {
      disposed = true;
      try {
        qrRef.current?.stop();
      } catch {}
      try {
        qrRef.current?.clear();
      } catch {}
      qrRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camId]);

  // --- decode -> setToken (debounced to avoid rapid repeats)
  const lastSeenRef = useRef({ t: "", ts: 0 });
  function onScanSuccess(decodedText) {
    const now = Date.now();
    let t = decodedText;
    try {
      t = JSON.parse(decodedText)?.t || decodedText;
    } catch {}
    t = String(t || "").trim();

    // ignore tiny repeats for 1.5s
    if (lastSeenRef.current.t === t && now - lastSeenRef.current.ts < 1500)
      return;
    lastSeenRef.current = { t, ts: now };

    if (t) {
      setToken(t);
      // auto-check on scan
      check(t, { fromScan: true });
    }
  }

  async function toggleTorch(next, silent = false) {
    try {
      if (!qrRef.current) return;
      const capabilities =
        await qrRef.current.getRunningTrackCameraCapabilities();
      if (!capabilities || !capabilities.torchFeature?.isSupported) {
        if (!silent) setErr("Torch not supported on this camera.");
        return;
      }
      await qrRef.current.applyVideoConstraints({
        advanced: [{ torch: !!next }],
      });
      setTorchOn(!!next);
    } catch {
      if (!silent) setErr("Failed to toggle torch.");
    }
  }

  // --- API calls
  async function check(_token = token, { fromScan = false } = {}) {
    if (!_token) return;
    setBusy(true);
    setErr("");
    const out = await verifyCheck(_token);
    setBusy(false);
    if (out?.ok) {
      setResult(out);
      if (fromScan && out.status === "UNUSED") {
        // optional: haptic/short beep
        try {
          new AudioContext().resume().then(() => {});
        } catch {}
      }
    } else {
      setResult(null);
      setErr(out?.error || "Invalid token");
    }
  }

  async function admit() {
    if (!token || busy) return;
    setBusy(true);
    setErr("");
    // pause camera while admitting to avoid double taps
    try {
      await qrRef.current?.pause(true);
    } catch {}

    const out = await verifyUse(token.trim());

    setBusy(false);
    // resume camera after a short delay
    setTimeout(() => {
      try {
        qrRef.current?.resume();
      } catch {}
    }, 800);

    if (out?.ok) {
      setResult(out);
    } else {
      setErr(out?.error || "Admit failed");
    }
  }

  const mayAdmit = useMemo(
    () => !!token && !busy && result?.status === "UNUSED",
    [token, busy, result]
  );

  return (
    <div style={S.wrap}>
      <div
        style={{
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <img
          src="/du-logo.png"
          alt="Dominion University"
          style={{ height: 40 }}
        />
        <div style={{ fontWeight: 900, color: DU.primary, fontSize: 20 }}>
          Dominion University • Entrance Scanner
        </div>
      </div>

      <div style={S.row}>
        <div className="left" style={S.card}>
          <div style={S.head}>
            <span>Scanner</span>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                style={S.select}
                value={camId}
                onChange={(e) => setCamId(e.target.value)}
                title="Camera"
              >
                {cams.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || c.id}
                  </option>
                ))}
              </select>
              <button
                style={S.btn("secondary")}
                onClick={() => toggleTorch(!torchOn)}
                type="button"
              >
                {torchOn ? "Torch Off" : "Torch On"}
              </button>
            </div>
          </div>

          <div style={S.body}>
            <div
              id={readerId}
              style={{
                width: "100%",
                minHeight: 300,
                borderRadius: 12,
                border: `1px dashed ${DU.line}`,
              }}
            />

            <div style={{ marginTop: 12 }}>
              <div style={{ ...S.hint, marginBottom: 6 }}>
                Manual token (fallback)
              </div>
              <input
                style={S.input}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token here…"
              />
              <div style={S.btnRow}>
                <button
                  style={S.btn("secondary")}
                  type="button"
                  onClick={() => {
                    setToken("");
                    setResult(null);
                    setErr("");
                  }}
                >
                  Clear
                </button>
                <button
                  style={S.btn("primary")}
                  disabled={!token || busy}
                  type="button"
                  onClick={() => check()}
                >
                  {busy ? "Checking…" : "Check status"}
                </button>
                <button
                  style={S.btn("primary")}
                  disabled={!mayAdmit}
                  type="button"
                  onClick={admit}
                >
                  {busy ? "Marking…" : "Admit (mark used)"}
                </button>
              </div>
              {err && (
                <div style={{ marginTop: 8, color: DU.bad, fontSize: 13 }}>
                  {err}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="right" style={S.card}>
          <div style={S.head}>Result</div>
          <div style={S.body}>
            {!result ? (
              <div style={S.hint}>
                Scan a QR or paste a token to view status.
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 8 }}>
                  Status:&nbsp;
                  {result.status === "USED" ? (
                    <span style={S.pill(DU.bad)}>USED</span>
                  ) : result.status === "UNUSED" ? (
                    <span style={S.pill(DU.ok)}>UNUSED</span>
                  ) : (
                    <span style={S.pill("#64748b")}>{result.status}</span>
                  )}
                </div>

                {result.guest && (
                  <div style={{ marginBottom: 10 }}>
                    <div>
                      <b>Guest:</b> {result.guest.guestName}
                    </div>
                    <div>
                      <b>Student:</b> {result.student?.studentName}
                    </div>
                    <div>
                      <b>Matric:</b> {result.student?.matricNo}
                    </div>
                  </div>
                )}

                <div>
                  <b>Token:</b> <span style={S.mono}>{token}</span>
                </div>

                {result.usedAt && (
                  <div style={{ marginTop: 6 }}>
                    <b>Used at:</b> {new Date(result.usedAt).toLocaleString()}
                  </div>
                )}
                {result.usedBy && (
                  <div style={{ marginTop: 2 }}>
                    <b>Checked by:</b> {result.usedBy}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
