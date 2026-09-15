import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

export default function StudentReadiness() {
  const { profile } = useAuth();

  const rawCgpa = profile?.cgpa || 8.42;
  const cgpaScore = rawCgpa > 0 ? Math.min(100, Math.round((rawCgpa / 10) * 100)) : 84;
  
  const aptScore = profile?.aptitudeScore || (profile?.aptitudePassed ? 85 : 78);
  const codingScore = profile?.codingScore || profile?.technicalScore || (profile?.qualifiedForTechnical ? 88 : 82);
  
  const studentSkills = profile?.skills || profile?.acquiredSkills || ['Data Structures', 'Python', 'React', 'SQL'];
  const domainScore = Math.min(100, Math.round((studentSkills.length / 6) * 100)) || 80;

  const readiness = Math.round(
    (cgpaScore * 0.30) + (aptScore * 0.25) + (codingScore * 0.25) + (domainScore * 0.20)
  );

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (readiness / 100) * circumference;

  const components = [
    {
      name: 'CGPA Telemetry',
      score: cgpaScore,
      weight: '30%',
      subtitle: `${rawCgpa} / 10.0 CGPA`,
      color: '#818cf8',
      icon: (
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      )
    },
    {
      name: 'Aptitude Assessment',
      score: aptScore,
      weight: '25%',
      subtitle: `${aptScore}% Proctored Score`,
      color: '#38bdf8',
      icon: (
        <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      )
    },
    {
      name: 'Coding Proficiency',
      score: codingScore,
      weight: '25%',
      subtitle: `${codingScore}% Technical Score`,
      color: '#fbbf24',
      icon: (
        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    },
    {
      name: 'Domain Skill Match',
      score: domainScore,
      weight: '20%',
      subtitle: `${studentSkills.length} Verified Skills`,
      color: '#34d399',
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    },
  ];

  return (
    <div className="animate-fade-in space-y-6" id="student-readiness">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border-indigo-500/20">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                Placement <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Readiness Index</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Weighted telemetry formula: CGPA (30%) + Aptitude (25%) + Technical (25%) + Skills (20%)</p>
            </div>
          </div>
        </div>
        <Link to="/student/settings" className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          Update Academic Profile
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SVG Animated Donut */}
        <div className="glass-card p-6 text-center relative overflow-hidden flex flex-col justify-center items-center border-indigo-500/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-base font-bold text-slate-100 mb-6">Overall Placement Readiness Score</h3>
          
          <div className="relative w-52 h-52 flex items-center justify-center mb-6">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r={radius}
                className="text-slate-800/80"
                strokeWidth="14"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="100"
                cy="100"
                r={radius}
                className="text-indigo-500 transition-all duration-1000 ease-out"
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                stroke="url(#gradient-readiness)"
                fill="transparent"
              />
              <defs>
                <linearGradient id="gradient-readiness" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {readiness}%
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">READINESS</span>
            </div>
          </div>

          <span className={`text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full inline-flex items-center gap-2 ${
            readiness >= 75
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${readiness >= 75 ? 'bg-emerald-400' : 'bg-indigo-400'} animate-pulse`}></span>
            {readiness >= 75 ? 'TIER-1 PRODUCT COMPANY ELIGIBLE' : 'TIER-2 & SERVICE COMPANY ELIGIBLE'}
          </span>
        </div>

        {/* Telemetry Component List */}
        <div className="glass-card p-6 border-indigo-500/10">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            Telemetry Breakdown
          </h3>
          <div className="space-y-3">
            {components.map(c => (
              <div key={c.name} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-slate-700 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
                    {c.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{c.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Weight: {c.weight} · {c.subtitle}</p>
                  </div>
                </div>
                <div className="text-base font-bold" style={{ color: c.color }}>
                  {c.score}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
