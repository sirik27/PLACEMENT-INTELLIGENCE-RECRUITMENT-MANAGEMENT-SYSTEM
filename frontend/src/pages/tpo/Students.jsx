import { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from '../../lib/firebase';
import { createStudentsFromCSV } from '../../lib/api';

export default function TPOStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [csv, setCsv] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const [form, setForm] = useState({
    name: '',
    rollNo: '',
    email: '',
    branch: 'CSE',
    sec: 'A',
    cgpa: '8.00',
    status: 'Eligible',
    qualifiedForTechnical: false,
  });

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const fsStudents = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          branch: d.data().department || d.data().branch || 'CSE',
          sec: d.data().classSection || d.data().sec || 'A',
          ready: d.data().readinessScore ? `${Math.round(d.data().readinessScore * 100)}%` : '75%',
          cgpa: d.data().cgpa || 8.0,
          status: d.data().status || 'Eligible',
          qualifiedForTechnical: d.data().qualifiedForTechnical || false,
        }));
        setStudents(fsStudents);
      } else {
        setStudents([]);
      }
      setLoading(false);
    }, (e) => {
      console.warn('Real-time students listener warning:', e);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = students.filter(s =>
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.rollNo || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.branch || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.sec || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const newStudent = {
      id: `s_${Date.now()}`,
      rollNo: form.rollNo.toUpperCase(),
      name: form.name,
      email: form.email,
      branch: form.branch,
      sec: form.sec,
      cgpa: parseFloat(form.cgpa) || 8.0,
      ready: '75%',
      status: form.status,
      qualifiedForTechnical: form.qualifiedForTechnical,
      role: 'student',
    };

    try {
      await setDoc(doc(db, 'users', newStudent.id), newStudent);
    } catch { /* proceed */ }

    setStudents(prev => [newStudent, ...prev]);
    setShowAddModal(false);
    setForm({ name: '', rollNo: '', email: '', branch: 'CSE', sec: 'A', cgpa: '8.00', status: 'Eligible', qualifiedForTechnical: false });
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    const updated = {
      ...editingStudent,
      name: form.name,
      rollNo: form.rollNo.toUpperCase(),
      email: form.email,
      branch: form.branch,
      sec: form.sec,
      cgpa: parseFloat(form.cgpa) || 8.0,
      status: form.status,
      qualifiedForTechnical: form.qualifiedForTechnical,
    };

    try {
      await updateDoc(doc(db, 'users', editingStudent.id), {
        name: updated.name,
        rollNo: updated.rollNo,
        email: updated.email,
        department: updated.branch,
        classSection: updated.sec,
        cgpa: updated.cgpa,
        status: updated.status,
        qualifiedForTechnical: updated.qualifiedForTechnical,
      });
    } catch { /* proceed */ }

    setStudents(prev => prev.map(s => s.id === editingStudent.id ? updated : s));
    setEditingStudent(null);
  };

  const handleDeleteStudent = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove student "${name}"?`)) return;

    try {
      await deleteDoc(doc(db, 'users', id));
    } catch { /* proceed */ }

    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const toggleTechnicalPermission = async (student) => {
    const newQualStatus = !student.qualifiedForTechnical;
    const updated = { ...student, qualifiedForTechnical: newQualStatus };

    try {
      await updateDoc(doc(db, 'users', student.id), { qualifiedForTechnical: newQualStatus });
    } catch { /* proceed */ }

    setStudents(prev => prev.map(s => s.id === student.id ? updated : s));
  };

  const uploadCSV = async () => {
    if (!csv) return;
    setUploading(true);
    setMsg('');
    try {
      await createStudentsFromCSV(csv);
      setMsg('Cohort provisioned from CSV successfully');
    } catch (e) {
      setMsg(e.message);
    }
    setUploading(false);
  };

  const openEditModal = (s) => {
    setEditingStudent(s);
    setForm({
      name: s.name || '',
      rollNo: s.rollNo || '',
      email: s.email || '',
      branch: s.branch || 'CSE',
      sec: s.sec || 'A',
      cgpa: s.cgpa || 8.0,
      status: s.status || 'Eligible',
      qualifiedForTechnical: !!s.qualifiedForTechnical,
    });
  };

  return (
    <div className="animate-fade-in space-y-6" id="tpo-students">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="flex items-center gap-2">
            Student Cohort <span className="text-gradient">Management</span>
          </h1>
          <p className="text-xs text-muted mt-1">Cohort directory and Round 2 exam permissions</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => {
          setForm({ name: '', rollNo: '', email: '', branch: 'CSE', sec: 'A', cgpa: '8.00', status: 'Eligible', qualifiedForTechnical: false });
          setShowAddModal(true);
        }}>
          + Add New Student
        </button>
      </div>

      {/* Bulk Provision */}
      <div className="glass-card mb-6">
        <h3 className="mb-2">Bulk Provision Cohort (CSV)</h3>
        <p className="text-xs text-muted font-mono mb-3">Format: rollNo, name, branch, cgpa, email</p>
        <textarea
          className="input-field text-xs font-mono mb-3"
          rows={2}
          value={csv}
          onChange={e => setCsv(e.target.value)}
          placeholder="23P61A0501, Aarav Sharma, CSE, 8.92, 23p61a0501@vbithyd.ac.in"
        />
        <div className="flex items-center justify-between">
          <button className="btn btn-secondary btn-sm" onClick={uploadCSV} disabled={uploading || !csv}>
            {uploading ? 'Provisioning...' : 'Upload & Provision'}
          </button>
          {msg && <span className="text-xs font-semibold text-emerald-400">{msg}</span>}
        </div>
      </div>

      {/* Student Registry Table */}
      <div className="glass-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
          <div>
            <h3>Cohort Registry ({filtered.length})</h3>
            <p className="text-xs text-muted">Manage candidate permissions</p>
          </div>
          <input
            className="input-field text-xs"
            style={{ maxWidth: 260 }}
            placeholder="Search name, roll no, branch..."
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
                <th>Branch & Sec</th>
                <th>CGPA</th>
                <th>Status</th>
                <th>Technical Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                // Extract clean display name and clean email if concatenated
                const rawName = s.name || '';
                const emailMatch = rawName.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                const extractedEmail = emailMatch ? emailMatch[0] : null;
                const cleanName = rawName.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '').trim() || rawName || 'Student Candidate';
                const cleanEmail = s.email || extractedEmail || `${(s.rollNo || 'student').toLowerCase()}@vbithyd.ac.in`;

                return (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{s.rollNo}</td>
                    <td>
                      <strong style={{ display: 'block', color: 'var(--text-bright)', fontSize: '0.875rem' }}>{cleanName}</strong>
                      <span className="text-xs text-muted" style={{ fontFamily: 'var(--font-mono)' }}>{cleanEmail}</span>
                    </td>
                    <td>{s.branch} (Sec {s.sec})</td>
                    <td style={{ fontWeight: 700, color: 'var(--success-400)' }}>{s.cgpa}</td>
                    <td>
                      <span className="badge badge-primary">
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn ${s.qualifiedForTechnical ? 'btn-success' : 'btn-secondary'} btn-xs`}
                        onClick={() => toggleTechnicalPermission(s)}
                      >
                        {s.qualifiedForTechnical ? '✓ Qualified' : 'Grant Access'}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => openEditModal(s)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-xs"
                          onClick={() => handleDeleteStudent(s.id, s.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <h3 className="mb-4">Add Student Record</h3>
            <form onSubmit={handleAddStudent} className="flex flex-col gap-3">
              <div className="input-group">
                <label>Full Name *</label>
                <input className="input-field" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Roll Number *</label>
                <input className="input-field" required value={form.rollNo} onChange={e => setForm({ ...form, rollNo: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Email *</label>
                <input className="input-field" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="grid grid-3 gap-2">
                <div className="input-group">
                  <label>Branch</label>
                  <select className="input-field" value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })}>
                    <option value="CSE">CSE</option><option value="IT">IT</option><option value="ECE">ECE</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Section</label>
                  <select className="input-field" value={form.sec} onChange={e => setForm({ ...form, sec: e.target.value })}>
                    <option value="A">Sec A</option><option value="B">Sec B</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>CGPA</label>
                  <input className="input-field" type="number" step="0.01" min="0" max="10" required value={form.cgpa} onChange={e => setForm({ ...form, cgpa: e.target.value })} />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingStudent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <h3 className="mb-4">Edit Student Record</h3>
            <form onSubmit={handleUpdateStudent} className="flex flex-col gap-3">
              <div className="input-group">
                <label>Full Name *</label>
                <input className="input-field" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Roll Number *</label>
                <input className="input-field" required value={form.rollNo} onChange={e => setForm({ ...form, rollNo: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Email *</label>
                <input className="input-field" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="grid grid-3 gap-2">
                <div className="input-group">
                  <label>Branch</label>
                  <select className="input-field" value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })}>
                    <option value="CSE">CSE</option><option value="IT">IT</option><option value="ECE">ECE</option><option value="EEE">EEE</option><option value="ME">ME</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Section</label>
                  <select className="input-field" value={form.sec} onChange={e => setForm({ ...form, sec: e.target.value })}>
                    <option value="A">Sec A</option><option value="B">Sec B</option><option value="C">Sec C</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>CGPA</label>
                  <input className="input-field" type="number" step="0.01" min="0" max="10" required value={form.cgpa} onChange={e => setForm({ ...form, cgpa: e.target.value })} />
                </div>
              </div>

              <div className="input-group">
                <label>Placement Status</label>
                <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="Eligible">Eligible</option>
                  <option value="Placed">Placed</option>
                  <option value="Opted Out">Opted Out</option>
                  <option value="Blocked">Blocked (Disciplinary)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingStudent(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
