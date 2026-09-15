import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

/* ── SVG Icons ────────────────────────────────── */
const TrendUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);
const TrendDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
);
const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);

/* ── Animated SVG Ring ────────────────────────── */
function AnimatedRing({ value, size = 180, strokeWidth = 10 }) {
  const [animatedOffset, setAnimatedOffset] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (value / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedOffset(targetOffset), 100);
    return () => clearTimeout(timer);
  }, [targetOffset]);

  const color = value >= 75 ? '#34d399' : value >= 50 ? '#818cf8' : '#fbbf24';
  const gradientId = `ring-grad-${value}`;

  return (
    <div className="progress-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={value >= 75 ? '#10b981' : value >= 50 ? '#6366f1' : '#f59e0b'} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(51,65,85,0.3)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={`url(#${gradientId})`} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={animatedOffset === 0 ? circumference : animatedOffset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="ring-label">
        <span style={{ fontSize: '2.5rem', fontWeight: 800, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}%</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--slate-400)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Probability</span>
      </div>
    </div>
  );
}

export default function StudentPredictions() {
  const { profile } = useAuth();

  const cgpa = profile?.cgpa || 0;
  const cgpaScore = cgpa > 0 ? Math.min(100, Math.round((cgpa / 10) * 100)) : 0;
  const aptScore = profile?.aptitudeScore || (profile?.aptitudeCompleted ? (profile.aptitudePassed ? 100 : 40) : 0);
  const codingScore = profile?.codingScore || profile?.technicalScore || (profile?.technicalCompleted ? (profile.technicalPassed ? 100 : 40) : 0);
  const studentSkills = profile?.skills || profile?.acquiredSkills || [];
  const domainScore = studentSkills.length > 0 ? Math.min(100, Math.round((studentSkills.length / 6) * 100)) : 0;
  const readiness = Math.round((cgpaScore * 0.30) + (aptScore * 0.25) + (codingScore * 0.25) + (domainScore * 0.20));
  const offerProbability = readiness > 0 ? Math.min(98, Math.max(10, Math.round(readiness * 1.1))) : 0;

  const factors = [
    { label: 'Academic CGPA', value: cgpaScore, positive: cgpaScore >= 75, desc: `${cgpa} / 10.0` },
    { label: 'Aptitude Score', value: aptScore, positive: aptScore >= 70, desc: `${aptScore}% Proctored` },
    { label: 'Coding Proficiency', value: codingScore, positive: codingScore >= 75, desc: `${codingScore}% Technical` },
    { label: 'Domain Skills', value: domainScore, positive: domainScore >= 60, desc: `${studentSkills.length} Verified Skills` },
  ];

  const recommendations = [
    { title: 'Target Tier-1 Core Skills', desc: 'Acquire Docker and System Design to boost product role eligibility.', badge: '+8% Boost', link: '/student/skills', linkText: 'Explore Skill Gap' },
    { title: 'Proctored Aptitude Standing', desc: `Scored ${aptScore}% in proctored aptitude testing.`, badge: 'Verified', link: null },
    { title: 'Coding Proficiency Status', desc: `Scored ${codingScore}% in proctored coding evaluation.`, badge: 'Verified', link: null },
  ];

  return (
    <div className="animate-fade-in space-y-6" id="student-predictions">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            AI Outcome <span className="text-gradient">Predictions</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Placement offer probability computed dynamically from performance telemetry</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Animated Probability Ring */}
        <div className="glass-card-premium p-8 text-center flex flex-col items-center justify-center" style={{ position: 'relative', zIndex: 1 }}>
          <h3 className="text-lg font-semibold text-slate-100 mb-6">Campus Offer Probability</h3>
          <AnimatedRing value={offerProbability} />
          <div className="mt-6" style={{ position: 'relative', zIndex: 1 }}>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
              offerProbability >= 75
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {offerProbability >= 75 ? <TrendUpIcon /> : <TrendDownIcon />}
              {offerProbability >= 75 ? 'High Selection Probability' : 'Moderate Selection Probability'}
            </div>
            <p className="text-xs text-slate-400 mt-3 max-w-xs mx-auto">
              Calculated using your {cgpa} CGPA, {readiness}% Readiness Index, and assessment telemetry.
            </p>
          </div>
        </div>

        {/* Key Factors */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Key Impact Factors</h3>
          <div className="space-y-3">
            {factors.map(f => (
              <div key={f.label} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: f.positive ? 'var(--success-400)' : 'var(--warning-400)',
                      boxShadow: `0 0 8px ${f.positive ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`
                    }} />
                    <span className="text-sm font-semibold text-slate-200">{f.label}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{f.desc}</span>
                </div>
                <div className="progress-bar" style={{ height: 6 }}>
                  <div className="progress-fill" style={{
                    width: `${f.value}%`,
                    background: f.positive ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Optimization Action Plan</h3>
        <div className="space-y-3">
          {recommendations.map(r => (
            <div key={r.title} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-200">{r.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {r.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{r.desc}</p>
              </div>
              {r.link && (
                <Link to={r.link} className="btn btn-secondary text-xs shrink-0 flex items-center gap-1">
                  {r.linkText} <ArrowRightIcon />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
