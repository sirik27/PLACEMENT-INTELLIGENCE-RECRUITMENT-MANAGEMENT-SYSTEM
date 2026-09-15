import { Link } from 'react-router-dom';

export default function TPOTrends() {
  const alerts = [
    { type: 'error', title: 'Coding Failure Alert', text: 'Coding round failure rate >50% for EEE cohort during Tier-1 drives', severity: 'Critical', action: 'Schedule Remedial Coding Session' },
    { type: 'warning', title: 'HR Round Rejection High', text: 'HR rejection exceeds 40% threshold for Civil & Mechanical branches', severity: 'High', action: 'Trigger Mock Interview Module' },
    { type: 'success', title: 'CSE Placement Peak', text: '93% of CSE students cleared Aptitude & Coding benchmarks', severity: 'Positive', action: 'Notify Placement Committee' },
  ];

  return (
    <div className="animate-fade-in space-y-6" id="tpo-trends">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Placement <span className="text-gradient">Trends & Alerts</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Anomaly detection and bottleneck telemetry across departments</p>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.map((a, i) => (
          <div
            key={i}
            className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              a.type === 'error'
                ? 'bg-rose-500/5 border-rose-500/20'
                : a.type === 'warning'
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-emerald-500/5 border-emerald-500/20'
            }`}
          >
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-slate-100">{a.title}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  a.type === 'error'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : a.type === 'warning'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {a.severity}
                </span>
              </div>
              <p className="text-xs text-slate-400">{a.text}</p>
            </div>

            <button className="btn btn-secondary text-xs shrink-0">
              {a.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
