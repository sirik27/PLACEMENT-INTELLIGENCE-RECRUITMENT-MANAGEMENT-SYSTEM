import LiveExamManager from '../../components/LiveExamManager';
import { useAuth } from '../../hooks/useAuth';

export default function InterviewsPage() {
  const { role } = useAuth();

  return (
    <div className="animate-fade-in" id="interviews-page">
      <div className="page-header mb-6">
        <h1>Round 3 AI <span className="text-gradient">Interview Scheduler</span></h1>
        <p>Schedule automated 1-on-1 AI proctored technical & HR interview rooms with automated time slotting</p>
      </div>

      <LiveExamManager userRole={role || 'tpo'} initialTab="interview" />
    </div>
  );
}
