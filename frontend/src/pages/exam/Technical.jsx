import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db, doc, setDoc, updateDoc, getDoc } from '../../lib/firebase';
import { useAntiMalpractice } from '../../hooks/useAntiMalpractice';
import { useServerTimer } from '../../hooks/useServerTimer';
import MonacoCodeRunner from '../../components/MonacoCodeRunner';
import ExamWarningModal from '../../components/ExamWarningModal';

export default function ExamTechnical() {
  const nav = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  
  const examId = location.state?.examId;
  const [examData, setExamData] = useState(null);
  const [done, setDone] = useState(false);
  const [duration, setDuration] = useState(45);
  const [notQualified, setNotQualified] = useState(false);
  const [testCases, setTestCases] = useState([]);
  const [examStartTime] = useState(() => new Date());

  // Submit Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitDeclaration, setSubmitDeclaration] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rollNo = profile?.rollNo || '23P61A0501';

  // Cross-round qualification gate: check if student passed Round 1
  useEffect(() => {
    if (profile && !profile.qualifiedForRound2 && !profile.aptitudePassed) {
      setNotQualified(true);
    }
  }, [profile]);

  useEffect(() => {
    if (!examId) return;
    const fetchExam = async () => {
      try {
        const snap = await getDoc(doc(db, 'exams', examId));
        if (snap.exists()) {
          const data = snap.data();
          setExamData(data);
          if (data.durationMinutes) setDuration(data.durationMinutes);
          if (data.testCases && Array.isArray(data.testCases)) {
            setTestCases(data.testCases);
          } else {
            setTestCases([]);
          }
        }
      } catch (err) {
        console.warn('Fetch technical exam warning:', err);
      }
    };
    fetchExam();
  }, [examId]);

  const [latestSubmissionData, setLatestSubmissionData] = useState({ passedCount: 0, totalTests: 0, code: '', lang: 'python' });

  const disqualify = useCallback(async (reason) => {
    setDone(true);
    if (user?.uid) {
      try {
        await setDoc(doc(db, 'examResults', `${examId || 'technical'}_${user.uid}`), {
          uid: user.uid,
          rollNo,
          name: profile?.name || 'Student Candidate',
          department: profile?.department || 'CSE',
          examType: 'Round 2 Technical Coding',
          score: 0,
          status: 'DISQUALIFIED (Malpractice)',
          disqualificationReason: reason,
          driveId: examId || 'general',
          date: new Date().toISOString(),
          testCasesPassed: 0,
          totalTestCases: testCases.length,
          strikes: 1,
        });

        await updateDoc(doc(db, 'users', user.uid), {
          technicalCompleted: true,
          technicalPassed: false,
          technicalScore: 0,
          qualifiedForRound3: false,
          technicalDisqualified: true,
          disqualificationReason: reason,
        });
      } catch (e) {
        console.warn('Technical disqualify error:', e);
      }
    }
  }, [user, examId, rollNo, profile, testCases.length]);

  const handleExitAfterDisqualify = () => {
    nav('/student');
  };

  const mal = useAntiMalpractice({ enabled: !done && !notQualified, zeroTolerance: true, maxStrikes: 1, onDisqualify: disqualify });
  const timer = useServerTimer({ durationMinutes: duration, startTime: examStartTime, onExpire: () => submit(latestSubmissionData) });

  const handleCodeRunnerSubmit = (data) => {
    setLatestSubmissionData({
      passedCount: data?.passedCount ?? 0,
      totalTests: data?.totalTests ?? testCases.length,
      code: data?.code || '',
      lang: data?.lang || 'python',
    });
    setShowSubmitModal(true);
  };

  const submit = async (submissionData) => {
    if (done) return;
    setSubmitting(true);
    setDone(true);

    const dataToSubmit = submissionData || latestSubmissionData;
    const passedCount = dataToSubmit?.passedCount ?? 0;
    const totalTests = dataToSubmit?.totalTests ?? testCases.length;
    
    // Score is based on test cases passed: all must pass to qualify
    const allPassed = totalTests > 0 && passedCount === totalTests;
    const scorePct = totalTests > 0 ? Math.round((passedCount / totalTests) * 100) : 0;

    if (user?.uid) {
      try {
        await setDoc(doc(db, 'examResults', `${examId || 'technical'}_${user.uid}`), {
          uid: user.uid,
          rollNo,
          name: profile?.name || 'Student Candidate',
          department: profile?.department || 'CSE',
          examType: 'Round 2 Technical Coding',
          score: scorePct,
          status: allPassed ? 'PASSED' : 'FAILED',
          driveId: examId || 'general',
          date: new Date().toISOString(),
          testCasesPassed: passedCount,
          totalTestCases: totalTests,
          code: dataToSubmit?.code || '',
          language: dataToSubmit?.lang || 'python',
        });

        // Cross-round: update qualification for Round 3
        await updateDoc(doc(db, 'users', user.uid), {
          technicalCompleted: true,
          technicalPassed: allPassed,
          technicalScore: scorePct,
          qualifiedForTechnical: allPassed,
          qualifiedForRound3: allPassed,
          testCasesPassed: passedCount,
          totalTestCases: totalTests,
        });
      } catch (e) {
        console.warn('Technical update warning:', e);
      }
    }

    setSubmitting(false);
    setShowSubmitModal(false);
    nav('/student');
  };

  // Not qualified gate
  if (notQualified) {
    return (
      <div className="animate-fade-in p-6 max-w-2xl mx-auto">
        <div className="glass-card-premium p-8 text-center" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Not Eligible for Round 2</h2>
          <p className="text-sm text-slate-400 mb-6">You must pass the Round 1 Aptitude Assessment before attempting the Technical Coding round.</p>
          <Link to="/student" className="btn btn-primary">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-6 max-w-6xl mx-auto space-y-6" id="exam-technical" style={{ minHeight: '100vh', background: '#070c18', color: '#f8fafc' }}>
      <ExamWarningModal show={mal.showWarning} message={mal.warningMessage} strikes={mal.strikes} maxStrikes={mal.maxStrikes} onDismiss={mal.dismissWarning} onDisqualified={handleExitAfterDisqualify} />

      {/* Proctoring Top Control Banner */}
      <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(99, 102, 241, 0.35)', borderRadius: '1rem', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge badge-error" style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', fontWeight: 700 }}>
            🔴 AI Zero-Tolerance Proctoring Active
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            Strict Window Focus
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Live Countdown Timer Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#020617', padding: '0.4rem 0.85rem', borderRadius: '0.6rem', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
            <svg style={{ width: 16, height: 16, color: '#818cf8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
              {timer.formatted.display}
            </span>
          </div>

          {/* End & Submit Technical Exam Button */}
          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', fontWeight: 700, fontSize: '0.75rem', padding: '0.45rem 0.9rem', borderRadius: '0.6rem', cursor: 'pointer' }}
          >
            End & Submit Technical Exam
          </button>
        </div>
      </div>

      {/* Header with test case requirement */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(51, 65, 85, 0.7)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-warning" style={{ marginBottom: '0.35rem', fontSize: '0.6875rem' }}>
            ROUND 2: TECHNICAL CODING SANDBOX
          </span>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            {examData?.driveCompany ? `${examData.driveCompany} — ` : ''}Technical Coding Assessment
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Problem: <strong style={{ color: '#818cf8' }}>{examData?.techProblem?.title || '1 to 100 Number Sequence Generator & Filter'}</strong> · Candidate: <strong style={{ color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>{rollNo}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-primary" style={{ fontWeight: 800, fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}>
            Pass all {testCases.length} test cases to qualify
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Problem Statement Card */}
        <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(99, 102, 241, 0.35)', borderRadius: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', borderBottom: '1px solid rgba(51, 65, 85, 0.7)', paddingBottom: '0.6rem', margin: 0 }}>
            Problem Statement
          </h3>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#818cf8', margin: 0 }}>
            {examData?.techProblem?.title || '1 to 100 Number Sequence Generator & Filter'}
          </h4>
          <p style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
            {examData?.techProblem?.description || "Write a program that processes numbers from 1 to 100 based on an input filter mode ('even', 'odd', 'prime', 'multiples_5') and outputs the matching sequence separated by single spaces."}
          </p>

          <div style={{ padding: '0.85rem', borderRadius: '0.75rem', background: '#020617', border: '1px solid rgba(51, 65, 85, 0.8)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ color: '#64748b' }}>// Example 1</span>
            <div><span style={{ color: '#94a3b8' }}>Input: </span><span style={{ color: '#f59e0b' }}>even</span></div>
            <div><span style={{ color: '#94a3b8' }}>Output: </span><span style={{ color: '#34d399', wordBreak: 'break-all' }}>2 4 6 8 10 12 14 16 18 20 22 24 26 28 30 32 34 36 38 40 42 44 46 48 50 52 54 56 58 60 62 64 66 68 70 72 74 76 78 80 82 84 86 88 90 92 94 96 98 100</span></div>
          </div>

          {/* Test Cases List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingTop: '0.5rem' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8', margin: 0 }}>
              Test Cases ({testCases.length})
            </h4>
            {testCases.map((tc, i) => (
              <div key={i} style={{ padding: '0.75rem', borderRadius: '0.6rem', background: '#020617', border: `1px solid ${tc.isHidden || tc.hidden ? 'rgba(245, 158, 11, 0.4)' : 'rgba(51, 65, 85, 0.8)'}`, fontSize: '0.75rem' }}>
                {tc.isHidden || tc.hidden ? (
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>🔒 Hidden Test Case {i + 1} (Evaluated on Final Submit)</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{tc.name || `Test Case ${i + 1}`}</div>
                    <div><span style={{ color: '#64748b' }}>Input Mode: </span><code style={{ color: '#f59e0b' }}>{tc.input}</code></div>
                    <div><span style={{ color: '#64748b' }}>Expected: </span><code style={{ color: '#34d399', wordBreak: 'break-all' }}>{tc.expectedOutput}</code></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Code Runner with Test Cases */}
        <MonacoCodeRunner onSubmit={handleCodeRunnerSubmit} testCases={testCases} />
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
                  Finalize Technical Code & Submit
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

            {/* Test Case Score Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1rem', background: '#070c18', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: '0.85rem', textAlign: 'center' }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                  Test Cases Passed
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: latestSubmissionData.passedCount === testCases.length && testCases.length > 0 ? '#34d399' : '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                  {latestSubmissionData.passedCount} / {testCases.length || 3} Passed
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                  Coding Score
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: latestSubmissionData.passedCount === testCases.length && testCases.length > 0 ? '#34d399' : '#fb7185', fontFamily: 'var(--font-mono)' }}>
                  {testCases.length > 0 ? Math.round((latestSubmissionData.passedCount / testCases.length) * 100) : 0}%
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
              Your solution code will be locked and saved into Cloud Firestore. Qualification for Round 3 Interview requires 100% test case pass rate.
            </p>

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
                  I solemnly declare that I have completed my technical coding solution and wish to finalize and lock my submission.
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
                ← Return to Code Editor
              </button>

              <button
                type="button"
                onClick={() => submit(latestSubmissionData)}
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
