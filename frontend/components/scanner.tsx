"use client";
import { useRef, useState, useEffect } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Camera, ScanLine } from "lucide-react";
export default function Scanner({
  onResult,
}: {
  onResult: (code: string) => Promise<void>;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
      controls.current?.stop();
    },
    [],
  );
  async function found(code: string) {
    controls.current?.stop();
    setRunning(false);
    setBusy(true);
    try {
      await onResult(code);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    setError("");
    setRunning(true);
    try {
      const reader = new BrowserMultiFormatReader();
      let detected = false;
      const c = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        video.current!,
        (result, _err, scanner) => {
          if (result && !detected) {
            detected = true;
            scanner.stop();
            void found(result.getText());
          }
        },
      );
      controls.current = c;
      if (!alive.current) c.stop();
    } catch {
      setRunning(false);
      setError(
        "Camera unavailable. Allow camera access, or enter the barcode below.",
      );
    }
  }
  return (
    <div className="scanner">
      <p className="muted">
        Point your camera at a product barcode. We’ll find it on your shelves.
      </p>
      <div className="camera-view">
        <video ref={video} muted playsInline />
        <div className="scan-frame" />
        {!running && <ScanLine size={60} />}
      </div>
      <button
        className="button primary full"
        onClick={start}
        disabled={running || busy}
      >
        <Camera size={19} />
        {running ? "Looking for a barcode…" : "Use your camera"}
      </button>
      <p className="divider-text">or type it in</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void found(
            String(new FormData(e.currentTarget).get("barcode")).trim(),
          );
        }}
      >
        <label>
          Barcode
          <input
            name="barcode"
            required
            maxLength={100}
            placeholder="Enter barcode number"
          />
        </label>
        <button className="button subtle full" disabled={busy}>
          Find product
        </button>
      </form>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
