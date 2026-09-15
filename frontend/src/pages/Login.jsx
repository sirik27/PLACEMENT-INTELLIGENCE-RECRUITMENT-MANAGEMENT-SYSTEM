import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  db,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from '../lib/firebase';

const DEPARTMENTS = [
  'Computer Science & Engineering (CSE)',
  'Information Technology (IT)',
  'Electronics & Communication (ECE)',
  'Electrical & Electronics (EEE)',
  'Mechanical Engineering (ME)',
  'Civil Engineering (CE)',
  'Artificial Intelligence & Data Science (AI&DS)',
  'CSE - Data Science (DS)',
  'CSE - AI & Machine Learning (AIML)',
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SECTIONS = ['Section A', 'Section B', 'Section C', 'Section D'];

/* ─── Inline Vector SVG Icons ──────────────────────────────── */
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
  </svg>
);

const UserGraduateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 2 6 2 6 2s6 0 6-2v-5" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();

  const [tpoEmail, setTpoEmail] = useState('');
  const [tpoPass, setTpoPass] = useState('');
  const [showTpoPass, setShowTpoPass] = useState(false);
  const [tpoError, setTpoError] = useState('');
  const [tpoLoading, setTpoLoading] = useState(false);

  const [recEmail, setRecEmail] = useState('');
  const [recPass, setRecPass] = useState('');
  const [showRecPass, setShowRecPass] = useState(false);
  const [recError, setRecError] = useState('');
  const [recLoading, setRecLoading] = useState(false);

  const [stuEmail, setStuEmail] = useState('');
  const [stuPass, setStuPass] = useState('');
  const [showStuPass, setShowStuPass] = useState(false);
  const [stuError, setStuError] = useState('');
  const [stuLoading, setStuLoading] = useState(false);

  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [year, setYear] = useState('4th Year');
  const [classSection, setClassSection] = useState('Section A');
  const [rollNo, setRollNo] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  const [seedMsg, setSeedMsg] = useState('');
  const [seeding, setSeeding] = useState(false);

  const handlePortalLogin = async (targetRole, emailVal, passVal, setErrorFn, setLoadingFn) => {
    setErrorFn('');
    setLoadingFn(true);

    const cleanEmail = (emailVal || '').trim().toLowerCase();
    const cleanPass = (passVal || '').trim();

    try {
      let userUid = null;
      let userRole = null;

      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        userUid = cred.user.uid;
        const snap = await getDoc(doc(db, 'users', userUid));
        if (snap.exists()) {
          userRole = snap.data().role;
        } else {
          const tk = await cred.user.getIdTokenResult();
          userRole = tk.claims.role || 'student';
        }
      } catch (authErr) {
        const qDoc = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const fsSnap = await getDocs(qDoc);

        if (!fsSnap.empty) {
          const matchedDoc = fsSnap.docs[0];
          const matchedData = matchedDoc.data();

          if (matchedData.password && matchedData.password !== cleanPass) {
            setErrorFn('Incorrect password.');
            setLoadingFn(false);
            return;
          }

          if (matchedData.role) userRole = matchedData.role;

          try {
            const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
            userUid = newCred.user.uid;
            await setDoc(doc(db, 'users', userUid), {
              ...matchedData,
              uid: userUid,
            });
          } catch {
            try {
              const loginCred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
              userUid = loginCred.user.uid;
            } catch { /* proceed */ }
          }
        } else {
          throw authErr;
        }
      }

      if (userRole && userRole !== targetRole) {
        setErrorFn(
          `Access Denied: Your account role is "${userRole?.toUpperCase()}". Please log in via the ${userRole?.toUpperCase()} portal.`
        );
        setLoadingFn(false);
        return;
      }

      navigate(`/${targetRole}`);
    } catch (err) {
      const msgs = {
        'auth/user-not-found': 'Account not found. Click "Initialize Portal Accounts" below.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      };
      setErrorFn(msgs[err.code] || err.message);
    }
    setLoadingFn(false);
  };

  const handleStudentSignUp = async (e) => {
    e.preventDefault();
    setSignupError('');
    setSignupSuccess('');

    if (signupPass !== confirmPass) {
      setSignupError('Passwords do not match.');
      return;
    }

    if (signupPass.length < 6) {
      setSignupError('Password must be at least 6 characters long.');
      return;
    }

    setSignupLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, signupEmail, signupPass);

      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name: fullName.trim(),
        email: signupEmail.trim(),
        role: 'student',
        department: department,
        year: year,
        classSection: classSection,
        rollNo: rollNo.trim().toUpperCase(),
        readinessScore: 0.75,
        qualifiedForTechnical: false,
        verified: true,
        createdAt: serverTimestamp(),
      });

      setSignupSuccess('Registration Successful! Redirecting to student portal...');
      setTimeout(() => {
        navigate('/student');
      }, 1200);
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Account already exists. Please login.',
        'auth/invalid-email': 'Please enter a valid institutional email.',
        'auth/weak-password': 'Password should be at least 6 characters.',
      };
      setSignupError(msgs[err.code] || err.message);
    }
    setSignupLoading(false);
  };

  const handleSeedAccounts = async () => {
    setSeeding(true);
    setSeedMsg('');
    try {
      const seeds = [
        { email: 'tpo@vbithyd.ac.in', pass: 'tpo12345', role: 'tpo', name: 'TPO Officer', company: 'VBIT Hyderabad' },
        { email: 'recruiter@infosys.com', pass: 'recruit123', role: 'recruiter', name: 'Suresh Kumar', company: 'Infosys Limited' },
        { email: '23p61a0501@vbithyd.ac.in', pass: 'student123', role: 'student', name: 'Aarav Sharma', department: 'CSE', year: '4th Year', classSection: 'Section A', rollNo: '23P61A0501', qualifiedForTechnical: true },
      ];

      for (const s of seeds) {
        let uid = null;
        try {
          const cred = await createUserWithEmailAndPassword(auth, s.email, s.pass);
          uid = cred.user.uid;
        } catch (e) {
          if (e.code === 'auth/email-already-in-use') {
            try {
              const loginCred = await signInWithEmailAndPassword(auth, s.email, s.pass);
              uid = loginCred.user.uid;
            } catch { /* proceed */ }
          }
        }

        if (uid) {
          await setDoc(doc(db, 'users', uid), {
            uid: uid,
            email: s.email,
            role: s.role,
            name: s.name,
            company: s.company || null,
            department: s.department || 'CSE',
            year: s.year || '4th Year',
            classSection: s.classSection || 'Section A',
            rollNo: s.rollNo || null,
            readinessScore: 0.84,
            qualifiedForTechnical: s.qualifiedForTechnical || false,
            createdAt: serverTimestamp(),
          });
        }
      }

      setTpoEmail('tpo@vbithyd.ac.in');
      setTpoPass('tpo12345');
      setRecEmail('recruiter@infosys.com');
      setRecPass('recruit123');
      setStuEmail('23p61a0501@vbithyd.ac.in');
      setStuPass('student123');

      setSeedMsg('✓ Portal accounts (TPO, Recruiter, Student) provisioned into Firebase!');
    } catch (err) {
      setSeedMsg(`Seeding notice: ${err.message}`);
    }
    setSeeding(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#070c18',
        color: '#f8fafc',
        position: 'relative',
        overflowX: 'hidden',
        padding: '3rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      id="login-page"
    >
      {/* Background Ambient Radial Glow Mesh */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          left: '20%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.14) 0%, rgba(7, 12, 24, 0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(70px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-100px',
          right: '20%',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(7, 12, 24, 0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(70px)',
        }}
      />

      <div style={{ maxWidth: '1140px', width: '100%', margin: '0 auto', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '1.1rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.4), inset 0 1px 1px rgba(255,255,255,0.4)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>

          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
            <span style={{ background: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 50%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              PlaceSmart Enterprise
            </span>
          </h1>

          <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0, fontWeight: 500, maxWidth: '520px', lineHeight: 1.5 }}>
            Placement Intelligence & Proctored Recruitment Management Suite
          </p>

          <span className="badge badge-primary" style={{ marginTop: '0.4rem', padding: '0.35rem 0.85rem', fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            📍 VERIFIED CAMPUS NODE · VBIT HYDERABAD
          </span>
        </div>

        {/* 3 Portal Glassmorphic Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* CARD 1: TPO OFFICER */}
          <div
            className="glass-card"
            id="card-tpo"
            style={{
              padding: '1.75rem',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              borderRadius: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1.5rem',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 42, height: 42, borderRadius: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldIcon />
                </div>
                <span className="badge badge-primary" style={{ fontSize: '0.6875rem', fontWeight: 800 }}>TPO ADMIN</span>
              </div>

              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>TPO Officer Portal</h2>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>Training & Placement Command Center</p>
              </div>
            </div>

            <form
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              onSubmit={(e) => {
                e.preventDefault();
                handlePortalLogin('tpo', tpoEmail, tpoPass, setTpoError, setTpoLoading);
              }}
            >
              {tpoError && (
                <div style={{ padding: '0.75rem', borderRadius: '0.6rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', fontSize: '0.75rem', lineHeight: 1.4 }}>
                  {tpoError}
                </div>
              )}

              <div className="input-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Institutional Email</label>
                <input
                  className="input-field text-xs"
                  type="email"
                  placeholder="tpo@vbithyd.ac.in"
                  value={tpoEmail}
                  onChange={(e) => setTpoEmail(e.target.value)}
                  style={{ background: '#020617', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', padding: '0.65rem 0.85rem' }}
                  required
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-field text-xs"
                    type={showTpoPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={tpoPass}
                    onChange={(e) => setTpoPass(e.target.value)}
                    style={{ background: '#020617', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', padding: '0.65rem 2.25rem 0.65rem 0.85rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowTpoPass(!showTpoPass)}
                    style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showTpoPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={tpoLoading}
                style={{ fontWeight: 800, fontSize: '0.8rem', padding: '0.65rem 1rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)' }}
              >
                {tpoLoading ? 'Authenticating TPO...' : 'Sign In as TPO Officer →'}
              </button>

              <button
                type="button"
                onClick={() => { setTpoEmail('tpo@vbithyd.ac.in'); setTpoPass('tpo12345'); }}
                style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px dashed rgba(99, 102, 241, 0.3)', color: '#818cf8', fontSize: '0.7rem', fontWeight: 600, padding: '0.4rem', borderRadius: '0.5rem', cursor: 'pointer', textAlign: 'center' }}
              >
                ⚡ Fill TPO Demo Credentials
              </button>
            </form>
          </div>

          {/* CARD 2: RECRUITER PARTNER */}
          <div
            className="glass-card"
            id="card-recruiter"
            style={{
              padding: '1.75rem',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(14, 165, 233, 0.35)',
              borderRadius: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1.5rem',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 42, height: 42, borderRadius: '0.75rem', background: 'rgba(14, 165, 233, 0.15)', border: '1px solid rgba(14, 165, 233, 0.3)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BriefcaseIcon />
                </div>
                <span className="badge badge-accent" style={{ fontSize: '0.6875rem', fontWeight: 800 }}>CORPORATE</span>
              </div>

              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Recruiter Partner</h2>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>Corporate Hiring & Assessment Portal</p>
              </div>
            </div>

            <form
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              onSubmit={(e) => {
                e.preventDefault();
                handlePortalLogin('recruiter', recEmail, recPass, setRecError, setRecLoading);
              }}
            >
              {recError && (
                <div style={{ padding: '0.75rem', borderRadius: '0.6rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', fontSize: '0.75rem', lineHeight: 1.4 }}>
                  {recError}
                </div>
              )}

              <div className="input-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Corporate Work Email</label>
                <input
                  className="input-field text-xs"
                  type="email"
                  placeholder="recruiter@infosys.com"
                  value={recEmail}
                  onChange={(e) => setRecEmail(e.target.value)}
                  style={{ background: '#020617', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', padding: '0.65rem 0.85rem' }}
                  required
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-field text-xs"
                    type={showRecPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={recPass}
                    onChange={(e) => setRecPass(e.target.value)}
                    style={{ background: '#020617', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', padding: '0.65rem 2.25rem 0.65rem 0.85rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecPass(!showRecPass)}
                    style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showRecPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={recLoading}
                style={{ fontWeight: 800, fontSize: '0.8rem', padding: '0.65rem 1rem', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)' }}
              >
                {recLoading ? 'Authenticating Corporate...' : 'Sign In as Recruiter →'}
              </button>

              <button
                type="button"
                onClick={() => { setRecEmail('recruiter@infosys.com'); setRecPass('recruit123'); }}
                style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px dashed rgba(14, 165, 233, 0.3)', color: '#38bdf8', fontSize: '0.7rem', fontWeight: 600, padding: '0.4rem', borderRadius: '0.5rem', cursor: 'pointer', textAlign: 'center' }}
              >
                ⚡ Fill Recruiter Demo Credentials
              </button>
            </form>
          </div>

          {/* CARD 3: STUDENT CANDIDATE */}
          <div
            className="glass-card"
            id="card-student"
            style={{
              padding: '1.75rem',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1.5rem',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 42, height: 42, borderRadius: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserGraduateIcon />
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.6875rem', fontWeight: 800 }}>CANDIDATE</span>
              </div>

              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Student Portal</h2>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>Proctored Screening & Readiness Passport</p>
              </div>
            </div>

            <form
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              onSubmit={(e) => {
                e.preventDefault();
                handlePortalLogin('student', stuEmail, stuPass, setStuError, setStuLoading);
              }}
            >
              {stuError && (
                <div style={{ padding: '0.75rem', borderRadius: '0.6rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', fontSize: '0.75rem', lineHeight: 1.4 }}>
                  {stuError}
                </div>
              )}

              <div className="input-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Domain Email Address</label>
                <input
                  className="input-field text-xs"
                  type="email"
                  placeholder="23p61a0501@vbithyd.ac.in"
                  value={stuEmail}
                  onChange={(e) => setStuEmail(e.target.value)}
                  style={{ background: '#020617', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', padding: '0.65rem 0.85rem' }}
                  required
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-field text-xs"
                    type={showStuPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={stuPass}
                    onChange={(e) => setStuPass(e.target.value)}
                    style={{ background: '#020617', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', padding: '0.65rem 2.25rem 0.65rem 0.85rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowStuPass(!showStuPass)}
                    style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showStuPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-success"
                disabled={stuLoading}
                style={{ fontWeight: 800, fontSize: '0.8rem', padding: '0.65rem 1rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
              >
                {stuLoading ? 'Authenticating Candidate...' : 'Sign In as Student →'}
              </button>

              <button
                type="button"
                onClick={() => { setStuEmail('23p61a0501@vbithyd.ac.in'); setStuPass('student123'); }}
                style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px dashed rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.7rem', fontWeight: 600, padding: '0.4rem', borderRadius: '0.5rem', cursor: 'pointer', textAlign: 'center' }}
              >
                ⚡ Fill Student Demo Credentials
              </button>
            </form>
          </div>
        </div>

        {/* Footer Actions Container */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', paddingTop: '1rem' }}>
          <button
            type="button"
            onClick={() => { setShowSignUpModal(true); setSignupError(''); }}
            style={{
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc',
              padding: '0.65rem 1.35rem',
              borderRadius: '0.85rem',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease-in-out',
              boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            }}
          >
            <UserGraduateIcon />
            <span>New Candidate? Register Student Account →</span>
          </button>

          <button
            type="button"
            onClick={handleSeedAccounts}
            disabled={seeding}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(51, 65, 85, 0.7)',
              color: '#cbd5e1',
              padding: '0.65rem 1.35rem',
              borderRadius: '0.85rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.775rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <span>{seeding ? 'Provisioning Accounts...' : 'Initialize Firebase Default Accounts'}</span>
          </button>
        </div>

        {seedMsg && (
          <div style={{ textAlign: 'center' }}>
            <span className="badge badge-success" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
              {seedMsg}
            </span>
          </div>
        )}
      </div>

      {/* STUDENT REGISTRATION MODAL */}
      {showSignUpModal && (
        <div className="modal-overlay" style={{ background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)', position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '520px', width: '100%', padding: '1.75rem', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '1.25rem', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(51, 65, 85, 0.6)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.7rem', fontWeight: 800 }}>REGISTRATION</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Student Candidate Registration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSignUpModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            {signupError && <div className="badge badge-error" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', width: '100%' }}>{signupError}</div>}
            {signupSuccess && <div className="badge badge-success" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', width: '100%' }}>{signupSuccess}</div>}

            <form onSubmit={handleStudentSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="input-group">
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Domain Institutional Email *</label>
                <input
                  className="input-field text-xs"
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="e.g. 23p61a0501@vbithyd.ac.in"
                  style={{ background: '#020617', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Full Candidate Name *</label>
                <input
                  className="input-field text-xs"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  style={{ background: '#020617', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                />
              </div>

              <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Department *</label>
                  <select
                    className="input-field text-xs"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d} style={{ background: '#0f172a' }}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Academic Year *</label>
                  <select
                    className="input-field text-xs"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y} style={{ background: '#0f172a' }}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Class Section *</label>
                  <select
                    className="input-field text-xs"
                    value={classSection}
                    onChange={(e) => setClassSection(e.target.value)}
                    style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                  >
                    {SECTIONS.map((s) => (
                      <option key={s} value={s} style={{ background: '#0f172a' }}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Roll Number *</label>
                  <input
                    className="input-field text-xs"
                    type="text"
                    required
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    placeholder="23P61A0501"
                    style={{ background: '#020617', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Password *</label>
                  <input
                    className="input-field text-xs"
                    type="password"
                    required
                    value={signupPass}
                    onChange={(e) => setSignupPass(e.target.value)}
                    placeholder="At least 6 chars"
                    style={{ background: '#020617', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                  />
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Confirm Password *</label>
                  <input
                    className="input-field text-xs"
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Re-enter password"
                    style={{ background: '#020617', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(51, 65, 85, 0.6)' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowSignUpModal(false)}
                  style={{ fontSize: '0.75rem', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={signupLoading}
                  style={{ fontWeight: 800, fontSize: '0.75rem', padding: '0.55rem 1.25rem' }}
                >
                  {signupLoading ? 'Registering Account...' : '✓ Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
