import { useState, useEffect } from 'react';
import { db, collection, query, orderBy, onSnapshot, doc, updateDoc } from '../lib/firebase';
import { formatDate } from '../lib/utils';

export default function NotificationBell({ onApplyDrive }) {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setNotifications([]);
      } else {
        const notifs = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
        }));
        setNotifications(notifs);
      }
    }, (err) => {
      console.warn('Notifications subscribe warning:', err);
      setNotifications([]);
    });

    return () => unsub();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch {
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    }
  };

  const handleMarkAllAsRead = async () => {
    for (const n of notifications) {
      if (!n.read) {
        try {
          await updateDoc(doc(db, 'notifications', n.id), { read: true });
        } catch (err) {
          console.error('Failed to mark notification as read:', err);
        }
      }
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="btn btn-secondary btn-icon relative"
        style={{ width: 42, height: 42 }}
        onClick={() => setShowPanel(!showPanel)}
        title="Notifications & Drive Alerts"
      >
        <svg style={{ width: 20, height: 20, minWidth: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'var(--error-500)',
            color: '#fff',
            fontSize: '0.6875rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg-primary)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="glass-card" style={{
          position: 'absolute',
          right: 0,
          top: 50,
          width: 320,
          maxHeight: 400,
          overflowY: 'auto',
          zIndex: 999,
          padding: '1rem',
          boxShadow: 'var(--shadow-xl)'
        }}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <strong style={{ fontSize: '0.8125rem', color: 'var(--text-bright)' }}>Drive Alerts</strong>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-xs text-indigo-400"
                onClick={handleMarkAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">No notifications yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl flex flex-col gap-1 text-xs"
                  style={{
                    background: n.read ? 'rgba(15,23,42,0.4)' : 'rgba(99,102,241,0.1)',
                    border: n.read ? '1px solid var(--border-subtle)' : '1px solid rgba(99,102,241,0.3)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="badge badge-primary">
                      {n.type === 'reminder' ? 'Reminder' : 'Drive Alert'}
                    </span>
                    <span className="text-xs text-muted font-mono">{formatDate(n.createdAt)}</span>
                  </div>

                  <strong style={{ color: 'var(--text-bright)', fontSize: '0.8125rem' }}>{n.title}</strong>
                  <p className="text-xs text-muted leading-relaxed">{n.message}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    {!n.read ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-indigo-400"
                        onClick={() => handleMarkAsRead(n.id)}
                      >
                        Mark Read
                      </button>
                    ) : (
                      <span className="text-xs text-muted">Read</span>
                    )}

                    {onApplyDrive && (
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => {
                          setShowPanel(false);
                          onApplyDrive({
                            id: n.driveId || 'd1',
                            company: n.company || 'Corporate Partner',
                            role: n.role || 'Software Engineer',
                            package: n.package || 800000,
                          });
                        }}
                      >
                        View Drive
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
