import { useState } from 'react';
import { submitRubric } from '../lib/api';

const CATEGORIES = [
  { key: 'technical', label: 'Technical Competence', desc: 'DSA, domain knowledge, system architecture' },
  { key: 'problem_solving', label: 'Problem Solving & Logic', desc: 'Analytical approach, edge case thinking' },
  { key: 'communication', label: 'Communication & Articulation', desc: 'Clarity, listening skills, presentation' },
  { key: 'cultural_fit', label: 'Cultural & Teamwork Fit', desc: 'Ownership, adaptability, collaboration' },
  { key: 'overall_potential', label: 'Overall Candidate Potential', desc: 'Growth trajectory, leadership promise' },
];

export default function RecruiterRubricPanel({ interviewId, candidateName, onSaved }) {
  const [scores, setScores] = useState({ technical: 0, problem_solving: 0, communication: 0, cultural_fit: 0, overall_potential: 0 });
  const [notes, setNotes] = useState('');
  const [recommendation, setRecommendation] = useState('Selected');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / CATEGORIES.length;

  const scoreColor = (s) => s >= 8 ? '#34d399' : s >= 6 ? '#818cf8' : s >= 4 ? '#fbbf24' : '#f87171';

  const save = async () => {
    setSaving(true);
    try {
      await submitRubric(interviewId, { scores, average: avg, notes, recommendation });
      setSaved(true);
      onSaved?.({ scores, average: avg, notes, recommendation });
    } catch (err) { console.error('[Rubric]', err); }
    setSaving(false);
  };

  return (
    <div className="glass-card p-6 space-y-6" id="rubric-panel">
      <div className="border-b border-slate-800 pb-3">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          Interview Assessment Rubric
        </h3>
        {candidateName && <p className="text-xs text-slate-400 mt-1">Candidate: <strong className="text-slate-200">{candidateName}</strong></p>}
      </div>

      <div className="space-y-4">
        {CATEGORIES.map(cat => (
          <div key={cat.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-200">{cat.label}</span>
                <span className="text-slate-400 text-[10px] block">{cat.desc}</span>
              </div>
              <span className="font-bold text-sm font-mono" style={{ color: scoreColor(scores[cat.key]) }}>
                {scores[cat.key]}/10
              </span>
            </div>

            <div className="flex gap-1.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setScores(p => ({ ...p, [cat.key]: i + 1 })); setSaved(false); }}
                  title={`${i + 1}/10`}
                  className={`flex-1 h-7 rounded text-xs font-bold transition-all ${
                    i < scores[cat.key]
                      ? 'text-slate-950 font-extrabold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                  style={{
                    backgroundColor: i < scores[cat.key] ? scoreColor(scores[cat.key]) : undefined
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Average Score */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300">Overall Weighted Score</span>
        <span className="text-xl font-extrabold font-mono" style={{ color: scoreColor(avg) }}>
          {avg.toFixed(1)} / 10
        </span>
      </div>

      {/* Outcome Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 block">Decision Outcome</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'Selected', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            { id: 'Waitlisted', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
            { id: 'Rejected', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
          ].map(opt => (
            <button
              key={opt.id}
              className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                recommendation === opt.id
                  ? opt.color + ' ring-1 ring-indigo-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
              onClick={() => setRecommendation(opt.id)}
            >
              {opt.id}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300 block">Evaluator Notes</label>
        <textarea
          className="input-field text-xs"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Technical strengths, communication feedback..."
        />
      </div>

      <button
        className={`btn w-full text-xs font-bold ${saved ? 'btn-success' : 'btn-primary'}`}
        onClick={save}
        disabled={saving || avg === 0}
      >
        {saved ? 'Saved Successfully' : saving ? 'Saving...' : 'Save Evaluation Rubric'}
      </button>
    </div>
  );
}
