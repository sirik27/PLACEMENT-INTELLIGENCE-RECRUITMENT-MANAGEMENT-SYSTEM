import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function OfflineQrScanner({ onScan, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const scannerRef = useRef(null);

  const start = async () => {
    setError(''); setResult(null);
    try {
      const s = new Html5Qrcode('qr-reader');
      scannerRef.current = s;
      await s.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => { setResult(text); onScan?.(text); s.stop().catch(() => {}); setScanning(false); },
        () => {}
      );
      setScanning(true);
    } catch (e) { setError(`Camera error: ${e.message || e}`); }
  };

  const stop = async () => { try { await scannerRef.current?.stop(); } catch {} setScanning(false); };

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  return (
    <div className="glass-card p-6 space-y-4" id="qr-scanner">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          Offline Attendance QR Scanner
        </h3>
        {onClose && <button className="text-slate-400 hover:text-slate-200 text-xs" onClick={onClose}>✕</button>}
      </div>
      <div id="qr-reader" className="w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950" />
      {result && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">Scanned Payload: {result}</div>}
      {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">{error}</div>}
      <div className="pt-2">
        {!scanning
          ? <button className="btn btn-primary text-xs w-full" onClick={start} id="btn-start-scan">Start Camera Scan</button>
          : <button className="btn btn-secondary text-xs w-full" onClick={stop} id="btn-stop-scan">Stop Camera</button>}
      </div>
    </div>
  );
}
