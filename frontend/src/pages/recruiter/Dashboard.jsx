import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../lib/utils';
import { db, collection, query, where, getDocs, onSnapshot } from '../../lib/firebase';

export default function RecruiterDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ registered: 0, applied: 0, cleared: 0, offers: 0 });
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  const companyName = profile?.companyName || profile?.company || 'Corporate Partner';

  useEffect(() => {
    const unsubDrives = onSnapshot(collection(db, 'drives'), async (snap) => {
      if (!snap.empty) {
        const allDrives = [];
        let totalRegistered = 0;
        let totalApplied = 0;
        let totalCleared = 0;
        let totalOffers = 0;

        for (const dDoc of snap.docs) {
          const data = dDoc.data();
          allDrives.push({
            id: dDoc.id,
            company: data.company || 'Company',
            role: data.role || 'Role',
            package: data.package || 0,
          });

          try {
            const appSnap = await getDocs(collection(db, 'drives', dDoc.id, 'applications'));
            const count = appSnap.docs.length;
            totalRegistered += count;
            totalApplied += count;

            appSnap.docs.forEach(ad => {
              const s = (ad.data().status || '').toLowerCase();
              if (s.includes('cleared') || s.includes('pass')) totalCleared++;
              if (s.includes('selected') || s.includes('offer')) totalOffers++;
            });
          } catch { /* continue */ }
        }

        setDrives(allDrives);
        setStats({ registered: totalRegistered, applied: totalApplied, cleared: totalCleared, offers: totalOffers });
      } else {
        setDrives([]);
      }
      setLoading(false);
    });

    return () => unsubDrives();
  }, []);

  const statCards = [
    {
      label: 'Registered Students',
      value: stats.registered,
      color: 'var(--primary-400)',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      label: 'Total Applications',
      value: stats.applied,
      color: 'var(--accent-400)',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      label: 'Exam Cleared',
      value: stats.cleared,
      color: 'var(--warning-400)',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Offers Extended',
      value: stats.offers,
      color: 'var(--success-400)',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  const quickActions = [
    { to: '/recruiter/exams', title: 'Exam Control', desc: 'Configure and publish live proctored screening exams', color: 'var(--primary-500)', bg: 'rgba(99, 102, 241, 0.08)' },
    { to: '/recruiter/exam-results', title: 'Results & Export', desc: 'Review student exam scores and export CSV/PDF reports', color: 'var(--success-500)', bg: 'rgba(16, 185, 129, 0.08)' },
    { to: '/recruiter/interviews', title: 'Schedule Interviews', desc: 'Schedule AI-proctored 1-on-1 video interview rooms', color: 'var(--warning-500)', bg: 'rgba(245, 158, 11, 0.08)' },
  ];

  return (
    <div className="animate-fade-in" id="recruiter-dashboard">
      <div className="page-header">
        <h1>Recruiter <span className="text-gradient">Control Center</span></h1>
        <p>{companyName} · Talent Acquisition & Hiring Pipeline</p>
      </div>

      {/* Stats */}
      <div className="grid grid-4 stagger-children mb-8">
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>
              {s.icon}
            </div>
            <div className="stat-value" style={{ color: s.color, fontSize: '1.75rem' }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass-card mb-8">
        <h3 className="mb-4">Quick Actions</h3>
        <div className="grid grid-3 gap-4">
          {quickActions.map(a => (
            <Link key={a.to} to={a.to} className="quick-action" style={{ background: a.bg, borderColor: `${a.color}33` }}>
              <div className="flex items-center gap-3 mb-2">
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: `${a.color}20`, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <strong style={{ fontSize: '0.9375rem' }}>{a.title}</strong>
              </div>
              <p className="text-xs text-muted">{a.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Active Drives Overview */}
      <div className="glass-card">
        <h3 className="mb-4">Active Drives Pipeline</h3>
        {loading ? (
          <div className="text-center p-6 text-muted">Loading drive data...</div>
        ) : drives.length === 0 ? (
          <div className="text-center p-6 text-muted">No active placement drives in the database.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {drives.map(d => (
              <div key={d.id} className="activity-item" style={{ border: '1px solid var(--border-default)' }}>
                <div className="activity-dot" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--primary-400)', borderColor: 'transparent' }}>
                  {d.company.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{d.company}</div>
                  <div className="text-sm text-muted">{d.role}</div>
                </div>
                <span className="badge badge-success">{formatCurrency(d.package)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
