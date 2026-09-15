import LiveExamManager from '../../components/LiveExamManager';
import { useAuth } from '../../hooks/useAuth';

export default function ExamControlPage() {
  const { role } = useAuth();

  return (
    <div className="animate-fade-in" id="exam-control-page">
      <LiveExamManager userRole={role || 'tpo'} initialTab="manager" />
    </div>
  );
}
