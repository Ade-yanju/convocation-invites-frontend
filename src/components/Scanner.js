// client/src/components/Scanner.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { verifyCheck, verifyUse } from "../api";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

/**
 * Upgraded Scanner component:
 * - faster fps, smaller qrbox
 * - scanning indicator & overlay
 * - camera start/stop, camera selection, torch toggle
 * - supports keyboard-emulating scanners (global listener)
 * - supports image-file upload scanning
 * - beep + vibration on success
 */

const DU = {
  primary: "#0B2E4E",
  accent: "#D4AF37",
  ink: "#0f172a",
  soft: "#f1f5f9",
  line: "#e5e7eb",
  ok: "#16a34a",
  bad: "#dc2626",
};

const style = {
  wrap: {
    maxWidth: 980,
    margin: "0 auto",
    padding: 16,
    fontFamily: "Inter, system-ui, Arial, sans-serif",
    color: DU.ink,
  },
  top: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 },
  title: { fontWeight: 900, color: DU.primary, fontSize: 20 },
  row: { display: "grid", gridTemplateColumns: "1fr 420px", gap: 16 },
  card: {
    border: `1px solid ${DU.line}`,
    borderRadius: 12,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  head: {
    padding: "12px 14px",
    borderBottom: `1px solid ${DU.line}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: DU.primary,
    fontWeight: 800,
  },
  body: { padding: 12 },
  controlRow: { display: "flex", gap: 8, alignItems: "center" },
  select: {
    height: 36,
    padding: "0 8px",
    borderRadius: 8,
    border: `1px solid ${DU.line}`,
  },
  btn: (primary = true) => ({
    height: 36,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid transparent",
    background: primary ? DU.primary : DU.soft,
    color: primary ? "#fff" : DU.ink,
    fontWeight: 700,
    cursor: "pointer",
  }),
  readerBox: {
    width: "100%",
    minHeight: 340,
    borderRadius: 8,
    border: `2px dashed ${DU.line}`,
    position: "relative",
    overflow: "hidden",
    background: "#fafafa",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  scanningPulse: {
    width: 120,
    height: 120,
    borderRadius: 8,
    border: `2px solid rgba(11,46,78,0.12)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: DU.primary,
    fontWeight: 800,
  },
  mono: {
    fontFamily: "monospace",
    background: "#f8fafc",
    padding: "6px 8px",
    borderRadius: 6,
  },
  hint: { fontSize: 13, color: "#64748b" },
  resultRow: { padding: 12 },
};

