export default function ExamWarningModal({ show, message, strikes, maxStrikes, onDismiss, onDisqualified }) {
  if (!show) return null;
  const disqualified = strikes >= maxStrikes;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-sm text-center space-y-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
          disqualified ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
        }`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className={`text-lg font-bold ${disqualified ? 'text-rose-400' : 'text-amber-400'}`}>
          {disqualified ? 'EXAM DISQUALIFIED' : 'Anti-Malpractice Warning'}
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">{message}</p>

        <div className="flex justify-center gap-1.5 py-1">
          {Array.from({ length: maxStrikes }).map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i < strikes ? 'bg-rose-500' : 'bg-slate-800'}`} />
          ))}
        </div>
        <p className="text-[10px] text-slate-400 font-mono">Violation Strike {strikes} of {maxStrikes}</p>

        <div className="pt-2">
          {disqualified ? (
            <button className="btn btn-primary text-xs w-full bg-rose-600 hover:bg-rose-500 border-none" onClick={onDisqualified} id="btn-disqualified">
              Exit Exam
            </button>
          ) : (
            <button className="btn btn-secondary text-xs w-full" onClick={onDismiss} id="btn-dismiss-warning">
              I Understand & Acknowledge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
