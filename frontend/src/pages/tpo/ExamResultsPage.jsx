import LiveExamManager from '../../components/LiveExamManager';
import { useAuth } from '../../hooks/useAuth';

export default function ExamResultsPage() {
  const { role } = useAuth();

  return (
    <div className="animate-fade-in" id="exam-results-page">
      <div className="page-header mb-6">
        <h1>Exam Evaluation <span className="text-gradient">& Export Results</span></h1>
        <p>Review student proctored exam scores recorded in real-time Cloud Firestore and export CSV/Excel or PDF reports</p>
      </div>

      <LiveExamManager userRole={role || 'tpo'} initialTab="results" />
    </div>
  );
}
