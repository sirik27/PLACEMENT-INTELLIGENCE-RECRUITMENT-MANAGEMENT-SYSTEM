import { useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, firebaseConfig, collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from '../../lib/firebase';

export default function TPORecruiters() {
  const [recruiters, setRecruiters] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecruiter, setEditingRecruiter] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    company: '',
    contact: '',
    email: '',
    password: '',
    drives: 1,
    hired: 0,
    status: 'Active',
  });

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'recruiter'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const fsRecs = snap.docs.map(d => ({
          id: d.id,
          company: d.data().company || 'Corporate Partner',
          contact: d.data().name || d.data().contact || 'Recruiter',
          email: d.data().email,
          drives: d.data().drives || 1,
          hired: d.data().hired || 0,
          status: d.data().status || 'Active',
        }));
        setRecruiters(fsRecs);
      } else {
        setRecruiters([]);
      }
    }, (err) => {
      console.warn('Recruiters live query warning:', err);
    });

    return () => unsub();
  }, []);

  const filtered = recruiters.filter(r =>
    (r.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.contact || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateRecruiter = async (e) => {
    e.preventDefault();
    setLoading(true);

    const email = form.email.trim().toLowerCase();
    const password = form.password || 'recruit123';
    const recId = `r_${Date.now()}`;

    let uid = recId;

    try {
      const secAppName = `RecruiterProvision_${Date.now()}`;
      const secApp = initializeApp(firebaseConfig, secAppName);
      const secAuth = getAuth(secApp);

      try {
        const userCred = await createUserWithEmailAndPassword(secAuth, email, password);
        uid = userCred.user.uid;
      } catch (authErr) {
        console.warn('Auth account creation fallback:', authErr.message);
      } finally {
        await deleteApp(secApp);
      }

      const recDoc = {
        uid: uid,
        company: form.company,
        name: form.contact,
        contact: form.contact,
        email: email,
        password: password,
        role: 'recruiter',
        drives: parseInt(form.drives, 10) || 1,
        hired: parseInt(form.hired, 10) || 0,
        status: form.status,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', uid), recDoc);

      setShowAddModal(false);
      setForm({ company: '', contact: '', email: '', password: '', drives: 1, hired: 0, status: 'Active' });
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  const handleUpdateRecruiter = async (e) => {
    e.preventDefault();
    if (!editingRecruiter) return;

    const updated = {
      ...editingRecruiter,
      company: form.company,
      contact: form.contact,
      email: form.email,
      drives: parseInt(form.drives, 10) || 0,
      hired: parseInt(form.hired, 10) || 0,
      status: form.status,
    };

    try {
      await updateDoc(doc(db, 'users', editingRecruiter.id), {
        company: updated.company,
        name: updated.contact,
        contact: updated.contact,
        email: updated.email,
        drives: updated.drives,
        hired: updated.hired,
        status: updated.status,
      });
    } catch { /* proceed */ }

    setRecruiters(prev => prev.map(r => r.id === editingRecruiter.id ? updated : r));
    setEditingRecruiter(null);
  };

  const handleDeleteRecruiter = async (id, company) => {
    if (!window.confirm(`Are you sure you want to remove corporate partner "${company}"?`)) return;

    try {
      await deleteDoc(doc(db, 'users', id));
    } catch { /* proceed */ }

    setRecruiters(prev => prev.filter(r => r.id !== id));
  };

  const openEditModal = (r) => {
    setEditingRecruiter(r);
    setForm({
      company: r.company || '',
      contact: r.contact || '',
      email: r.email || '',
      password: '',
      drives: r.drives || 1,
      hired: r.hired || 0,
      status: r.status || 'Active',
    });
  };

  return (
    <div className="animate-fade-in space-y-6" id="tpo-recruiters">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="flex items-center gap-2">
            Recruiter <span className="text-gradient">Partners</span>
          </h1>
          <p className="text-xs text-muted mt-1">Corporate recruiter account provisioning and drive allocations</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setForm({ company: '', contact: '', email: '', password: '', drives: 1, hired: 0, status: 'Active' });
            setShowAddModal(true);
          }}
        >
          + Provision New Recruiter
        </button>
      </div>

      <div className="glass-card mb-6 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted">Recruiter Directory ({filtered.length})</span>
        <input
          className="input-field text-xs"
          style={{ maxWidth: 260 }}
          placeholder="Search company, contact..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted text-sm mb-4">No corporate recruiters provisioned yet.</p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setForm({ company: '', contact: '', email: '', password: '', drives: 1, hired: 0, status: 'Active' });
              setShowAddModal(true);
            }}
          >
            Provision Recruiter
          </button>
        </div>
      ) : (
        <div className="grid grid-3 gap-6">
          {filtered.map(r => (
            <div key={r.id} className="glass-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <strong style={{ fontSize: '1rem', color: 'var(--text-bright)' }}>{r.company}</strong>
                  <span className="badge badge-success">
                    {r.status}
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-200 mb-1">{r.contact}</p>
                <p className="text-xs text-muted font-mono">{r.email}</p>
              </div>

              <div className="p-3 rounded-xl flex items-center justify-between text-xs mt-4 mb-4" style={{ background: 'rgba(2,6,23,0.5)', border: '1px solid var(--border-default)' }}>
                <span className="text-muted">Drives: <strong className="text-slate-200">{r.drives}</strong></span>
                <span className="text-muted">Hired: <strong className="text-emerald-400">{r.hired}</strong></span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => openEditModal(r)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-xs"
                  style={{
                    background: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    color: '#fb7185',
                    padding: '0.375rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                  }}
                  onClick={() => handleDeleteRecruiter(r.id, r.company)}
                >
                  Remove Partner
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <h3 className="mb-4">Provision Recruiter Credentials</h3>
            <form onSubmit={handleCreateRecruiter} className="flex flex-col gap-3">
              <div className="input-group">
                <label>Company *</label>
                <input className="input-field" required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Contact Person *</label>
                <input className="input-field" required value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Email *</label>
                <input className="input-field" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Password *</label>
                <input className="input-field" type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Provisioning...' : 'Provision Recruiter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingRecruiter && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <h3 className="mb-4">Edit Recruiter</h3>
            <form onSubmit={handleUpdateRecruiter} className="flex flex-col gap-3">
              <div className="input-group">
                <label>Company Name</label>
                <input className="input-field" required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Contact Person</label>
                <input className="input-field" required value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input className="input-field" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="flex items-center justify-end gap-2 pt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingRecruiter(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
