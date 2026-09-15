import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db, doc, onSnapshot, setDoc, updateDoc } from '../../lib/firebase';
import VideoInterviewRoom from '../../components/VideoInterviewRoom';
import RecruiterRubricPanel from '../../components/RecruiterRubricPanel';

export default function InterviewRoomPage() {
  const { id } = useParams();
  const { role, profile } = useAuth();
  const nav = useNavigate();
  const interviewId = id || 'demo-interview';
  const isRecruiter = role === 'recruiter' || role === 'tpo';

  const [joinState, setJoinState] = useState({
    joinRequested: false,
    joinAccepted: false,
    studentName: 'Candidate',
  });
  const [loading, setLoading] = useState(true);

  const peerId = isRecruiter ? `rec_${interviewId}` : `stu_${interviewId}`;
  const remotePeerId = isRecruiter ? `stu_${interviewId}` : `rec_${interviewId}`;

  useEffect(() => {
    const docRef = doc(db, 'interviews', interviewId);

    if (!isRecruiter) {
      // Student requests to join
      setDoc(docRef, {
        joinRequested: true,
        joinAccepted: false,
        studentName: profile?.name || 'Aarav Sharma',
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(console.warn);
    }

    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setJoinState({
          joinRequested: !!data.joinRequested,
          joinAccepted: !!data.joinAccepted,
          studentName: data.studentName || 'Aarav Sharma',
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [interviewId, isRecruiter, profile?.name]);

  const handleAcceptStudent = async () => {
    try {
      await updateDoc(doc(db, 'interviews', interviewId), {
        joinAccepted: true,
        acceptedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Accept join error:', e);
      setJoinState(prev => ({ ...prev, joinAccepted: true }));
    }
  };

  const handleRejectStudent = async () => {
    try {
      await updateDoc(doc(db, 'interviews', interviewId), {
        joinRequested: false,
        joinAccepted: false,
      });
    } catch { /* proceed */ }
  };

  return (
    <div className="animate-fade-in space-y-6" id="interview-room">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border-indigo-500/20">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                Live WebRTC <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Interview Room</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Encrypted PeerJS video stream & real-time evaluation rubric</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Recruiter Join Handshake Enabled
          </span>
        </div>
      </div>

      {/* Recruiter Banner for Pending Student Join */}
      {isRecruiter && joinState.joinRequested && !joinState.joinAccepted && (
        <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              !
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">Candidate In Waiting Room</h4>
              <p className="text-xs text-slate-300">
                <strong className="text-white">{joinState.studentName}</strong> is requesting entry to this interview session.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRejectStudent}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            >
              Decline
            </button>
            <button
              onClick={handleAcceptStudent}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all"
            >
              Accept Candidate Join
            </button>
          </div>
        </div>
      )}

      {/* Main Room Container */}
      {!isRecruiter && !joinState.joinAccepted ? (
        <div className="glass-card p-12 text-center border-indigo-500/20 max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-100">Waiting for Recruiter Approval</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your join request has been sent to the recruiter. Please stay on this screen. Video & audio stream will commence automatically once accepted.
          </p>
          <div className="pt-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-slate-900 text-slate-400 border border-slate-800">
              STATUS: PENDING_RECRUITER_HANDSHAKE
            </span>
          </div>
        </div>
      ) : (
        <div className={`grid gap-6 ${isRecruiter ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          <div className={isRecruiter ? 'lg:col-span-2' : ''}>
            <VideoInterviewRoom peerId={peerId} remotePeerId={remotePeerId} onEnd={() => nav(`/${role}`)} />
          </div>
          {isRecruiter && (
            <div>
              <RecruiterRubricPanel interviewId={interviewId} candidateName={joinState.studentName} onSaved={() => {}} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
