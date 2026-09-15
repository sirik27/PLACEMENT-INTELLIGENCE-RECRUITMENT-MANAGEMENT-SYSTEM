import { useState } from 'react';

export default function TPOSimulator() {
  const [cgpa, setCgpa] = useState(7.0);
  const [apt, setApt] = useState(65);
  const [code, setCode] = useState(60);

  const total = 120;
  const eligible = Math.round(total * (1 - (cgpa - 5) * 0.15));
  const aptCleared = Math.round(eligible * 0.85 * (1 - (apt - 50) * 0.01));
  const techCleared = Math.round(aptCleared * 0.35 * (1 - (code - 50) * 0.01));
  const hired = Math.max(1, Math.round(techCleared * 0.25));

  const steps = [
    { label: `CGPA Eligible (≥${cgpa.toFixed(1)})`, value: eligible, color: '#818cf8' },
    { label: `Aptitude Cleared (≥${apt}%)`, value: aptCleared, color: '#38bdf8' },
    { label: `Technical Cleared (≥${code}%)`, value: techCleared, color: '#fbbf24' },
    { label: 'Final Hired (Offers)', value: hired, color: '#34d399' },
  ];

  return (
    <div className="animate-fade-in space-y-6" id="tpo-simulator">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Placement Drive <span className="text-gradient">Yield Simulator</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Simulate campus hiring yield funnel by adjusting academic and exam cutoff thresholds</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sliders */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-semibold text-slate-100 border-b border-slate-800 pb-3">Cutoff Parameters</h3>
          {[
            { label: 'CGPA Cutoff Threshold', val: cgpa.toFixed(1), min: 5, max: 9, step: 0.1, set: v => setCgpa(parseFloat(v)) },
            { label: 'Aptitude Cutoff %', val: `${apt}%`, min: 40, max: 90, step: 5, set: v => setApt(parseInt(v)) },
            { label: 'Coding Cutoff %', val: `${code}%`, min: 40, max: 90, step: 5, set: v => setCode(parseInt(v)) },
          ].map(s => (
            <div key={s.label} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">{s.label}</span>
                <span className="font-bold text-indigo-400 font-mono">{s.val}</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={s.label.includes('CGPA') ? cgpa : s.label.includes('Aptitude') ? apt : code}
                onChange={e => s.set(e.target.value)}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          ))}
        </div>

        {/* Funnel output */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-100 border-b border-slate-800 pb-3">Yield Funnel Simulation</h3>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Total Student Cohort Pool</span>
            <strong className="text-base text-slate-100 font-mono">{total} Candidates</strong>
          </div>

          <div className="space-y-2.5">
            {steps.map((s, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <span className="font-medium text-slate-300">{i + 1}. {s.label}</span>
                <strong className="font-mono text-sm" style={{ color: s.color }}>
                  {s.value} ({Math.round(s.value / total * 100)}%)
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
