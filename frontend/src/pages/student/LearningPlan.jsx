import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db, doc, updateDoc } from '../../lib/firebase';

const JOB_ROLES = {
  'full-stack': {
    title: 'Full Stack Web Developer',
    description: 'Master frontend UI frameworks, scalable backend APIs, database management, and cloud deployment.',
    milestones: [
      {
        id: 'fs-1',
        title: 'Modern Frontend Mastery: React & Tailwind CSS',
        duration: '2 Weeks · 14 Hours',
        summary: 'Deep dive into component architecture, state management, hooks, and dynamic styling.',
        topics: ['React JSX & Hooks (useState, useEffect)', 'Component Architecture & Props', 'State Management & Context API'],
        project: 'Build a responsive SaaS Analytics Dashboard with real-time charts.',
        resource: 'Meta Front-End Developer Certificate',
      },
      {
        id: 'fs-2',
        title: 'Backend Engineering: Node.js & REST API Architecture',
        duration: '3 Weeks · 18 Hours',
        summary: 'Architect scalable web services, JWT authentication, and API security.',
        topics: ['Node.js Event Loop & Async I/O', 'Express Router & Middleware Design', 'JWT Authentication & Security'],
        project: 'Create a secure multi-role User Authentication API microservice.',
        resource: 'Node.js Backend Masterclass',
      },
      {
        id: 'fs-3',
        title: 'Database Architecture: PostgreSQL & MongoDB Design',
        duration: '2 Weeks · 12 Hours',
        summary: 'Learn SQL relational schema design, indexing, ORMs, and query optimization.',
        topics: ['Relational vs NoSQL Schema Design', 'SQL Joins, Indexing & Aggregations', 'Prisma & Mongoose ORM'],
        project: 'Design an E-Commerce Database schema with transactional consistency.',
        resource: 'PostgreSQL Tutorial & MongoDB University',
      },
    ],
  },
  'data-science': {
    title: 'Data Scientist & AI / ML Engineer',
    description: 'Transform raw data into actionable intelligence using Python, Scikit-Learn, and Deep Learning.',
    milestones: [
      {
        id: 'ds-1',
        title: 'Data Wrangling & Exploratory Analysis',
        duration: '2 Weeks · 15 Hours',
        summary: 'Master data cleaning, feature engineering, and statistical data visualization.',
        topics: ['NumPy & Pandas DataFrames', 'Handling Missing Values & Outliers', 'Matplotlib & Seaborn Data Visualization'],
        project: 'Analyze a 500k-row global sales dataset and present key trends.',
        resource: 'Applied Data Science Specialization',
      },
      {
        id: 'ds-2',
        title: 'Applied Machine Learning: Supervised & Unsupervised Models',
        duration: '3 Weeks · 22 Hours',
        summary: 'Implement regression, classification algorithms, decision trees, and clustering.',
        topics: ['Linear & Logistic Regression', 'Decision Trees & XGBoost Classifier', 'Cross-Validation & Hyperparameter Tuning'],
        project: 'Build a Customer Churn Prediction Model with 92%+ accuracy.',
        resource: 'Scikit-Learn Official Guides',
      },
    ],
  },
};

