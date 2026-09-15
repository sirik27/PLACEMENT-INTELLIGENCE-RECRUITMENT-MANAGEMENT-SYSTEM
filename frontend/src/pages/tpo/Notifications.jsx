import { useState, useEffect } from 'react';
import { db, collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from '../../lib/firebase';
import { formatDate } from '../../lib/utils';

export default function TPONotifications() {
  const [notifications, setNotifications] = useState([]);
  const [form, setForm] = useState({
    title: '',
    company: '',
    role: '',
    package: '',
    message: '',
    type: 'drive_alert',
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setNotifications([]);
      }
    });

    return () => unsub();
  }, []);

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      const notifRef = await addDoc(collection(db, 'notifications'), {
        title: form.title,
        company: form.company,
        role: form.role,
        package: form.package,
        message: form.message,
        type: form.type,
        read: false,
        createdAt: serverTimestamp(),
      });

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
          skills: ['Python', 'SQL', 'Problem Solving'],
          notificationId: notifRef.id,
          createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, 'drives'), driveDoc);
      }

      setMsg('Broadcast alert sent live to all Student Portals');
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
      setMsg(err.message);
    }

    setLoading(false);
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm('Are you sure you want to retract this notification broadcast?')) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  return (
    <div className="animate-fade-in space-y-6" id="tpo-notifications">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="flex items-center gap-2">
            Drive <span className="text-gradient">Broadcasts & Alerts</span>
          </h1>
          <p className="text-xs text-muted mt-1">Broadcast real-time campus hiring alerts directly to Student Portals</p>
        </div>
      </div>

      <div className="grid grid-2 gap-6 items-start">
        {/* CREATE NOTIFICATION FORM */}
        <div className="glass-card">
          <h3 className="border-b border-slate-800 pb-3 mb-4">Broadcast Alert</h3>

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
              {loading ? 'Broadcasting...' : 'Broadcast Alert & Publish Drive'}
            </button>
          </form>
        </div>

        {/* FEED */}
        <div className="glass-card">
          <h3 className="border-b border-slate-800 pb-3 mb-4">
            Broadcast History ({notifications.length})
          </h3>
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
            {notifications.map(n => (
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
                  <span className="text-xs text-muted">Target: All Portals</span>
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
                    onClick={() => handleDeleteNotification(n.id)}
                  >
                    Retract Broadcast
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
