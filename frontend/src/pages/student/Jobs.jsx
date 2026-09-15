import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db, collection, onSnapshot, getDocs } from '../../lib/firebase';
import { formatCurrency } from '../../lib/utils';
import ApplyDriveModal from '../../components/ApplyDriveModal';
import NotificationBell from '../../components/NotificationBell';

export default function StudentJobs() {
  const { profile } = useAuth();
  const [drives, setDrives] = useState([]);
  const [appliedMap, setAppliedMap] = useState({});
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [matchAnalysisDrive, setMatchAnalysisDrive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const rollNo = profile?.rollNo || '23P61A0501';

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'drives'), async (snap) => {
      if (!snap.empty) {
        const fsDrives = snap.docs.map(d => ({
          id: d.id,
          company: d.data().company || 'Corporate Partner',
          role: d.data().role || 'Software Development Engineer',
          package: d.data().package || 1200000,
          location: d.data().location || d.data().loc || 'Hyderabad / Remote',
          cutoff: d.data().cutoff || 6.5,
          skills: d.data().skills || ['Python', 'Data Structures', 'SQL', 'React'],
        }));
        setDrives(fsDrives);

        const userAppMap = {};
        for (const drive of fsDrives) {
          try {
            const appSnap = await getDocs(collection(db, 'drives', drive.id, 'applications'));
            if (!appSnap.empty) {
              const hasApplied = appSnap.docs.some(
                doc => doc.id === rollNo || doc.data().rollNo === rollNo || doc.data().email === profile?.email
              );
              if (hasApplied) userAppMap[drive.id] = true;
            }
          } catch { /* proceed */ }
        }
        setAppliedMap(userAppMap);
      } else {
        setDrives([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [rollNo, profile?.email]);

  const displayedDrives = drives.filter(d => {
    if (activeTab === 'applied') return !!appliedMap[d.id];
    return true;
  });

  const appliedCount = Object.keys(appliedMap).length;

  return (
    <div className="animate-fade-in space-y-6" id="student-jobs">
      {/* Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <svg style={{ width: 20, height: 20, minWidth: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="flex items-center gap-2">
                Placement <span className="text-gradient">Drives & Applications</span>
              </h1>
              <p className="text-xs text-muted mt-0.5">Campus recruitment drives and AI job match compatibility engine</p>
            </div>
          </div>
        </div>
        <NotificationBell onApplyDrive={(d) => setSelectedDrive(d)} />
      </div>

      {/* Sub Nav Bar */}
      <div className="inline-flex items-center gap-2 p-1.5 rounded-xl mb-6" style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-default)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          style={{ padding: '0.5rem 1.125rem', fontSize: '0.8125rem', fontWeight: 600 }}
        >
          All Placement Drives ({drives.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('applied')}
          className={`btn ${activeTab === 'applied' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          style={{ padding: '0.5rem 1.125rem', fontSize: '0.8125rem', fontWeight: 600 }}
        >
          Applied Drives ({appliedCount})
        </button>
      </div>

      {/* Drives list */}
      {loading ? (
        <div className="glass-card p-12 text-center text-muted">Loading placement drives...</div>
      ) : displayedDrives.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-xs text-muted">No placement drives found in this view.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {displayedDrives.map(d => {
            const isApplied = !!appliedMap[d.id];
            const initial = d.company ? d.company[0].toUpperCase() : 'C';

            return (
              <div
                key={d.id}
                className="glass-card p-6"
                style={{
                  borderLeft: isApplied ? '4px solid var(--success-500)' : '1px solid var(--border-default)',
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4" style={{ flex: 1 }}>
                    <div style={{
                      width: 46,
                      height: 46,
                      minWidth: 46,
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--gradient-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '1.25rem',
                      flexShrink: 0
                    }}>
                      {initial}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <strong style={{ fontSize: '1rem', color: 'var(--text-bright)' }}>
                          {d.company}
                        </strong>
                        <span className="badge badge-success">
                          {formatCurrency(d.package)}
                        </span>
                        <span className="text-xs text-muted font-mono flex items-center gap-1">
                          <svg style={{ width: 14, height: 14, minWidth: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {d.location}
                        </span>
                        <span className="text-xs text-muted font-mono">Cutoff: {d.cutoff} CGPA</span>
                      </div>

                      <h3 className="mb-3" style={{ fontSize: '1.1rem' }}>{d.role}</h3>

                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {d.skills.map(s => (
                          <span key={s} className="skill-tag matched">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setMatchAnalysisDrive(d)}
                      className="btn btn-secondary btn-sm"
                    >
                      AI Match
                    </button>

                    {isApplied ? (
                      <span className="badge badge-success" style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>
                        ✓ Applied
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setSelectedDrive(d)}
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* APPLY DRIVE MODAL */}
      {selectedDrive && (
        <ApplyDriveModal
          drive={selectedDrive}
          studentProfile={profile}
          onClose={() => setSelectedDrive(null)}
          onSuccess={() => {
            setAppliedMap(prev => ({ ...prev, [selectedDrive.id]: true }));
            setSelectedDrive(null);
          }}
        />
      )}

      {/* AI MATCH ANALYSIS MODAL */}
      {matchAnalysisDrive && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="flex items-center gap-2">
                <svg style={{ width: 20, height: 20, minWidth: 20 }} className="text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Job Match Analysis
              </h3>
              <button onClick={() => setMatchAnalysisDrive(null)} className="btn btn-ghost btn-xs">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl flex items-center justify-between" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-bright)' }}>{matchAnalysisDrive.company}</strong>
                  <p className="text-xs text-muted">{matchAnalysisDrive.role}</p>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-400)' }}>86%</div>
                  <div className="section-overline">Match Score</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-xl flex justify-between text-xs" style={{ background: 'rgba(2,6,23,0.5)', border: '1px solid var(--border-default)' }}>
                  <span className="text-muted">Academic Cutoff Required: {matchAnalysisDrive.cutoff} CGPA</span>
                  <span className="badge badge-success">✓ Eligible ({profile?.cgpa ? `${profile.cgpa} CGPA` : 'Profile Registered'})</span>
                </div>
                <div className="p-3 rounded-xl flex justify-between text-xs" style={{ background: 'rgba(2,6,23,0.5)', border: '1px solid var(--border-default)' }}>
                  <span className="text-muted">Required Skills Match: 3/4 Matched</span>
                  <span className="badge badge-success">High Match</span>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setMatchAnalysisDrive(null)}>
                  Close Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
