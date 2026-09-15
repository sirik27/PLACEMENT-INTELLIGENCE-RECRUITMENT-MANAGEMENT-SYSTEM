import { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot } from '../../lib/firebase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function TPOAnalytics() {
  const [data, setData] = useState([
    { dept: 'CSE', placed: 28, total: 30 },
    { dept: 'DS', placed: 12, total: 15 },
    { dept: 'ECE', placed: 6, total: 10 },
    { dept: 'EEE', placed: 4, total: 8 },
    { dept: 'MECH', placed: 2, total: 5 },
    { dept: 'CIVIL', placed: 2, total: 7 },
  ]);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const deptMap = {};
        snap.docs.forEach(doc => {
          const s = doc.data();
          const dept = s.department || s.branch || 'CSE';
          if (!deptMap[dept]) deptMap[dept] = { dept: dept, placed: 0, total: 0 };
          deptMap[dept].total += 1;
          if ((s.status || '').toLowerCase().includes('placed') || (s.status || '').toLowerCase().includes('selected')) {
            deptMap[dept].placed += 1;
          }
        });
        const chartData = Object.values(deptMap);
        if (chartData.length > 0) setData(chartData);
      }
    });

    return () => unsub();
  }, []);

  const totalStudents = data.reduce((acc, d) => acc + d.total, 0);
  const totalPlaced = data.reduce((acc, d) => acc + d.placed, 0);
  const placementRate = totalStudents > 0 ? Math.round((totalPlaced / totalStudents) * 100) : 0;

  return (
    <div className="animate-fade-in space-y-6" id="tpo-analytics">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Placement <span className="text-gradient">Analytics & Telemetry</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Real-time cohort statistics & departmental conversion metrics</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 space-y-1">
          <span className="text-xs text-slate-400 font-mono">Total Candidates</span>
          <p className="text-2xl font-extrabold text-slate-100">{totalStudents}</p>
        </div>
        <div className="glass-card p-6 space-y-1">
          <span className="text-xs text-slate-400 font-mono">Total Offers Secured</span>
          <p className="text-2xl font-extrabold text-emerald-400">{totalPlaced}</p>
        </div>
        <div className="glass-card p-6 space-y-1">
          <span className="text-xs text-slate-400 font-mono">Placement Rate</span>
          <p className="text-2xl font-extrabold text-indigo-400">{placementRate}%</p>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-100 border-b border-slate-800 pb-3">Departmental Placement Conversion</h3>
        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="dept" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc' }} />
              <Legend />
              <Bar dataKey="total" name="Total Students" fill="#334155" radius={[4, 4, 0, 0]} />
              <Bar dataKey="placed" name="Placed Students" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
