import { useState, useEffect } from 'react';
import { db, collection, getDocs, doc, updateDoc, onSnapshot } from '../../lib/firebase';
import { formatCurrency, formatDate } from '../../lib/utils';

export default function TPOAppliedStudents() {
  const [drives, setDrives] = useState([]);
  const [selectedDriveId, setSelectedDriveId] = useState(null);
  const [applications, setApplications] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'drives'), async (snap) => {
      let fsDrives = [];
      if (!snap.empty) {
        fsDrives = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      setDrives(fsDrives);
      if (!selectedDriveId && fsDrives.length > 0) {
        setSelectedDriveId(fsDrives[0].id);
      }

      const appMap = {};
      for (const d of fsDrives) {
        try {
          const appSnap = await getDocs(collection(db, 'drives', d.id, 'applications'));
          if (!appSnap.empty) {
            appMap[d.id] = appSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          } else {
            appMap[d.id] = [];
          }
        } catch {
          appMap[d.id] = [];
        }
      }

      setApplications(appMap);
    });

    return () => unsub();
  }, []);

  const activeDrive = drives.find(d => d.id === selectedDriveId) || drives[0];
  const currentApplicants = applications[activeDrive?.id] || [];

  const filteredApplicants = currentApplicants.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.rollNo || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.branch || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleTechnicalRound = async (candidate) => {
    const nextStatus = !candidate.qualifiedForTechnical;
    const updated = { ...candidate, qualifiedForTechnical: nextStatus };

    try {
      if (candidate.uid) {
        await updateDoc(doc(db, 'users', candidate.uid), { qualifiedForTechnical: nextStatus });
      }
    } catch { /* proceed */ }

    setApplications(prev => ({
      ...prev,
      [activeDrive.id]: (prev[activeDrive.id] || []).map(item => item.rollNo === candidate.rollNo ? updated : item)
    }));
  };

  return (
    <div className="animate-fade-in space-y-6" id="tpo-applied-students">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="flex items-center gap-2">
            Drive <span className="text-gradient">Applied Candidates</span>
          </h1>
          <p className="text-xs text-muted mt-1">Review applicant submissions and grant technical round permissions</p>
        </div>
      </div>

      {drives.length >= 2 && (
        <div className="flex gap-4 overflow-x-auto pb-2 mb-6">
          {drives.map(d => {
            const count = (applications[d.id] || []).length || 0;
            const isActive = selectedDriveId === d.id;

            return (
              <div
                key={d.id}
                onClick={() => setSelectedDriveId(d.id)}
                className="glass-card cursor-pointer"
                style={{
                  minWidth: 220,
                  padding: '1rem',
                  borderColor: isActive ? 'var(--primary-500)' : 'var(--border-default)',
                  background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-card)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <strong style={{ fontSize: '0.9375rem' }}>{d.company}</strong>
                  <span className="badge badge-primary">{count} Applied</span>
                </div>
                <p className="text-xs text-muted">{d.role}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Registry Table */}
      <div className="glass-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
          <div>
            <h3>Candidate Applications ({filteredApplicants.length})</h3>
            <p className="text-xs text-muted">Target drive: {activeDrive?.company || 'Selected Drive'}</p>
          </div>

          <input
            className="input-field text-xs"
            style={{ maxWidth: 260 }}
            placeholder="Search candidate, roll no..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Candidate</th>
                <th>Branch</th>
                <th>CGPA</th>
                <th>Applied Date</th>
                <th>Technical Access</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplicants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-6 text-muted">
                    No candidates registered for this drive yet.
                  </td>
                </tr>
              ) : (
                filteredApplicants.map(c => (
                  <tr key={c.id || c.rollNo}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{c.rollNo}</td>
                    <td>
                      <strong style={{ display: 'block', color: 'var(--text-bright)' }}>{c.name}</strong>
                      <span className="text-xs text-muted" style={{ fontFamily: 'var(--font-mono)' }}>{c.email}</span>
                    </td>
                    <td>{c.branch}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success-400)' }}>{c.cgpa}</td>
                    <td className="text-xs text-muted">{formatDate(c.appliedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className={`btn ${c.qualifiedForTechnical ? 'btn-success' : 'btn-secondary'} btn-xs`}
                        onClick={() => toggleTechnicalRound(c)}
                      >
                        {c.qualifiedForTechnical ? '✓ Qualified' : 'Grant Access'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
