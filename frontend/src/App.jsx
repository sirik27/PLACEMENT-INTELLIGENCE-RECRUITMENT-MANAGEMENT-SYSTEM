import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import AuthGuard from './components/AuthGuard';
import LoadingSpinner from './components/LoadingSpinner';

/* ── Pages (lazy would be nice, but let's keep it simple) ── */
import Login from './pages/Login';
import StudentDashboard from './pages/student/Dashboard';
import StudentPassport from './pages/student/Passport';
import StudentCredentials from './pages/student/Credentials';
import StudentReadiness from './pages/student/Readiness';
import StudentSkillGap from './pages/student/SkillGap';
import StudentJobs from './pages/student/Jobs';
import StudentPredictions from './pages/student/Predictions';
import StudentOffers from './pages/student/Offers';
import StudentLearningPlan from './pages/student/LearningPlan';
import StudentSettings from './pages/student/Settings';
import StudentNotifications from './pages/student/Notifications';
import TPODashboard from './pages/tpo/Dashboard';
import TPOStudents from './pages/tpo/Students';
import TPOAppliedStudents from './pages/tpo/AppliedStudents';
import TPONotifications from './pages/tpo/Notifications';
import TPORecruiters from './pages/tpo/Recruiters';
import TPOAnalytics from './pages/tpo/Analytics';
import TPOSimulator from './pages/tpo/Simulator';
import TPOTrends from './pages/tpo/Trends';
import ExamControlPage from './pages/tpo/ExamControlPage';
import ExamResultsPage from './pages/tpo/ExamResultsPage';
import InterviewsPage from './pages/tpo/InterviewsPage';
import RecruiterDashboard from './pages/recruiter/Dashboard';
import ExamAptitude from './pages/exam/Aptitude';
import ExamTechnical from './pages/exam/Technical';
import InterviewRoom from './pages/interview/InterviewRoom';

/** Layout shell — sidebar + outlet */
function AppShell() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen text="Initialising PlaceSmart…" />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Student shell */}
        <Route element={<AuthGuard allowedRoles={['student']}><AppShell /></AuthGuard>}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/passport" element={<StudentPassport />} />
          <Route path="/student/credentials" element={<StudentCredentials />} />
          <Route path="/student/readiness" element={<StudentReadiness />} />
          <Route path="/student/skills" element={<StudentSkillGap />} />
          <Route path="/student/jobs" element={<StudentJobs />} />
          <Route path="/student/predictions" element={<StudentPredictions />} />
          <Route path="/student/offers" element={<StudentOffers />} />
          <Route path="/student/learning" element={<StudentLearningPlan />} />
          <Route path="/student/notifications" element={<StudentNotifications />} />
          <Route path="/student/settings" element={<StudentSettings />} />
        </Route>

        {/* TPO shell */}
        <Route element={<AuthGuard allowedRoles={['tpo']}><AppShell /></AuthGuard>}>
          <Route path="/tpo" element={<TPODashboard />} />
          <Route path="/tpo/students" element={<TPOStudents />} />
          <Route path="/tpo/applications" element={<TPOAppliedStudents />} />
          <Route path="/tpo/exams" element={<ExamControlPage />} />
          <Route path="/tpo/exam-results" element={<ExamResultsPage />} />
          <Route path="/tpo/interviews" element={<InterviewsPage />} />
          <Route path="/tpo/notifications" element={<TPONotifications />} />
          <Route path="/tpo/recruiters" element={<TPORecruiters />} />
          <Route path="/tpo/analytics" element={<TPOAnalytics />} />
          <Route path="/tpo/simulator" element={<TPOSimulator />} />
          <Route path="/tpo/trends" element={<TPOTrends />} />
        </Route>

        {/* Recruiter shell */}
        <Route element={<AuthGuard allowedRoles={['recruiter']}><AppShell /></AuthGuard>}>
          <Route path="/recruiter" element={<RecruiterDashboard />} />
          <Route path="/recruiter/exams" element={<ExamControlPage />} />
          <Route path="/recruiter/exam-results" element={<ExamResultsPage />} />
          <Route path="/recruiter/interviews" element={<InterviewsPage />} />
        </Route>

        {/* Shared proctored exam (student only) */}
        <Route path="/exam/aptitude" element={<AuthGuard allowedRoles={['student']}><ExamAptitude /></AuthGuard>} />
        <Route path="/exam/technical" element={<AuthGuard allowedRoles={['student']}><ExamTechnical /></AuthGuard>} />

        {/* Interview room (multi-role) */}
        <Route path="/interview/:id" element={<AuthGuard allowedRoles={['student', 'recruiter', 'tpo']}><AppShell /></AuthGuard>}>
          <Route index element={<InterviewRoom />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