export default function StudentLearningPlan() {
  const { user, profile } = useAuth();
  const [selectedRoleKey, setSelectedRoleKey] = useState('full-stack');
  const [completedIds, setCompletedIds] = useState([]);
  const [activeModalCourse, setActiveModalCourse] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.preferredRole && JOB_ROLES[profile.preferredRole]) {
      setSelectedRoleKey(profile.preferredRole);
    }
    if (profile?.completedMilestones && Array.isArray(profile.completedMilestones)) {
      setCompletedIds(profile.completedMilestones);
    }
  }, [profile]);

  const activeRole = JOB_ROLES[selectedRoleKey] || JOB_ROLES['full-stack'];
  const milestones = activeRole.milestones;

  const handleRoleChange = async (roleKey) => {
    setSelectedRoleKey(roleKey);
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        preferredRole: roleKey,
      });
    } catch (err) {
      console.error('Failed to update preferred role:', err);
    }
    setSaving(false);
  };

  const toggleMilestone = async (id, e) => {
    if (e) e.stopPropagation();
    const newCompleted = completedIds.includes(id)
      ? completedIds.filter(x => x !== id)
      : [...completedIds, id];

    setCompletedIds(newCompleted);

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          completedMilestones: newCompleted,
        });
      } catch (err) {
        console.error('Failed to update completed milestones:', err);
      }
    }
  };

  const completedCount = milestones.filter(m => completedIds.includes(m.id)).length;
  const progressPercent = Math.round((completedCount / milestones.length) * 100);

  return (
    <div className="animate-fade-in space-y-6" id="student-learning-plan">
      {/* Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <svg style={{ width: 20, height: 20, minWidth: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="flex items-center gap-2">
                Career Roadmap & <span className="text-gradient">Learning Plan</span>
              </h1>
              <p className="text-xs text-muted mt-0.5">Customized career track milestones, project assignments, and topic progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Selection Track */}
      <div className="glass-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2">
            <svg style={{ width: 20, height: 20, minWidth: 20 }} className="text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Target Career Role Track
          </h3>
          {saving && <span className="text-xs font-mono text-indigo-400">Saving track...</span>}
        </div>

        <div className="grid grid-2 gap-4">
          {Object.entries(JOB_ROLES).map(([key, roleData]) => (
            <div
              key={key}
              onClick={() => handleRoleChange(key)}
              className="glass-card cursor-pointer flex flex-col justify-between"
              style={{
                padding: '1.25rem',
                borderColor: selectedRoleKey === key ? 'var(--primary-500)' : 'var(--border-default)',
                background: selectedRoleKey === key ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-card)',
              }}
            >
              <div>
                <strong style={{ fontSize: '1rem', color: 'var(--text-bright)', display: 'block', marginBottom: '0.25rem' }}>{roleData.title}</strong>
                <p className="text-xs text-muted mb-4">{roleData.description}</p>
              </div>
              <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                <span className="badge badge-primary">
                  {selectedRoleKey === key ? '✓ Active Track' : 'Switch Track'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones Roadmap */}
      <div className="glass-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3>{activeRole.title} — Roadmap Progress</h3>
            <p className="text-xs text-muted">Click any milestone card to inspect syllabus and assigned capstone projects</p>
          </div>
          <span className="badge badge-primary font-mono">
            {completedCount} of {milestones.length} Completed ({progressPercent}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar mb-6" style={{ height: 10 }}>
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%`, background: 'var(--gradient-primary)' }}
          />
        </div>

        {/* Timeline list */}
        <div className="flex flex-col gap-3">
          {milestones.map((m, idx) => {
            const isDone = completedIds.includes(m.id);
            return (
              <div
                key={m.id}
                onClick={() => setActiveModalCourse(m)}
                className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                style={{
                  background: isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(2, 6, 23, 0.5)',
                  border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-default)'}`
                }}
              >
                <div className="flex items-start gap-4" style={{ flex: 1 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    minWidth: 32,
                    borderRadius: 'var(--radius-md)',
                    background: isDone ? 'var(--success-500)' : 'rgba(99, 102, 241, 0.2)',
                    color: isDone ? '#fff' : 'var(--primary-300)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.8125rem'
                  }}>
                    {isDone ? '✓' : idx + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <strong style={{ fontSize: '0.9375rem', color: isDone ? 'var(--success-400)' : 'var(--text-bright)' }}>
                        {m.title}
                      </strong>
                      <span className="badge badge-outline text-xs font-mono">
                        {m.duration}
                      </span>
                    </div>
                    <p className="text-xs text-muted">{m.summary}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => toggleMilestone(m.id, e)}
                  className={`btn ${isDone ? 'btn-success' : 'btn-primary'} btn-xs`}
                >
                  {isDone ? '✓ Completed' : 'Mark Done'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {activeModalCourse && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <h3 className="mb-2">{activeModalCourse.title}</h3>
            <p className="text-xs text-muted mb-4">{activeModalCourse.summary}</p>

            <div className="space-y-4 mb-6">
              <div>
                <span className="section-overline block mb-2">Key Topics Covered</span>
                <div className="flex flex-col gap-1.5">
                  {activeModalCourse.topics.map((t, i) => (
                    <div key={i} className="text-xs text-slate-300 flex items-center gap-2">
                      <span className="text-indigo-400">▸</span> {t}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="section-overline block mb-1">Capstone Hands-On Project</span>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
                  {activeModalCourse.project}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                className={`btn ${completedIds.includes(activeModalCourse.id) ? 'btn-success' : 'btn-primary'} btn-sm`}
                onClick={(e) => toggleMilestone(activeModalCourse.id, e)}
              >
                {completedIds.includes(activeModalCourse.id) ? '✓ Completed' : 'Mark Done'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActiveModalCourse(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
