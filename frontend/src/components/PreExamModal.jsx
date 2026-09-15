import { useState } from 'react';

export default function PreExamModal({ examData, onClose, onStartExam }) {
  const [acceptedDeclaration, setAcceptedDeclaration] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');

  if (!examData) return null;

  const handleStartExam = async () => {
    if (!acceptedDeclaration) return;
    setFullscreenError('');

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      onStartExam(examData);
    } catch (err) {
      console.warn('Fullscreen request prompt fallback:', err);
      onStartExam(examData);
    }
  };

  return (
    <div className="modal-overlay" style={{ background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)', position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="modal-content glass-card" style={{ maxWidth: '520px', width: '100%', padding: '1.5rem', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(99, 102, 241, 0.35)', borderRadius: '1.25rem', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid rgba(51, 65, 85, 0.6)', paddingBottom: '0.85rem' }}>
          <div>
            <span className="badge badge-primary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem', fontWeight: 800, marginBottom: '0.35rem' }}>
              PROCTORED EXAM CONTROL
            </span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: '0.2rem 0 0 0', letterSpacing: '-0.02em' }}>
              {examData.driveCompany || 'Recruitment Drive'} — {examData.title || 'Placement Exam'}
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
              {examData.driveRole || 'Candidate Screening'} · {examData.examType === 'aptitude' ? 'Round 1 Aptitude' : 'Round 2 Technical Coding'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'rgba(51, 65, 85, 0.4)', border: '1px solid rgba(51, 65, 85, 0.6)', color: '#94a3b8', borderRadius: '0.5rem', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            ✕
          </button>
        </div>

        {/* 3 Metric Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', padding: '1rem', background: '#070c18', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: '0.85rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              Exam Timer
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
              {examData.durationMinutes || 30} Mins
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center', borderLeft: '1px solid rgba(51, 65, 85, 0.6)', borderRight: '1px solid rgba(51, 65, 85, 0.6)' }}>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              Pass Cutoff
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
              {examData.passMark || 60}%
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              Anti-Malpractice
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
              3 Strikes
            </span>
          </div>
        </div>

        {/* Examination Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Examination Rules & Guidelines</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ padding: '0.65rem 0.85rem', borderRadius: '0.6rem', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', color: '#fb7185', fontSize: '0.75rem', lineHeight: 1.4 }}>
              <strong style={{ color: '#ffffff', marginRight: '0.35rem' }}>Tab Switching Prohibited:</strong>
              Navigating away from the examination tab automatically records a violation strike.
            </div>
            <div style={{ padding: '0.65rem 0.85rem', borderRadius: '0.6rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#fde68a', fontSize: '0.75rem', lineHeight: 1.4 }}>
              <strong style={{ color: '#ffffff', marginRight: '0.35rem' }}>Full-Screen Required:</strong>
              Exiting full-screen mode adds a violation strike and pauses the test timer.
            </div>
          </div>
        </div>

        {/* Declaration Checkbox */}
        <div style={{ padding: '0.85rem', borderRadius: '0.75rem', background: '#070c18', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={acceptedDeclaration}
              onChange={(e) => setAcceptedDeclaration(e.target.checked)}
              style={{ marginTop: '0.15rem', width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              I agree to follow all proctored examination rules and acknowledge that malpractice will result in immediate disqualification.
            </span>
          </label>
        </div>

        {fullscreenError && (
          <div style={{ padding: '0.65rem', borderRadius: '0.6rem', background: 'rgba(244, 63, 94, 0.12)', color: '#fb7185', fontSize: '0.75rem' }}>
            {fullscreenError}
          </div>
        )}

        {/* Modal Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(51, 65, 85, 0.6)' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            style={{ fontWeight: 600, fontSize: '0.75rem' }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStartExam}
            disabled={!acceptedDeclaration}
            className={`btn ${acceptedDeclaration ? 'btn-primary' : 'btn-disabled'}`}
            style={{ fontWeight: 700, fontSize: '0.75rem', padding: '0.55rem 1.25rem' }}
          >
            Enter Full Screen & Start Exam
          </button>
        </div>
      </div>
    </div>
  );
}
