import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db, collection, getDocs, onSnapshot } from '../../lib/firebase';
import { getReadinessColor, formatDate, formatCurrency, getBranchFromRollNo, getSectionFromRollNo } from '../../lib/utils';
import NotificationBell from '../../components/NotificationBell';
import ApplyDriveModal from '../../components/ApplyDriveModal';
import PreExamModal from '../../components/PreExamModal';

/* ─── SVG Icons ─────────────────────────────────────────────── */
const GaugeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
);
const BriefcaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
);
const VideoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
);
const TrophyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
);
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);
const ZapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
);

/* ─── Progress Ring Component ──────────────────────────────── */
function ProgressRing({ value, size = 56, stroke = 4, color = '#818cf8' }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="progress-ring" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(51,65,85,0.4)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  );
}

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ readiness: 0.78, apps: 0, offers: 0, interviews: 0 });
  const [drives, setDrives] = useState([]);
  const [activity, setActivity] = useState([]);
  const [appliedDriveIds, setAppliedDriveIds] = useState([]);
  const [liveExams, setLiveExams] = useState([]);
  const [studentExamResults, setStudentExamResults] = useState({});
  const [selectedExamModal, setSelectedExamModal] = useState(null);
  const [selectedDrive, setSelectedDrive] = useState(null);

  const name = profile?.name || user?.displayName || 'Student Candidate';
  const rollNo = profile?.rollNo || '23P61A0501';
  const branch = profile?.department || getBranchFromRollNo(rollNo) || 'CSE';
  const classSec = profile?.classSection || `Section ${getSectionFromRollNo(rollNo)}`;

  useEffect(() => {
    if (!user) return;

    const unsubResults = onSnapshot(collection(db, 'examResults'), (snap) => {
      if (!snap.empty) {
        const myResults = {};
        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.rollNo === rollNo || data.rollNumber === rollNo) {
            const driveId = data.driveId || doc.id.split('_')[0] || doc.id;
            myResults[driveId] = data;
          }
        });
        setStudentExamResults(myResults);
      }
    });

    const unsubDrives = onSnapshot(collection(db, 'drives'), async (snap) => {
      if (!snap.empty) {
        const fsDrives = snap.docs.map(d => ({
          id: d.id, company: d.data().company || 'Corporate Partner',
          role: d.data().role || 'Job Role', package: d.data().package || 0,
          date: d.data().createdAt ? new Date(d.data().createdAt.seconds * 1000) : new Date(),
        }));
        setDrives(fsDrives);
        let appliedCount = 0, offerCount = 0, interviewCount = 0;
        const userActivities = [], myDriveIds = [], myAppliedDrives = [];
        for (const drive of fsDrives) {
          try {
            const appSnap = await getDocs(collection(db, 'drives', drive.id, 'applications'));
            if (!appSnap.empty) {
              const myApp = appSnap.docs.find(doc => doc.id === rollNo || doc.data().rollNo === rollNo || doc.data().email === profile?.email);
              if (myApp) {
                appliedCount++; myDriveIds.push(drive.id);
                myAppliedDrives.push(drive);
                userActivities.push({ text: `Applied to ${drive.company} — ${drive.role}`, time: 'Recently', type: 'application' });
                const appStatus = (myApp.data().status || '').toLowerCase();
                if (appStatus.includes('offer') || appStatus.includes('selected') || appStatus.includes('placed')) offerCount++;
                if (appStatus.includes('interview') || appStatus.includes('shortlisted') || appStatus.includes('qualified') || appStatus.includes('assessment')) interviewCount++;
              }
            }
          } catch { /* proceed */ }
        }
        setAppliedDriveIds(myDriveIds);
        
        // Pure dynamic calculation based on real candidate data
        const cgpaVal = profile?.cgpa || 0;
        const cgpaScore = cgpaVal > 0 ? (cgpaVal / 10) * 100 : 0;
        const aptVal = profile?.aptitudeScore || (profile?.aptitudeCompleted ? (profile.aptitudePassed ? 100 : 40) : 0);
        const techVal = profile?.technicalScore || profile?.codingScore || (profile?.technicalCompleted ? (profile.technicalPassed ? 100 : 40) : 0);
        const skillsCount = (profile?.skills || profile?.acquiredSkills || []).length;
        const domainVal = skillsCount > 0 ? Math.min(100, skillsCount * 20) : 0;

        let calcReadiness = 0;
        if (cgpaScore > 0 || aptVal > 0 || techVal > 0 || domainVal > 0) {
          calcReadiness = Math.min(0.98, ((cgpaScore * 0.30) + (aptVal * 0.25) + (techVal * 0.25) + (domainVal * 0.20)) / 100);
        }

        // Live interviews count from real applications + qualified screening tests
        const totalInterviews = interviewCount + (profile?.qualifiedForRound2 || profile?.qualifiedForRound3 ? 1 : 0);

        setStats({ readiness: calcReadiness, apps: appliedCount, offers: offerCount, interviews: totalInterviews });
        setActivity(userActivities.length > 0 ? userActivities : [{ text: 'Profile Initialized & Registered for Campus Placements', time: 'Active', type: 'system' }]);
      } else {
        const cgpaVal = profile?.cgpa || 0;
        const calcReadiness = cgpaVal > 0 ? Math.min(0.95, (cgpaVal / 10) * 0.8) : 0;
        setDrives([]); setStats({ readiness: calcReadiness, apps: 0, offers: 0, interviews: 0 });
        setActivity([{ text: 'No active placement drives announced yet.', time: 'System', type: 'system' }]);
      }
      setLoading(false);
    });

    // Cross-round qualification: filter exams by qualification status
    const unsubExams = onSnapshot(collection(db, 'exams'), (snap) => {
      if (!snap.empty) {
        const liveList = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(ex => {
          if (!ex.isLive) return false;
          const rolls = ex.registeredStudentRolls || [];
          const isRegistered = rolls.includes(rollNo) || appliedDriveIds.includes(ex.driveId) || appliedDriveIds.includes(ex.id);
          if (!isRegistered) return false;
          // Cross-round qualification gating
          if (ex.examType === 'technical' && !profile?.qualifiedForRound2) return false;
          return true;
        });
        setLiveExams(liveList);
      } else { setLiveExams([]); }
    });
    return () => { unsubResults(); unsubDrives(); unsubExams(); };
  }, [user, rollNo, profile, appliedDriveIds.length]);

  const handleLaunchExam = (exam) => {
    setSelectedExamModal(null);
    navigate(exam.examType === 'technical' ? '/exam/technical' : '/exam/aptitude', { state: { examId: exam.id, driveCompany: exam.driveCompany } });
  };

  const readinessPct = (stats.readiness * 100).toFixed(0);

  // Dynamically constructed upcoming activities from live exams and candidate applications
  const upcomingActivities = [];
  if (liveExams.length > 0) {
    liveExams.forEach(ex => {
      upcomingActivities.push({
        label: `${ex.driveCompany} — ${ex.title || (ex.examType === 'technical' ? 'Round 2 Technical Coding' : 'Round 1 Aptitude Test')}`,
        date: 'Proctored Screening Active',
        icon: <ZapIcon />,
        color: '#818cf8'
      });
    });
  }
  if (profile?.qualifiedForRound2 && !profile?.technicalCompleted) {
    upcomingActivities.push({
      label: `Round 2 Technical Coding Sandbox — Qualified`,
      date: 'Access Granted',
      icon: <ZapIcon />,
      color: '#fbbf24'
    });
  }
  if (profile?.qualifiedForRound3) {
    upcomingActivities.push({
      label: `Round 3 Interview Call — Qualified`,
      date: 'Cleared Screening',
      icon: <CalendarIcon />,
      color: '#34d399'
    });
  }

  const metrics = [
    { label: 'Readiness Score', value: `${readinessPct}%`, icon: <GaugeIcon />, bg: 'rgba(99,102,241,0.1)', color: '#818cf8', glow: 'rgba(99,102,241,0.12)', accent: 'linear-gradient(135deg, #6366f1, #818cf8)' },
    { label: 'Applications', value: stats.apps, icon: <BriefcaseIcon />, bg: 'rgba(14,165,233,0.1)', color: '#38bdf8', glow: 'rgba(14,165,233,0.12)', accent: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
    { label: 'Interviews', value: stats.interviews, icon: <VideoIcon />, bg: 'rgba(139,92,246,0.1)', color: '#a78bfa', glow: 'rgba(139,92,246,0.12)', accent: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
    { label: 'Offers', value: stats.offers, icon: <TrophyIcon />, bg: 'rgba(16,185,129,0.1)', color: '#34d399', glow: 'rgba(16,185,129,0.12)', accent: 'linear-gradient(135deg, #10b981, #34d399)' },
  ];

  return (
    <div className="animate-fade-in" id="student-dashboard">
      {/* Gradient Header */}
      <div className="page-header flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1>Welcome back, <span className="text-gradient">{name}</span></h1>
          <p>{rollNo} · {branch} ({classSec}) · VBIT Hyderabad</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell onApplyDrive={(d) => setSelectedDrive(d)} />
          <Link to="/student/passport" className="btn btn-primary" id="btn-view-passport">View Passport</Link>
        </div>
      </div>

      {/* Premium Metric Cards */}
      <div className="grid grid-4 stagger-children" id="dashboard-stats">
        {metrics.map(m => (
          <div key={m.label} className="metric-card" style={{ '--metric-accent': m.accent, '--metric-bg': m.bg, '--metric-color': m.color, '--metric-glow': m.glow }}>
            <div className="metric-icon">{m.icon}</div>
            <div>
              <div className="metric-value count-up" style={{ color: m.color }}>{m.value}</div>
              <div className="metric-label">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Exam Banner with Round Progression Gate */}
      {liveExams.length > 0 && (
        <div className="glass-card-premium mt-6 mb-6" style={{ padding: '1.5rem' }}>
          <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="badge badge-error mb-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f43f5e', animation: 'pulse 1.5s infinite' }} />
                LIVE PROCTORED SCREENING
              </span>
              <h3 className="text-gradient">Proctored Recruitment Screening Active</h3>
              <p className="text-xs text-muted">Drive-tied screening for {name} ({rollNo})</p>
            </div>
            <span className="badge badge-accent">AI Proctoring Active</span>
          </div>

          <div className="flex flex-col gap-3">
            {liveExams.map(ex => {
              const driveResult = studentExamResults[ex.id] || studentExamResults[ex.driveId] || {};
              const isCurrentDrive = profile?.currentExamDriveId === ex.id || profile?.currentExamDriveId === ex.driveId;

              const hasTechAccess = !!(driveResult.qualifiedForTechnical || driveResult.qualifiedForRound2 || (isCurrentDrive && (profile?.qualifiedForTechnical || profile?.qualifiedForRound2)));
              const aptitudeFinished = !!(driveResult.aptitudeCompleted || (driveResult.round === 1 && driveResult.score !== undefined) || (isCurrentDrive && profile?.aptitudeCompleted));
              const technicalFinished = !!(driveResult.technicalCompleted || (driveResult.round === 2 && driveResult.testCasesPassed !== undefined) || (isCurrentDrive && profile?.technicalCompleted));
              const isTechDisqualified = !!(driveResult.isDisqualified || driveResult.technicalDisqualified || (isCurrentDrive && profile?.technicalDisqualified));
              const isTechPassed = !!(driveResult.qualifiedForRound3 || driveResult.status === 'PASSED' || driveResult.technicalPassed || (isCurrentDrive && profile?.technicalPassed));

              if (technicalFinished) {
                if (isTechDisqualified) {
                  return (
                    <div key={ex.id} className="activity-item" style={{ border: '1px solid rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.08)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                          {ex.driveCompany} — Proctored Screening Terminated
                        </div>
                        <div className="text-xs text-muted mt-1">
                          Exam Disqualified due to Anti-Malpractice Violation ({driveResult.disqualificationReason || profile?.disqualificationReason || 'Tab switch / Loss of window focus'}).
                        </div>
                      </div>
                      <span className="badge badge-error" style={{ fontWeight: 800, padding: '0.5rem 1rem' }}>
                        🔴 DISQUALIFIED
                      </span>
                    </div>
                  );
                }

                if (!isTechPassed) {
                  return (
                    <div key={ex.id} className="activity-item" style={{ border: '1px solid rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.08)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                          {ex.driveCompany} — Technical Assessment Complete
                        </div>
                        <div className="text-xs text-muted mt-1">
                          Score: {driveResult.technicalScore ?? driveResult.score ?? profile?.technicalScore ?? 0}% ({driveResult.testCasesPassed ?? profile?.testCasesPassed ?? 0} / {driveResult.totalTestCases ?? profile?.totalTestCases ?? 3} Test Cases Passed). Status: FAILED.
                        </div>
                      </div>
                      <span className="badge badge-error" style={{ fontWeight: 800, padding: '0.5rem 1rem' }}>
                        ❌ FAILED (Not Qualified)
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={ex.id} className="activity-item" style={{ border: '1px solid rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                        {ex.driveCompany} — Proctored Screening Complete
                      </div>
                      <div className="text-xs text-muted mt-1">
                        All screening rounds completed successfully ({driveResult.testCasesPassed ?? profile?.testCasesPassed ?? 3} / {driveResult.totalTestCases ?? profile?.totalTestCases ?? 3} Test Cases Passed). You are qualified for Round 3 Interview Call.
                      </div>
                    </div>
                    <span className="badge badge-success" style={{ fontWeight: 800, padding: '0.5rem 1rem' }}>
                      ✓ Cleared for Round 3 Interview
                    </span>
                  </div>
                );
              }

              if (hasTechAccess) {
                const techExamModal = { ...ex, examType: 'technical', title: 'Round 2: Technical Coding Sandbox', rollNo };
                return (
                  <div key={ex.id} className="activity-item" style={{ border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)' }}>
                    <div className="metric-icon" style={{ width: '2.25rem', height: '2.25rem', '--metric-bg': 'rgba(245, 158, 11, 0.15)', '--metric-color': '#fbbf24' }}>
                      <ZapIcon />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                        {ex.driveCompany} — Round 2: Technical Coding Sandbox
                      </div>
                      <div className="text-xs text-muted mt-1">
                        ✓ Round 1 Aptitude Cleared. TPO Granted Access for Technical Coding Sandbox ({ex.durationMinutes || 30} Mins).
                      </div>
                    </div>
                    <button onClick={() => setSelectedExamModal(techExamModal)} className="btn btn-warning btn-lg" style={{ fontWeight: 800, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#ffffff' }}>
                      Launch Technical Exam →
                    </button>
                  </div>
                );
              }

              if (aptitudeFinished) {
                const isAptPassed = (driveResult.aptitudePassed !== undefined ? driveResult.aptitudePassed : (profile?.aptitudePassed !== false));
                if (!isAptPassed) {
                  return (
                    <div key={ex.id} className="activity-item" style={{ border: '1px solid rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.08)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                          {ex.driveCompany} — Round 1 Aptitude Assessment
                        </div>
                        <div className="text-xs text-muted mt-1">
                          Score: {driveResult.score ?? profile?.aptitudeScore ?? 0}%. Status: FAILED (Did not meet minimum cutoff mark).
                        </div>
                      </div>
                      <span className="badge badge-error" style={{ fontWeight: 800, padding: '0.4rem 0.85rem' }}>
                        ❌ FAILED
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={ex.id} className="activity-item" style={{ border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                        {ex.driveCompany} — Round 1 Aptitude Completed
                      </div>
                      <div className="text-xs text-muted mt-1">
                        Score Submitted: {driveResult.score ?? profile?.aptitudeScore ?? 100}%. Awaiting TPO Round 2 Technical Access Grant.
                      </div>
                    </div>
                    <span className="badge badge-warning" style={{ fontWeight: 700, padding: '0.4rem 0.85rem' }}>
                      ⏳ Access Pending TPO Review
                    </span>
                  </div>
                );
              }

              // Default: Round 1 Aptitude Exam
              const aptExamModal = { ...ex, examType: 'aptitude', rollNo };
              return (
                <div key={ex.id} className="activity-item" style={{ border: '1px solid var(--border-default)' }}>
                  <div className="metric-icon" style={{ width: '2.25rem', height: '2.25rem', '--metric-bg': 'rgba(99,102,241,0.1)', '--metric-color': '#818cf8' }}>
                    <ZapIcon />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{ex.driveCompany} — {ex.title || 'Round 1 Aptitude Screening'}</div>
                    <div className="text-xs text-muted mt-1">{ex.driveRole} · {ex.durationMinutes || 30} Mins · Pass Cut-off {ex.passMark || 60}%</div>
                  </div>
                  <button onClick={() => setSelectedExamModal(aptExamModal)} className="btn btn-primary btn-lg" style={{ fontWeight: 700 }}>
                    Take Aptitude Test Now
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two Columns */}
      <div className="grid grid-2 mt-6">
        {/* Active Drives */}
        <div className="glass-card" id="upcoming-drives">
          <div className="flex items-center justify-between mb-4">
            <h3>Active Placement Drives</h3>
            <Link to="/student/jobs" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div className="flex flex-col gap-3">
            {drives.length === 0 && <div className="text-sm text-muted p-4 text-center">No active drives yet</div>}
            {drives.map(d => {
              const isApplied = appliedDriveIds.includes(d.id);
              return (
                <div key={d.id} className="activity-item">
                  <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                    {d.company.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{d.company}</div>
                    <div className="text-sm text-muted">{d.role}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--success-400)', fontWeight: 600, fontSize: '0.9rem' }}>{formatCurrency(d.package)}</div>
                      <div className="text-xs text-muted">{formatDate(d.date)}</div>
                    </div>
                    {isApplied ? (
                      <span className="badge badge-success" style={{ fontWeight: 700, padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                        ✓ Applied
                      </span>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => setSelectedDrive(d)}>Apply</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Activities with Timeline */}
        <div className="glass-card" id="upcoming-activities">
          <h3 className="mb-4">Upcoming Activities</h3>
          <div className="timeline">
            {upcomingActivities.length === 0 ? (
              <p className="text-xs text-muted py-2">No upcoming placement activities scheduled at this time.</p>
            ) : (
              upcomingActivities.map((a, i) => (
                <div key={i} className="timeline-item">
                  <div className="flex items-center gap-3">
                    <div style={{ color: a.color }}>{a.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{a.label}</div>
                      <div className="text-xs text-muted">{a.date}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <h4 className="mt-6 mb-3" style={{ color: 'var(--slate-300)' }}>Recent Activity</h4>
          <div className="flex flex-col gap-2">
            {activity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3" style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.type === 'application' ? 'var(--primary-400)' : 'var(--slate-500)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-sm" style={{ fontWeight: 500 }}>{a.text}</div>
                  <div className="text-xs text-muted">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedDrive && (
        <ApplyDriveModal
          drive={selectedDrive}
          studentProfile={profile}
          onClose={() => setSelectedDrive(null)}
          onSuccess={() => {
            setStats(p => ({ ...p, apps: p.apps + 1 }));
            if (selectedDrive?.id) {
              setAppliedDriveIds(prev => Array.from(new Set([...prev, selectedDrive.id])));
            }
          }}
        />
      )}
      {selectedExamModal && <PreExamModal examData={selectedExamModal} onClose={() => setSelectedExamModal(null)} onStartExam={handleLaunchExam} />}
    </div>
  );
}
