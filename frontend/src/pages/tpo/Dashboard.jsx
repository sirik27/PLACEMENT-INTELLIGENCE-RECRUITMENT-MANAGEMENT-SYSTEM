import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/utils';
import { db, collection, query, where, onSnapshot, addDoc, serverTimestamp } from '../../lib/firebase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function TPODashboard() {
  const [stats, setStats] = useState({ total: 0, placed: 0, rate: 0, drives: 0, topPkg: 0 });
  const [departmentBreakdown, setDepartmentBreakdown] = useState([]);
  const [drives, setDrives] = useState([]);
  const [selectedDept, setSelectedDept] = useState('All');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [notifForm, setNotifForm] = useState({
    title: 'New Drive Announced',
    company: '',
    role: '',
    package: '',
    message: 'Application window is now open for eligible students.',
    type: 'drive_alert',
  });
  const [broadcastMsg, setBroadcastMsg] = useState('');

  useEffect(() => {
    const qStudents = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      const allStudents = snap.docs.map(d => d.data());
      const totalCount = allStudents.length;
      const placedStudents = allStudents.filter(s => (s.status || '').toLowerCase().includes('placed') || (s.status || '').toLowerCase().includes('selected'));
      const placedCount = placedStudents.length;
      const ratePct = totalCount > 0 ? Math.round((placedCount / totalCount) * 100) : 0;
      setStats(prev => ({ ...prev, total: totalCount, placed: placedCount, rate: ratePct }));

      const deptMap = {};
      allStudents.forEach(s => {
        const dept = s.department || s.branch || 'CSE';
        if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, placed: 0 };
        deptMap[dept].total += 1;
        if ((s.status || '').toLowerCase().includes('placed') || (s.status || '').toLowerCase().includes('selected')) {
          deptMap[dept].placed += 1;
        }
      });
      const deptsArray = Object.values(deptMap).map(d => ({
        name: d.name,
        placed: `${d.placed}/${d.total}`,
        pct: d.total > 0 ? Math.round((d.placed / d.total) * 100) : 0,
      }));
      setDepartmentBreakdown(deptsArray);
    });
    return () => unsubStudents();
  }, []);

  useEffect(() => {
    const unsubDrives = onSnapshot(collection(db, 'drives'), (snap) => {
      const activeDrivesCount = snap.docs.length;
      if (!snap.empty) {
        const fsDrives = snap.docs.map(d => ({
          id: d.id,
          company: d.data().company || 'Company Partner',
          role: d.data().role || 'Job Role',
          package: d.data().package || 0,
          totalApplied: d.data().applicantCount || d.data().totalApplied || 0,
          deptApplied: d.data().deptApplied || {},
        }));
        setDrives(fsDrives);
        const highestPkg = Math.max(...fsDrives.map(d => typeof d.package === 'number' ? d.package : 0), 0);
        setStats(prev => ({ ...prev, drives: activeDrivesCount, topPkg: highestPkg }));
      } else {
        setDrives([]);
        setStats(prev => ({ ...prev, drives: 0, topPkg: 0 }));
      }
    });
    return () => unsubDrives();
  }, []);

  const handleBroadcastNotification = async (e) => {
    e.preventDefault();
    try {
      let createdDriveId = null;

      if (notifForm.type === 'drive_alert' && notifForm.company) {
        const numericPkg = parseInt((notifForm.package || '800000').replace(/[^0-9]/g, ''), 10) || 800000;
        const driveDoc = {
          company: notifForm.company,
          role: notifForm.role || 'Job Role',
          package: numericPkg > 100 ? numericPkg : numericPkg * 100000,
          packageStr: notifForm.package || '8 LPA',
          location: 'Hyderabad / Hybrid',
          cutoff: 6.5,
          status: 'active',
          applicantCount: 0,
          skills: ['Problem Solving', 'Data Structures', 'SQL'],
          createdAt: serverTimestamp(),
        };
        const driveRef = await addDoc(collection(db, 'drives'), driveDoc);
        createdDriveId = driveRef.id;
      }

      await addDoc(collection(db, 'notifications'), {
        title: notifForm.title,
        company: notifForm.company,
        role: notifForm.role,
        package: notifForm.package,
        message: notifForm.message,
        type: notifForm.type,
        driveId: createdDriveId,
        read: false,
        createdAt: serverTimestamp(),
      });
      setBroadcastMsg('Broadcast alert sent successfully to all Student Portals.');
      setTimeout(() => { setShowBroadcastModal(false); setBroadcastMsg(''); }, 1200);
    } catch (err) {
      setBroadcastMsg(`Broadcast failed: ${err.message}`);
    }
  };

  const departmentsList = ['CSE', 'IT', 'ECE', 'EEE', 'DS', 'MECH'];
  const comparativeChartData = departmentsList.map(dept => {
    const entry = { department: dept };
    drives.forEach(d => { entry[d.company] = d.deptApplied?.[dept] || 0; });
    return entry;
  });

  const statCards = [
    {
      label: 'Total Students',
      value: stats.total,
      color: 'var(--primary-400)',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      label: 'Placement Rate',
      value: `${stats.rate}%`,
      color: 'var(--success-400)',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      label: 'Active Drives',
      value: stats.drives,
      color: 'var(--accent-400)',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 1321 13.255A2.375 2.375 0 0019 11.115V6.75A2.75 2.75 0 0016.25 4h-8.5A2.75 2.75 0 005 6.75v4.365A2.375 2.375 0 003 13.255V19a2 2 0 002 2h14a2 2 0 002-2v-5.745z" />
        </svg>
      )
    },
    {
      label: 'Highest Package',
      value: formatCurrency(stats.topPkg),
      color: 'var(--warning-400)',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  const quickActions = [
    { to: '/tpo/exams', title: 'Live Exam Control', desc: 'Set questions, duration & publish live proctored exams', color: 'var(--primary-500)', bg: 'rgba(99, 102, 241, 0.08)' },
    { to: '/tpo/exam-results', title: 'Exam Evaluation & CSV', desc: 'Inspect student test scores and export reports', color: 'var(--success-500)', bg: 'rgba(16, 185, 129, 0.08)' },
    { to: '/tpo/interviews', title: 'Round 3 Interviews', desc: 'Schedule 1-on-1 AI proctored interview rooms', color: 'var(--warning-500)', bg: 'rgba(245, 158, 11, 0.08)' },
    { to: '/tpo/students', title: 'Student Directory', desc: 'Manage student directory records and CRUD operations', color: 'var(--accent-500)', bg: 'rgba(14, 165, 233, 0.08)' },
  ];

  return (
    <div className="animate-fade-in" id="tpo-dashboard">
      <div className="page-header flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1>TPO <span className="text-gradient">Command Center</span></h1>
          <p>VBIT Hyderabad · Real-Time Dynamic Placement Intelligence</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={() => setShowBroadcastModal(true)}>
            Broadcast Alert
          </button>
          <Link to="/tpo/simulator" className="btn btn-secondary" id="btn-simulator">Run Simulator</Link>
        </div>
      </div>

      {/* Dynamic Stat Cards */}
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
        <h3 className="mb-4">Quick Actions & Management</h3>
        <div className="grid grid-4 gap-4">
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

      {/* Live Applicants Tracker */}
      <div className="glass-card mb-8">
        <div className="flex items-center justify-between mb-6" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3>Live Drive Applicant Registrations</h3>
            <p className="text-xs text-muted">Dynamic tracking powered by Cloud Firestore</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">Filter:</span>
            <select className="input-field" style={{ width: 160, padding: '6px 12px' }} value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
              <option value="All">All Departments</option>
              {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-3 gap-6 mb-6">
          {drives.map(d => {
            const count = selectedDept === 'All' ? d.totalApplied : (d.deptApplied?.[selectedDept] || 0);
            return (
              <div key={d.id} className="p-4" style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center justify-between mb-2">
                  <strong style={{ fontSize: '1rem' }}>{d.company}</strong>
                  <span className="badge badge-success">{formatCurrency(d.package)}</span>
                </div>
                <div className="text-xs text-muted mb-4">{d.role}</div>
                <div className="flex items-center justify-between p-3" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
                  <span className="text-xs text-muted">{selectedDept === 'All' ? 'Total Applied:' : `${selectedDept} Applied:`}</span>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-400)' }}>{count} Students</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chart */}
        <h4 className="mb-4 text-sm" style={{ color: 'var(--primary-300)' }}>Departmental Participation Comparison</h4>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparativeChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="department" stroke="var(--slate-500)" tick={{ fontSize: 12 }} />
              <YAxis stroke="var(--slate-500)" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }} />
              <Legend />
              {drives.slice(0, 4).map((d, i) => {
                const colors = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981'];
                return <Bar key={d.company} dataKey={d.company} fill={colors[i % 4]} radius={[4, 4, 0, 0]} />;
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="glass-card">
        <h3 className="mb-6">Departmental Placement Breakdown</h3>
        <div className="flex flex-col gap-3">
          {departmentBreakdown.map(d => (
            <div key={d.name} className="flex items-center justify-between p-4" style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-lg)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                <div className="text-xs text-muted">{d.placed} placed</div>
              </div>
              <div className="flex items-center gap-4" style={{ minWidth: 200 }}>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div className="progress-fill" style={{
                    width: `${d.pct}%`,
                    background: d.pct > 70 ? 'var(--gradient-success)' : d.pct > 50 ? 'linear-gradient(135deg, var(--warning-500), var(--warning-400))' : 'linear-gradient(135deg, var(--error-500), var(--error-400))',
                  }} />
                </div>
                <span style={{ fontWeight: 700, width: 40, textAlign: 'right', color: d.pct > 70 ? 'var(--success-400)' : 'var(--text-secondary)' }}>
                  {d.pct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <h3 className="mb-4">Broadcast Live Alert</h3>
            <p className="text-xs text-muted mb-4">
              Sends real-time notification alerts to all active Student Portals via Firestore.
            </p>

            {broadcastMsg && <div className="alert alert-success mb-4">{broadcastMsg}</div>}

            <form onSubmit={handleBroadcastNotification} className="flex flex-col gap-4">
              <div className="input-group">
                <label>Alert Type</label>
                <select className="input-field" value={notifForm.type} onChange={e => setNotifForm({ ...notifForm, type: e.target.value })}>
                  <option value="drive_alert">New Placement Drive Announcement</option>
                  <option value="reminder">Drive Deadline Reminder</option>
                </select>
              </div>
              <div className="input-group">
                <label>Alert Title *</label>
                <input className="input-field" required value={notifForm.title} onChange={e => setNotifForm({ ...notifForm, title: e.target.value })} />
              </div>
              <div className="grid grid-2 gap-4">
                <div className="input-group">
                  <label>Company Name *</label>
                  <input className="input-field" required value={notifForm.company} onChange={e => setNotifForm({ ...notifForm, company: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>Job Role</label>
                  <input className="input-field" value={notifForm.role} onChange={e => setNotifForm({ ...notifForm, role: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label>Message Content *</label>
                <textarea className="input-field" rows={3} required value={notifForm.message} onChange={e => setNotifForm({ ...notifForm, message: e.target.value })} />
              </div>
              <div className="flex items-center justify-between mt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setShowBroadcastModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Broadcast Now</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
