import { useState, useEffect } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from '../../lib/firebase';
import { formatDate, formatCurrency } from '../../lib/utils';

export default function TPONotifications() {
  const [notifications, setNotifications] = useState([]);
  const [drives, setDrives] = useState([]);
  const [activeTab, setActiveTab] = useState('drives'); // 'drives' | 'history'
  const [form, setForm] = useState({
    title: '',
    company: '',
    role: '',
    package: '',
    location: 'Hyderabad / Hybrid',
    cutoff: '6.5',
    message: '',
    type: 'drive_alert',
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // 1. Subscribe to notifications collection
  useEffect(() => {
    const qNotifs = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubNotifs = onSnapshot(qNotifs, (snap) => {
      if (!snap.empty) {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setNotifications([]);
      }
    }, err => console.warn('Notifs listener warn:', err));

    return () => unsubNotifs();
  }, []);

  // 2. Subscribe to drives collection
  useEffect(() => {
    const qDrives = query(collection(db, 'drives'), orderBy('createdAt', 'desc'));
    const unsubDrives = onSnapshot(qDrives, (snap) => {
      if (!snap.empty) {
        setDrives(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setDrives([]);
      }
    }, err => console.warn('Drives listener warn:', err));

    return () => unsubDrives();
  }, []);

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      let createdDriveId = null;

      if (form.type === 'drive_alert') {
        const numericPkg = parseInt(form.package.replace(/[^0-9]/g, ''), 10) || 800000;
        const driveDoc = {
          company: form.company,
          role: form.role,
          package: numericPkg > 100 ? numericPkg : numericPkg * 100000,
          packageStr: form.package,
          location: form.location || 'Hyderabad / Hybrid',
          cutoff: parseFloat(form.cutoff) || 6.5,
          status: 'active',
          applicantCount: 0,
          skills: ['Problem Solving', 'Data Structures', 'SQL'],
          createdAt: serverTimestamp(),
        };
        const driveRef = await addDoc(collection(db, 'drives'), driveDoc);
        createdDriveId = driveRef.id;
      }

      await addDoc(collection(db, 'notifications'), {
        title: form.title,
        company: form.company,
        role: form.role,
        package: form.package,
        message: form.message,
        type: form.type,
        driveId: createdDriveId,
        read: false,
        createdAt: serverTimestamp(),
      });

      setMsg('Broadcast alert and placement drive published successfully to all Student Portals!');
      setForm({
        title: '',
        company: '',
        role: '',
        package: '',
        location: 'Hyderabad / Hybrid',
        cutoff: '6.5',
        message: '',
        type: 'drive_alert',
      });
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    }

    setLoading(false);
  };

  // Delete Drive from drives collection AND associated notifications
  const handleDeleteDrive = async (driveId, companyName) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY REMOVE the placement drive for "${companyName}"? This will remove it from all candidate portals.`)) return;

    try {
      // 1. Delete drive document from drives collection
      if (driveId) {
        await deleteDoc(doc(db, 'drives', driveId));
      }

      // 2. Delete linked notifications from notifications collection
      if (companyName) {
        const qN = query(collection(db, 'notifications'), where('company', '==', companyName));
        const nSnap = await getDocs(qN);
        for (const nDoc of nSnap.docs) {
          await deleteDoc(doc(db, 'notifications', nDoc.id));
        }
      }
    } catch (err) {
      console.error('Failed to delete drive:', err);
      alert(`Error deleting drive: ${err.message}`);
    }
  };

  // Delete Notification from notifications collection AND associated drive
  const handleDeleteNotification = async (n) => {
    if (!window.confirm(`Are you sure you want to retract the broadcast "${n.title}"? This will also remove the drive from all Student Portals.`)) return;
    try {
      if (n.id) {
        await deleteDoc(doc(db, 'notifications', n.id));
      }

      if (n.driveId) {
        await deleteDoc(doc(db, 'drives', n.driveId));
      } else if (n.company) {
        const qD = query(collection(db, 'drives'), where('company', '==', n.company));
        const dSnap = await getDocs(qD);
        for (const dDoc of dSnap.docs) {
          await deleteDoc(doc(db, 'drives', dDoc.id));
        }
      }
    } catch (err) {
      console.error('Failed to retract notification:', err);
    }
  };

  return (
    <div className="animate-fade-in space-y-6" id="tpo-notifications">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="flex items-center gap-2">
            Drive <span className="text-gradient">Broadcasts & Active Drives</span>
          </h1>
          <p className="text-xs text-muted mt-1">Broadcast hiring alerts and manage active placement drives with real-time database sync</p>
        </div>
      </div>

      <div className="grid grid-2 gap-6 items-start">
        {/* CREATE DRIVE / NOTIFICATION FORM */}
        <div className="glass-card">
          <h3 className="border-b border-slate-800 pb-3 mb-4">Broadcast Alert & Publish Drive</h3>

          {msg && <div className="alert alert-success mb-4">{msg}</div>}

          <form onSubmit={handleCreateNotification} className="flex flex-col gap-3">
            <div className="input-group">
              <label>Notification Type</label>
              <select
                className="input-field"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
              >
                <option value="drive_alert">New Placement Drive Announcement</option>
                <option value="reminder">Drive Deadline Reminder</option>
              </select>
            </div>

            <div className="input-group">
              <label>Title *</label>
              <input
                className="input-field"
                required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. New Drive: Infosys Specialist Programmer"
              />
            </div>

            <div className="input-group">
              <label>Company Name *</label>
              <input
                className="input-field"
                required
                value={form.company}
                onChange={e => setForm({ ...form, company: e.target.value })}
                placeholder="e.g. Infosys Limited"
              />
            </div>

            <div className="input-group">
              <label>Role *</label>
              <input
                className="input-field"
                required
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                placeholder="e.g. Specialist Programmer"
              />
            </div>

            <div className="grid grid-3 gap-2">
              <div className="input-group">
                <label>Package *</label>
                <input
                  className="input-field"
                  required
                  value={form.package}
                  onChange={e => setForm({ ...form, package: e.target.value })}
                  placeholder="e.g. 9.5 LPA"
                />
              </div>

              <div className="input-group">
                <label>Location</label>
                <input
                  className="input-field"
                  value={form.location || 'Hyderabad / Hybrid'}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Cutoff CGPA</label>
                <input
                  className="input-field"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={form.cutoff || '6.5'}
                  onChange={e => setForm({ ...form, cutoff: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Message *</label>
              <textarea
                className="input-field"
                rows={3}
                required
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Application instructions..."
              />
            </div>

            <button type="submit" className="btn btn-primary mt-2" disabled={loading}>
              {loading ? 'Publishing to Database...' : 'Broadcast Alert & Publish Drive'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: TABS FOR ACTIVE DRIVES & BROADCAST HISTORY */}
        <div className="glass-card">
          {/* Sub Nav Bar */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('drives')}
              className={`btn ${activeTab === 'drives' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            >
              Active Placement Drives ({drives.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            >
              Broadcast History ({notifications.length})
            </button>
          </div>

          {/* ACTIVE DRIVES TAB */}
          {activeTab === 'drives' && (
            <div className="flex flex-col gap-3 max-h-[550px] overflow-y-auto">
              {drives.length === 0 ? (
                <div className="text-center p-8 text-muted">
                  No active placement drives found in Cloud Firestore.
                </div>
              ) : (
                drives.map(d => (
                  <div
                    key={d.id}
                    className="p-4 rounded-xl flex flex-col gap-2"
                    style={{ background: 'rgba(2,6,23,0.5)', border: '1px solid var(--border-default)' }}
                  >
                    <div className="flex items-center justify-between">
                      <strong style={{ fontSize: '1rem', color: 'var(--text-bright)' }}>{d.company}</strong>
                      <span className="badge badge-success">
                        {d.packageStr || formatCurrency(d.package)}
                      </span>
                    </div>

                    <div className="text-xs text-muted">
                      Role: <strong className="text-slate-200">{d.role}</strong> · Location: {d.location} · Cutoff: {d.cutoff} CGPA
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <span className="text-xs text-muted font-mono">Status: LIVE ACTIVE</span>
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        style={{
                          background: 'rgba(244, 63, 94, 0.15)',
                          border: '1px solid rgba(244, 63, 94, 0.4)',
                          color: '#fb7185',
                          padding: '0.4rem 0.875rem',
                          borderRadius: 'var(--radius-md)',
                          fontWeight: 700,
                        }}
                        onClick={() => handleDeleteDrive(d.id, d.company)}
                      >
                        🗑 Delete Drive (Remove from All Portals)
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* BROADCAST HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-3 max-h-[550px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center p-8 text-muted">No broadcast alerts found.</div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className="p-4 rounded-xl flex flex-col gap-2"
                    style={{ background: 'rgba(2,6,23,0.5)', border: '1px solid var(--border-default)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="badge badge-primary">
                        {n.type === 'reminder' ? 'Reminder' : 'Drive Alert'}
                      </span>
                      <span className="text-xs text-muted font-mono">{formatDate(n.createdAt)}</span>
                    </div>

                    <strong style={{ fontSize: '0.9375rem', color: 'var(--text-bright)' }}>{n.title}</strong>
                    <p className="text-xs text-muted">{n.message}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <span className="text-xs text-muted">Target: All Student Portals</span>
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        style={{
                          background: 'rgba(244, 63, 94, 0.15)',
                          border: '1px solid rgba(244, 63, 94, 0.4)',
                          color: '#fb7185',
                          padding: '0.4rem 0.875rem',
                          borderRadius: 'var(--radius-md)',
                          fontWeight: 700,
                        }}
                        onClick={() => handleDeleteNotification(n)}
                      >
                        Retract Broadcast & Delete Drive
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

