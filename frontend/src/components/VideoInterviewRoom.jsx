import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';

export default function VideoInterviewRoom({ peerId, remotePeerId, onEnd }) {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);
  const [status, setStatus] = useState('Initialising video room...');

  const handleCall = (call) => {
    call.on('stream', (rs) => {
      if (remoteRef.current) remoteRef.current.srcObject = rs;
      setConnected(true);
      setStatus('Encrypted Peer Stream Connected');
    });
    call.on('close', () => {
      setConnected(false);
      setStatus('Peer disconnected');
    });
  };

  const init = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;

      const peer = new Peer(peerId, { config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] } });
      peerRef.current = peer;

      peer.on('open', () => {
        setStatus(remotePeerId ? 'Connecting to remote peer...' : 'Waiting for peer connection...');
        if (remotePeerId) handleCall(peer.call(remotePeerId, stream));
      });
      peer.on('call', (call) => {
        call.answer(stream);
        handleCall(call);
      });
      peer.on('error', (e) => setStatus(`Peer error: ${e.type}`));
    } catch {
      setStatus('Camera / mic access denied');
    }
  }, [peerId, remotePeerId]);

  useEffect(() => {
    init();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      peerRef.current?.destroy();
    };
  }, [init]);

  return (
    <div className="glass-card p-0 overflow-hidden border border-slate-800 rounded-2xl shadow-2xl" id="video-room">
      {/* Videos Container */}
      <div className="relative bg-slate-950 aspect-video flex items-center justify-center">
        <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-cover" id="remote-video" />
        {!connected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 text-slate-400">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-xs font-mono">{status}</p>
          </div>
        )}
        {/* PIP local */}
        <div className="absolute bottom-4 right-4 w-44 rounded-xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-2xl">
          <video ref={localRef} autoPlay playsInline muted className="w-full block" id="local-video" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 p-4 border-t border-slate-800 bg-slate-900/80">
        <button
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-2 ${
            !audio ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
          }`}
          onClick={() => { const t = streamRef.current?.getAudioTracks()[0]; if (t) { t.enabled = !t.enabled; setAudio(t.enabled); } }}
          id="btn-mic"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          {audio ? 'Audio On' : 'Audio Muted'}
        </button>
        <button
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-2 ${
            !video ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
          }`}
          onClick={() => { const t = streamRef.current?.getVideoTracks()[0]; if (t) { t.enabled = !t.enabled; setVideo(t.enabled); } }}
          id="btn-cam"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {video ? 'Video On' : 'Video Off'}
        </button>
        <button
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-600/20 border-none flex items-center gap-2"
          onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); peerRef.current?.destroy(); onEnd?.(); }}
          id="btn-end-call"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
          End Interview Call
        </button>
      </div>

      <div className="flex items-center gap-2 p-3 text-xs text-slate-400 border-t border-slate-800 bg-slate-950 font-mono">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
        <span>Status: {status}</span>
      </div>
    </div>
  );
}
