import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db, doc, updateDoc } from '../../lib/firebase';

export default function StudentSettings() {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [semesters, setSemesters] = useState({
    sem1: '8.20',
    sem2: '8.40',
    sem3: '8.50',
    sem4: '8.30',
    sem5: '8.60',
    sem6: '8.55',
    sem7: '8.70',
    sem8: '8.80',
  });

  const [profileForm, setProfileForm] = useState({
    name: '',
    department: 'CSE',
    classSection: 'Section A',
    rollNo: '',
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || '',
        department: profile.department || 'CSE',
        classSection: profile.classSection || 'Section A',
        rollNo: profile.rollNo || '',
      });

      if (profile.semesters) {
        setSemesters(profile.semesters);
      }
    }
  }, [profile]);

  const completedSemEntries = Object.entries(semesters).filter(([_, val]) => val !== '' && val !== null && !isNaN(parseFloat(val)));
  const completedCount = completedSemEntries.length;
  const semSum = completedSemEntries.reduce((sum, [_, val]) => sum + parseFloat(val), 0);
  const overallCgpa = completedCount > 0 ? (semSum / completedCount).toFixed(2) : '0.00';

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMsg('');

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: profileForm.name,
        department: profileForm.department,
        classSection: profileForm.classSection,
        rollNo: profileForm.rollNo.toUpperCase(),
        cgpa: parseFloat(overallCgpa),
        semesters: semesters,
      });

      setMsg('Semester GPAs & Profile updated successfully!');
    } catch (err) {
      setMsg(`Save failed: ${err.message}`);
    }

    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-6" id="student-settings">
      {/* Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <svg style={{ width: 20, height: 20, minWidth: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
            </div>
            <div>
              <h1 className="flex items-center gap-2">
                Student <span className="text-gradient">Settings & Profile</span>
              </h1>
              <p className="text-xs text-muted mt-0.5">Manage semester GPAs, academic metrics, and profile details</p>
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <div className="alert alert-success mb-6">
          {msg}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
        {/* Semester GPAs Card */}
        <div className="glass-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="flex items-center gap-2">
                <svg style={{ width: 20, height: 20, minWidth: 20 }} className="text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
                Semester Grade Point Averages (GPA)
              </h3>
              <p className="text-xs text-muted mt-0.5">Update your Grade Point Average per semester to automatically compute overall CGPA</p>
            </div>

            <div className="p-3 rounded-xl flex flex-col items-end" style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <span className="section-overline block mb-1">CGPA ({completedCount} Semesters)</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--primary-300)' }}>{overallCgpa} / 10.0</strong>
            </div>
          </div>

          <div className="grid grid-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sNum => (
              <div key={sNum} className="input-group">
                <label>Sem {sNum} GPA</label>
                <input
                  className="input-field font-mono"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={semesters[`sem${sNum}`] || ''}
                  onChange={e => setSemesters({ ...semesters, [`sem${sNum}`]: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Profile Information Card */}
        <div className="glass-card">
          <h3 className="border-b border-slate-800 pb-4 mb-4 flex items-center gap-2">
            <svg style={{ width: 20, height: 20, minWidth: 20 }} className="text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Personal & Academic Information
          </h3>

          <div className="grid grid-2 gap-4 mb-6">
            <div className="input-group">
              <label>Full Candidate Name *</label>
              <input
                className="input-field"
                required
                value={profileForm.name}
                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label>Roll Number *</label>
              <input
                className="input-field font-mono"
                required
                value={profileForm.rollNo}
                onChange={e => setProfileForm({ ...profileForm, rollNo: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label>Department / Branch *</label>
              <select
                className="input-field"
                value={profileForm.department}
                onChange={e => setProfileForm({ ...profileForm, department: e.target.value })}
              >
                <option value="CSE">CSE (Computer Science)</option>
                <option value="IT">IT (Information Technology)</option>
                <option value="ECE">ECE (Electronics & Comm)</option>
                <option value="EEE">EEE (Electrical & Electronics)</option>
                <option value="DS">DS (Data Science)</option>
                <option value="AIML">AIML (AI & Machine Learning)</option>
                <option value="MECH">MECH (Mechanical)</option>
              </select>
            </div>

            <div className="input-group">
              <label>Class Section *</label>
              <select
                className="input-field"
                value={profileForm.classSection}
                onChange={e => setProfileForm({ ...profileForm, classSection: e.target.value })}
              >
                <option value="Section A">Section A</option>
                <option value="Section B">Section B</option>
                <option value="Section C">Section C</option>
                <option value="Section D">Section D</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-slate-800">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving Settings...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