export default function Scanner() {
  const readerId = "qr-reader";
  const qrRef = useRef(null);
  const html5Ref = useRef(null); // holds Html5Qrcode instance
  const [cameras, setCameras] = useState([]);
  const [camId, setCamId] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [running, setRunning] = useState(false);

  const [token, setToken] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // scanning state for UI
  const [scanningNow, setScanningNow] = useState(false);

  // buffer for keyboard-emulating scanner input
  const kbBufferRef = useRef({ buf: "", lastTs: 0 });

  // lastSeen to debounce repeated reads
  const lastSeenRef = useRef({ t: "", ts: 0 });

  // tone for success
  const beepRef = useRef(null);
  useEffect(() => {
    // tiny beep generator
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      beepRef.current = (freq = 1000, time = 0.08) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.value = 0.0025;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        g.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + time);
        o.stop(ctx.currentTime + time + 0.02);
      };
    } catch {
      beepRef.current = null;
    }
  }, []);

  // get cameras on mount
  useEffect(() => {
    (async () => {
      try {
        const cams = await Html5Qrcode.getCameras();
        setCameras(cams || []);
        if (cams?.[0]?.id) setCamId(cams[0].id);
      } catch (e) {
        setErr("No camera access - try manual input or upload.");
      }
    })();
  }, []);

  // start / stop camera controlled by camId / running
  useEffect(() => {
    let disposed = false;
    async function startCamera() {
      if (!camId) return;
      // create instance if needed
      if (!html5Ref.current) {
        html5Ref.current = new Html5Qrcode(readerId, { verbose: false });
      }
      const html5QrCode = html5Ref.current;
      try {
        setErr("");
        setScanningNow(true);
        await html5QrCode.start(
          { deviceId: { exact: camId } },
          {
            fps: 15, // faster
            qrbox: { width: 300, height: 300 }, // box size
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          },
          onScanSuccess,
          onScanFailure
        );
        setRunning(true);
        setScanningNow(false);
        // try to set torch if requested
        setTimeout(() => {
          if (torchOn) toggleTorch(true, true);
        }, 250);
      } catch (e) {
        setErr("Could not start camera: " + (e?.message || e));
        setRunning(false);
        setScanningNow(false);
      }
    }

    async function stopCamera() {
      const instance = html5Ref.current;
      if (!instance) return;
      try {
        await instance.stop();
        try {
          instance.clear();
        } catch {}
      } catch {}
      setRunning(false);
    }

    // start automatically if camId present
    if (camId) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      disposed = true;
      // stop on unmount
      (async () => {
        try {
          if (html5Ref.current) {
            await html5Ref.current.stop();
            html5Ref.current.clear();
            html5Ref.current = null;
          }
        } catch {}
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camId]);

  // callback on successful decode from camera
  function onScanSuccess(decodedText) {
    handleDecoded(decodedText, { fromCamera: true });
  }

  // onScanFailure is called frequently; we can use it to show scanning pulse
  function onScanFailure(_err) {
    // don't flood UI
    // we set a brief scanning indicator
    setScanningNow(true);
    clearTimeout(window.__du_scan_pulse__);
    window.__du_scan_pulse__ = setTimeout(() => setScanningNow(false), 250);
  }

  // decode from file upload
  async function scanFile(file) {
    if (!file || !html5Ref.current) return;
    setScanningNow(true);
    try {
      const result = await html5Ref.current.scanFileV2(file, true);
      // scanFileV2 returns an array of results or a single result depending on version
      const decodedText = Array.isArray(result)
        ? result[0]?.decodedText || ""
        : result?.decodedText || "";
      if (decodedText) handleDecoded(decodedText, { fromFile: true });
      else setErr("No QR detected in image");
    } catch (e) {
      setErr("Failed to scan image: " + (e?.message || e));
    } finally {
      setScanningNow(false);
    }
  }

  // parse decoded/captured text. Accepts JSON {"t":"..."} or plain tokens.
  function extractTokenFromDecoded(text) {
    if (!text) return "";
    const s = String(text).trim();
    // try JSON parse
    try {
      const parsed = JSON.parse(s);
      if (parsed && (parsed.t || parsed.token))
        return String(parsed.t || parsed.token);
    } catch {}
    // If QR adds extra whitespace or newlines, clean it
    // Many hardware scanners produce the raw text token or the JSON string; both covered.
    // If the scanned string contains a token inside (e.g. "t:abc..."), attempt to extract with regex
    const m = s.match(/[A-Za-z0-9_-]{8,}/);
    return m ? m[0] : s;
  }

  // main decoded handler with debounce to avoid repeats
  async function handleDecoded(
    decodedText,
    { fromCamera = false, fromFile = false } = {}
  ) {
    const now = Date.now();
    let t = extractTokenFromDecoded(decodedText);
    if (!t) return;
    // ignore repeats within 1200ms
    if (lastSeenRef.current.t === t && now - lastSeenRef.current.ts < 1200)
      return;
    lastSeenRef.current = { t, ts: now };

    // update token & auto-check
    setToken(t);
    await checkToken(t);
  }

  // check token with backend
  async function checkToken(t) {
    setBusy(true);
    setErr("");
    try {
      // if camera running, keep it running; just show busy
      const out = await verifyCheck(t);
      setBusy(false);
      if (out?.ok) {
        setResult(out);
        // feedback (beep/vibrate)
        try {
          beepRef.current && beepRef.current(1400, 0.08);
          navigator.vibrate && navigator.vibrate(80);
        } catch {}
      } else {
        setResult(null);
        setErr(out?.error || "Not recognized");
      }
    } catch (e) {
      setBusy(false);
      setErr(e?.message || "Network error");
      setResult(null);
    }
  }

  // admit (mark used) — pause camera briefly while admitting
  async function admit() {
    if (!token || busy) return;
    setBusy(true);
    setErr("");
    try {
      // pause camera to avoid duplicates
      if (html5Ref.current && running) {
        try {
          await html5Ref.current.pause(true);
        } catch {}
      }

      const out = await verifyUse(token.trim());
      setBusy(false);

      // resume camera after 700ms
      setTimeout(async () => {
        try {
          if (html5Ref.current && running) await html5Ref.current.resume();
        } catch {}
      }, 700);

      if (out?.ok) {
        setResult(out);
        beepRef.current && beepRef.current(1800, 0.12);
        navigator.vibrate && navigator.vibrate([60, 30, 30]);
      } else {
        setErr(out?.error || "Admit failed");
      }
    } catch (e) {
      setBusy(false);
      setErr(e?.message || "Network error");
    }
  }

  // toggle torch (best-effort)
  async function toggleTorch(turnOn, silent = false) {
    try {
      if (!html5Ref.current) return;
      const caps = await html5Ref.current.getRunningTrackCameraCapabilities();
      if (!caps || !caps.torchFeature?.isSupported) {
        if (!silent) setErr("Torch not supported by this camera.");
        return;
      }
      await html5Ref.current.applyVideoConstraints({
        advanced: [{ torch: !!turnOn }],
      });
      setTorchOn(!!turnOn);
    } catch (e) {
      if (!silent) setErr("Failed to toggle torch.");
    }
  }

  // Stop camera completely
  async function stopCamera() {
    try {
      if (html5Ref.current) {
        await html5Ref.current.stop();
        try {
          html5Ref.current.clear();
        } catch {}
        html5Ref.current = null;
      }
    } catch {}
    setRunning(false);
  }

  // keyboard listener for hardware scanners that emulate keyboard input.
  useEffect(() => {
    function onKey(e) {
      // Many scanners end with 'Enter' — we collect until Enter
      const now = Date.now();
      const kb = kbBufferRef.current;
      // reset buffer if paused long time
      if (now - kb.lastTs > 1500) kb.buf = "";
      kb.lastTs = now;

      if (e.key === "Enter") {
        const captured = kb.buf.trim();
        kb.buf = "";
        if (captured) {
          handleDecoded(captured, { fromCamera: false });
        }
      } else if (e.key.length === 1) {
        kb.buf += e.key;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // allow manual paste into input (some scanners paste directly)
  async function onPasteInput(e) {
    const pasted = e.clipboardData?.getData("text") || e.target.value;
    if (pasted) {
      const t = extractTokenFromDecoded(pasted);
      setToken(t);
      await checkToken(t);
    }
  }

  // UI helpers
  const mayAdmit = !!token && !busy && result?.status === "UNUSED";

  return (
    <div style={style.wrap}>
      <div style={style.top}>
        <img
          src="/du-logo.png"
          alt="Dominion University"
          style={{ height: 40 }}
        />
        <div style={style.title}>Dominion University • Entrance Scanner</div>
      </div>

      <div style={style.row}>
        <div style={style.card}>
          <div style={style.head}>
            <div>Scanner</div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                aria-label="Camera"
                style={style.select}
                value={camId}
                onChange={(e) => setCamId(e.target.value)}
              >
                {cameras.length === 0 && <option value="">No camera</option>}
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || c.id}
                  </option>
                ))}
              </select>

              <button
                type="button"
                style={style.btn(!running)}
                onClick={() => {
                  if (running) {
                    stopCamera();
                  } else if (camId) {
                    // reassign camId to trigger start logic
                    setCamId((v) => (v ? v : ""));
                    // start handled by effect
                  }
                }}
              >
                {running ? "Stop" : "Start"}
              </button>

              <button
                type="button"
                style={style.btn(false)}
                onClick={() => toggleTorch(!torchOn)}
                title="Toggle torch (if supported)"
              >
                {torchOn ? "Torch Off" : "Torch On"}
              </button>

              <label style={{ display: "inline-block" }}>
                <input
                  style={{ display: "none" }}
                  type="file"
                  accept="image/*"
                  onChange={(ev) => {
                    const f = ev.target.files && ev.target.files[0];
                    if (f) scanFile(f);
                    ev.target.value = null;
                  }}
                />
                <span style={{ ...style.btn(false), padding: "8px 10px" }}>
                  Upload Image
                </span>
              </label>
            </div>
          </div>

          <div style={style.body}>
            <div id={readerId} style={style.readerBox}>
              {/* overlay scanning pulse */}
              <div style={style.overlay}>
                <div style={style.scanningPulse}>
                  {scanningNow
                    ? "Scanning…"
                    : running
                    ? "Ready"
                    : "Camera stopped"}
                </div>
              </div>

              {/* html5-qrcode injects video element into the readerId container */}
            </div>

            {/* manual token input */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                Manual token (or paste scanned result)
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  placeholder="Paste token or scanned JSON here"
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 8,
                    border: `1px solid ${DU.line}`,
                    padding: "0 10px",
                  }}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onPaste={onPasteInput}
                />
                <button
                  style={style.btn(false)}
                  onClick={() => {
                    setToken("");
                    setResult(null);
                    setErr("");
                  }}
                >
                  Clear
                </button>
                <button
                  style={style.btn(true)}
                  onClick={() => token && checkToken(token)}
                  disabled={!token || busy}
                >
                  {busy ? "Checking…" : "Check"}
                </button>
                <button
                  style={{ ...style.btn(true), opacity: mayAdmit ? 1 : 0.6 }}
                  onClick={admit}
                  disabled={!mayAdmit}
                >
                  {busy ? "Marking…" : "Admit"}
                </button>
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={style.hint}>
                  Tip: If you use a hardware scanner (gun), it will usually type
                  the scanned string into this page — press Enter or the Check
                  button will auto-run.
                </span>
              </div>

              {err && <div style={{ color: DU.bad, marginTop: 8 }}>{err}</div>}
            </div>
          </div>
        </div>

        <div style={style.card}>
          <div style={style.head}>Result</div>
          <div style={style.body}>
            {!result ? (
              <div style={style.hint}>
                Scan a QR (via camera) or paste a token to view status.
              </div>
            ) : (
              <div style={style.resultRow}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Status: </strong>
                  {result.status === "USED" ? (
                    <span style={{ color: DU.bad, fontWeight: 800 }}>USED</span>
                  ) : result.status === "UNUSED" ? (
                    <span style={{ color: DU.ok, fontWeight: 800 }}>
                      UNUSED
                    </span>
                  ) : (
                    <span style={{ fontWeight: 800 }}>{result.status}</span>
                  )}
                </div>

                {result.guest && (
                  <div style={{ marginBottom: 8 }}>
                    <div>
                      <strong>Guest:</strong> {result.guest.guestName}
                    </div>
                    <div>
                      <strong>Student:</strong> {result.student?.studentName}
                    </div>
                    <div>
                      <strong>Matric:</strong> {result.student?.matricNo}
                    </div>
                  </div>
                )}

                <div>
                  <strong>Token:</strong>{" "}
                  <span style={style.mono}>{token}</span>
                </div>

                {result.usedAt && (
                  <div style={{ marginTop: 8 }}>
                    <strong>Used at:</strong>{" "}
                    {new Date(result.usedAt).toLocaleString()}
                  </div>
                )}
                {result.usedBy && (
                  <div style={{ marginTop: 4 }}>
                    <strong>Checked by:</strong> {result.usedBy}
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
