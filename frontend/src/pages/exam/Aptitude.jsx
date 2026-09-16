import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db, doc, setDoc, updateDoc, getDoc } from '../../lib/firebase';
import { useAntiMalpractice } from '../../hooks/useAntiMalpractice';
import { useServerTimer } from '../../hooks/useServerTimer';
import ExamWarningModal from '../../components/ExamWarningModal';

export default function ExamAptitude() {
  const nav = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  
  const examId = location.state?.examId;
  const [examData, setExamData] = useState(null);
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [duration, setDuration] = useState(30);

  // Submit Declaration Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitDeclaration, setSubmitDeclaration] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rollNo = profile?.rollNo || '23P61A0501';

  useEffect(() => {
    if (!examId) return;
    const fetchExam = async () => {
      try {
        const snap = await getDoc(doc(db, 'exams', examId));
        if (snap.exists()) {
          const data = snap.data();
          setExamData(data);
          let loadedQs = [];
          if (data.questions && Array.isArray(data.questions)) {
            loadedQs = [...data.questions];
          }
          if (data.techQuestions && Array.isArray(data.techQuestions)) {
            data.techQuestions.forEach(tq => {
              if (!loadedQs.some(q => q.q === tq.q)) {
                loadedQs.push({ ...tq, topic: tq.topic || 'Technical' });
              }
            });
          }
          setQuestions(loadedQs);
          if (data.durationMinutes || data.aptitudeDurationMinutes) {
            setDuration(data.aptitudeDurationMinutes || data.durationMinutes || 30);
          }
        }
      } catch (err) {
        console.warn('Fetch exam warning:', err);
      }
    };
    fetchExam();
  }, [examId]);

  const disqualify = async (reason) => {
    setDone(true);
    if (user?.uid) {
      try {
        await setDoc(doc(db, 'examResults', `${examId || 'aptitude'}_${user.uid}`), {
          uid: user.uid,
          rollNo: rollNo,
          name: profile?.name || 'Student Candidate',
          department: profile?.department || 'CSE',
          examType: 'Round 1 Aptitude',
          score: 0,
          status: 'DISQUALIFIED (Malpractice)',
          disqualificationReason: reason,
          driveId: examId || 'general',
          date: new Date().toISOString(),
        });
      } catch { /* proceed */ }
    }
    nav('/student');
  };

  const mal = useAntiMalpractice({ enabled: !done, maxStrikes: 3, onDisqualify: disqualify });
  const timer = useServerTimer({ durationMinutes: duration, startTime: new Date(), onExpire: () => handleFinalSubmit() });

  const handleFinalSubmit = async () => {
    if (done) return;
    setSubmitting(true);
    setDone(true);

    const activeQs = questions || [];
    let correctCount = 0;
    activeQs.forEach((q, idx) => {
      if (answers[idx] === q.ans) correctCount++;
    });

    const scorePct = activeQs.length > 0 ? Math.round((correctCount / activeQs.length) * 100) : 0;
    const passCutoff = examData?.passMark || 60;
    const isPass = scorePct >= passCutoff;

    if (user?.uid) {
      try {
        await setDoc(doc(db, 'examResults', `${examId || 'aptitude'}_${user.uid}`), {
          uid: user.uid,
          rollNo: rollNo,
          name: profile?.name || 'Student Candidate',
          department: profile?.department || 'CSE',
          examType: 'Round 1 Aptitude',
          score: scorePct,
          status: isPass ? 'PASSED' : 'FAILED',
          driveId: examId || 'general',
          date: new Date().toISOString(),
        });

        await updateDoc(doc(db, 'users', user.uid), {
          aptitudeCompleted: true,
          aptitudePassed: isPass,
          aptitudeScore: scorePct,
          qualifiedForRound2: isPass,
        });
      } catch (e) {
        console.warn('Aptitude update warning:', e);
      }
    }

    setSubmitting(false);
    setShowSubmitModal(false);
    nav('/student');
  };

  const activeQuestions = questions || [];
  const q = activeQuestions[cur] || activeQuestions[0];
  const answeredCount = Object.keys(answers).length;

  if (!questions || questions.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#070c18', color: '#f8fafc', padding: '2rem' }}>
        <div className="glass-card p-8 text-center max-w-xl mx-auto" style={{ background: 'rgba(15, 23, 42, 0.8)', borderRadius: '1.1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>No Aptitude MCQs Configured</h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.5rem' }}>The TPO has not added questions to the database for this drive assessment yet.</p>
          <button type="button" onClick={() => nav('/student')} className="btn btn-primary">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070c18', color: '#f8fafc', padding: '1.5rem 1rem' }} id="exam-aptitude">
      <ExamWarningModal show={mal.showWarning} message={mal.warningMessage} strikes={mal.strikes} maxStrikes={mal.maxStrikes} onDismiss={mal.dismissWarning} onDisqualified={disqualify} />

      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Proctoring Top Control Bar */}
        <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(99, 102, 241, 0.35)', borderRadius: '1rem', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-error" style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', fontWeight: 700 }}>
              🔴 AI Proctored Active
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
              Strikes: <strong style={{ color: mal.strikes > 0 ? '#fb7185' : '#34d399' }}>{mal.strikes}/3</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Timer Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#020617', padding: '0.4rem 0.85rem', borderRadius: '0.6rem', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
              <svg style={{ width: 16, height: 16, color: '#818cf8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                {timer.formatted.display}
              </span>
            </div>

            {/* End Exam / Submit Header Button */}
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', fontWeight: 700, fontSize: '0.75rem', padding: '0.45rem 0.9rem', borderRadius: '0.6rem', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              End & Submit Exam
            </button>
          </div>
        </div>

        {/* Title Header */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(51, 65, 85, 0.7)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: '0.35rem', fontSize: '0.6875rem' }}>
              ROUND 1: APTITUDE & REASONING SCREENING
            </span>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              {examData?.driveCompany ? `${examData.driveCompany} — ` : ''}{examData?.title || 'Placement Screening Exam'}
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Candidate Roll No: <strong style={{ color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>{rollNo}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Answered:</span>
            <span className="badge badge-success" style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {answeredCount} / {activeQuestions.length}
            </span>
          </div>
        </div>

        {/* Question Palette Navigator */}
        <div style={{ background: '#0f172a', border: '1px solid rgba(51, 65, 85, 0.7)', borderRadius: '0.85rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginRight: '0.5rem', whiteSpace: 'nowrap' }}>
            Question Palette:
          </span>
          {activeQuestions.map((_, idx) => {
            const isCurrent = idx === cur;
            const isAnswered = answers[idx] !== undefined;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCur(idx)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  border: isCurrent ? '2px solid #818cf8' : '1px solid rgba(51, 65, 85, 0.8)',
                  background: isCurrent ? 'rgba(99, 102, 241, 0.3)' : isAnswered ? 'rgba(16, 185, 129, 0.2)' : '#020617',
                  color: isCurrent ? '#ffffff' : isAnswered ? '#34d399' : '#94a3b8',
                  boxShadow: isCurrent ? '0 0 10px rgba(99, 102, 241, 0.4)' : 'none',
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Question Card */}
        <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(99, 102, 241, 0.35)', borderRadius: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span className="badge badge-primary" style={{ fontWeight: 800, fontSize: '0.75rem', padding: '0.25rem 0.55rem', fontFamily: 'var(--font-mono)' }}>
              Q{cur + 1} of {activeQuestions.length}
            </span>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.5, margin: 0 }}>
              {q.q}
            </h3>
          </div>

          {/* Options Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
            {q.opts.map((opt, i) => {
              const isSelected = answers[cur] === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAnswers(p => ({ ...p, [cur]: i }))}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1.1rem',
                    borderRadius: '0.75rem',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    transition: 'all 0.15s ease-in-out',
                    background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(30, 41, 59, 0.5)',
                    border: isSelected ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid rgba(51, 65, 85, 0.6)',
                    color: isSelected ? '#ffffff' : '#cbd5e1',
                    boxShadow: isSelected ? '0 0 14px rgba(99, 102, 241, 0.15)' : 'none',
                  }}
                >
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '0.45rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      background: isSelected ? '#6366f1' : 'rgba(15, 23, 42, 0.8)',
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      border: isSelected ? 'none' : '1px solid rgba(51, 65, 85, 0.8)',
                      flexShrink: 0,
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={cur === 0}
            onClick={() => setCur(cur - 1)}
            style={{ fontWeight: 600, fontSize: '0.8rem', padding: '0.55rem 1.25rem' }}
          >
            ← Previous Question
          </button>

          {cur < activeQuestions.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCur(cur + 1)}
              style={{ fontWeight: 700, fontSize: '0.8rem', padding: '0.55rem 1.25rem' }}
            >
              Next Question →
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-success"
              onClick={() => setShowSubmitModal(true)}
              style={{ fontWeight: 800, fontSize: '0.8rem', padding: '0.55rem 1.35rem' }}
            >
              ✓ Submit Assessment
            </button>
          )}
        </div>
      </div>

      {/* FINAL SUBMIT CONFIRMATION & DECLARATION MODAL */}
      {showSubmitModal && (
        <div className="modal-overlay" style={{ background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)', position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '500px', width: '100%', padding: '1.5rem', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '1.25rem', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(51, 65, 85, 0.6)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', fontWeight: 800 }}>
                  CONFIRM SUBMISSION
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Finalize Exam & Submit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>

            {/* Answered Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1rem', background: '#070c18', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: '0.85rem', textAlign: 'center' }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                  Questions Answered
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                  {answeredCount} / {activeQuestions.length}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                  Unanswered Left
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: activeQuestions.length - answeredCount > 0 ? '#fb7185' : '#818cf8', fontFamily: 'var(--font-mono)' }}>
                  {activeQuestions.length - answeredCount}
                </span>
              </div>
            </div>

            {/* Candidate Declaration Box */}
            <div style={{ padding: '0.85rem 1rem', borderRadius: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={submitDeclaration}
                  onChange={(e) => setSubmitDeclaration(e.target.checked)}
                  style={{ marginTop: '0.2rem', width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#f1f5f9', lineHeight: 1.5, fontWeight: 500 }}>
                  I solemnly declare that I have answered all questions to the best of my knowledge and hereby request to finalize and lock my examination answers.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(51, 65, 85, 0.6)' }}>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="btn btn-ghost"
                style={{ fontWeight: 600, fontSize: '0.75rem' }}
              >
                ← Return to Questions
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={!submitDeclaration || submitting}
                className={`btn ${submitDeclaration ? 'btn-success' : 'btn-disabled'}`}
                style={{ fontWeight: 800, fontSize: '0.75rem', padding: '0.55rem 1.25rem' }}
              >
                {submitting ? 'Submitting...' : '✓ Confirm & Finalize Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
