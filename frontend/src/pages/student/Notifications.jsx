import { useState, useEffect } from 'react';
import { db, collection, query, orderBy, onSnapshot } from '../../lib/firebase';

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setNotifications([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getTypeMeta = (type) => {
    switch (type) {
      case 'drive_alert':
        return {
          bg: 'bg-indigo-500/10',
          border: 'border-indigo-500/20',
          text: 'text-indigo-400',
          label: 'Placement Drive',
          icon: (
            <svg style={{ width: 20, height: 20, minWidth: 20 }} className="text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )
        };
      case 'reminder':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          text: 'text-amber-400',
          label: 'Reminder',
          icon: (
            <svg style={{ width: 20, height: 20, minWidth: 20 }} className="text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      case 'exam_alert':
        return {
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/20',
          text: 'text-rose-400',
          label: 'Exam Alert',
          icon: (
            <svg style={{ width: 20, height: 20, minWidth: 20 }} className="text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        };
      default:
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          text: 'text-emerald-400',
          label: 'Update',
          icon: (
            <svg style={{ width: 20, height: 20, minWidth: 20 }} className="text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          )
        };
    }
  };

  const filters = [
    { key: 'all', label: 'All Updates' },
    { key: 'drive_alert', label: 'Placement Drives' },
    { key: 'exam_alert', label: 'Assessment Alerts' },
    { key: 'reminder', label: 'Reminders' },
  ];

  const displayed = activeFilter === 'all'
    ? notifications
    : notifications.filter(n => n.type === activeFilter);

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="animate-fade-in space-y-6" id="student-notifications">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border-indigo-500/20">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                Notifications & <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Alerts</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Stay updated with placement schedules, exam alerts, and TPO announcements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800/80 w-fit">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === f.key
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {displayed.length} notification{displayed.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="glass-card p-12 text-center text-slate-400 text-sm">Loading notifications...</div>
      ) : displayed.length === 0 ? (
        <div className="glass-card p-12 text-center border-indigo-500/10">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
            <svg style={{ width: 24, height: 24, minWidth: 24 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-slate-300 font-medium text-sm">No Notifications Found</p>
          <p className="text-slate-400 text-xs mt-1">
            {activeFilter === 'all' ? 'No announcements posted by TPO yet.' : 'No notifications match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(n => {
            const meta = getTypeMeta(n.type);
            return (
              <div
                key={n.id}
                className="glass-card p-5 border-indigo-500/10 hover:border-indigo-500/30 transition-all flex items-start gap-4"
              >
                <div className={`w-10 h-10 rounded-xl ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0 mt-0.5`}>
                  {meta.icon}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-100">{n.title}</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${meta.bg} ${meta.text} border ${meta.border}`}>
                      {meta.label}
                    </span>
                  </div>

                  {n.company && (
                    <div className="text-xs font-semibold text-indigo-400">
                      {n.company} {n.role ? `— ${n.role}` : ''}
                    </div>
                  )}

                  <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                  <p className="text-[11px] text-slate-400 font-mono pt-1">{formatTime(n.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
