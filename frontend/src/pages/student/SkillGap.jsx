import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db, doc, updateDoc } from '../../lib/firebase';

export default function StudentSkillGap() {
  const { user, profile } = useAuth();
  const [skills, setSkills] = useState(['Python', 'Data Structures', 'SQL', 'React', 'HTML/CSS', 'Git']);
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.skills && Array.isArray(profile.skills)) {
      setSkills(profile.skills);
    } else if (profile?.acquiredSkills && Array.isArray(profile.acquiredSkills)) {
      setSkills(profile.acquiredSkills);
    }
  }, [profile]);

  const saveSkillsToFirestore = async (updatedSkills) => {
    setSkills(updatedSkills);
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        skills: updatedSkills,
        acquiredSkills: updatedSkills,
      });
    } catch (e) {
      console.warn('Skills update warning:', e);
    }
    setSaving(false);
  };

  const handleAddSkill = (e) => {
    if (e) e.preventDefault();
    if (!newSkill.trim()) return;
    const trimmed = newSkill.trim();
    if (skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setNewSkill('');
      return;
    }
    const updated = [...skills, trimmed];
    saveSkillsToFirestore(updated);
    setNewSkill('');
  };

  const addMissingSkillDirectly = (skillName) => {
    if (skills.some(s => s.toLowerCase() === skillName.toLowerCase())) return;
    const updated = [...skills, skillName];
    saveSkillsToFirestore(updated);
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updated = skills.filter(s => s !== skillToRemove);
    saveSkillsToFirestore(updated);
  };

  const roleTemplates = [
    { title: 'Full Stack Engineer', required: ['Python', 'React', 'HTML/CSS', 'SQL', 'Git', 'Node.js', 'TypeScript'] },
    { title: 'Data Analyst / ML Specialist', required: ['Python', 'SQL', 'Pandas & NumPy', 'PowerBI', 'Statistics'] },
    { title: 'Cloud & DevOps Specialist', required: ['Docker', 'AWS', 'Linux', 'Git', 'Python'] },
  ];

  return (
    <div className="animate-fade-in space-y-6" id="student-skill-gap">
      {/* Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <svg style={{ width: 20, height: 20, minWidth: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <div>
              <h1 className="flex items-center gap-2">
                Skill Gap <span className="text-gradient">Telemetry & Benchmarks</span>
              </h1>
              <p className="text-xs text-muted mt-0.5">Manage verified skills and benchmark competencies against industry targets</p>
            </div>
          </div>
        </div>
      </div>

      {/* Skill Manager Card */}
      <div className="glass-card mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="flex items-center gap-2">
              <svg style={{ width: 20, height: 20, minWidth: 20 }} className="text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Verified Technical Stack ({skills.length})
            </h3>
            <p className="text-xs text-muted mt-0.5">Click any skill to delete, or type to add new competencies</p>
          </div>
          {saving && <span className="text-xs text-indigo-400 font-mono">Syncing profile...</span>}
        </div>

        <form onSubmit={handleAddSkill} className="flex gap-2 max-w-md mb-6">
          <input
            className="input-field"
            placeholder="e.g. Docker, TypeScript, AWS, Java..."
            value={newSkill}
            onChange={e => setNewSkill(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            + Add Skill
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {skills.map(s => (
            <span
              key={s}
              className="skill-tag matched"
            >
              ✓ {s}
              <button
                type="button"
                onClick={() => handleRemoveSkill(s)}
                style={{ marginLeft: 6, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700 }}
                title="Remove skill"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Role Benchmarks Grid */}
      <div className="grid grid-3 gap-6">
        {roleTemplates.map(r => {
          const matchedSkills = r.required.filter(req =>
            skills.some(userSkill => userSkill.toLowerCase() === req.toLowerCase())
          );
          const missingSkills = r.required.filter(req =>
            !skills.some(userSkill => userSkill.toLowerCase() === req.toLowerCase())
          );
          const matchPct = Math.round((matchedSkills.length / r.required.length) * 100);

          return (
            <div key={r.title} className="glass-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <strong style={{ fontSize: '1rem', color: 'var(--text-bright)' }}>{r.title}</strong>
                  <span className={`badge ${matchPct >= 70 ? 'badge-success' : matchPct >= 50 ? 'badge-warning' : 'badge-error'}`}>
                    {matchPct}% Match
                  </span>
                </div>

                <div className="progress-bar mb-4">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${matchPct}%`,
                      background: matchPct >= 70 ? 'var(--gradient-success)' : matchPct >= 50 ? 'var(--warning-500)' : 'var(--error-500)',
                    }}
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="section-overline block mb-2">Acquired ({matchedSkills.length})</span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchedSkills.map(m => (
                        <span key={m} className="skill-tag matched">✓ {m}</span>
                      ))}
                    </div>
                  </div>

                  {missingSkills.length > 0 && (
                    <div>
                      <span className="section-overline block mb-2" style={{ color: 'var(--error-400)' }}>Target Gap ({missingSkills.length})</span>
                      <div className="flex flex-wrap gap-1.5">
                        {missingSkills.map(m => (
                          <span
                            key={m}
                            className="skill-tag missing cursor-pointer"
                            onClick={() => addMissingSkillDirectly(m)}
                            title="Click to add to your stack"
                          >
                            + {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
