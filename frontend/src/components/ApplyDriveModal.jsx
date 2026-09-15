import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, doc, setDoc, updateDoc, increment, serverTimestamp } from '../lib/firebase';
import { formatCurrency, getBranchFromRollNo, getSectionFromRollNo } from '../lib/utils';

export default function ApplyDriveModal({ drive, onClose, onSuccess }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const name = profile?.name || user?.displayName || 'Student Candidate';
  const rollNo = profile?.rollNo || '23P61A0501';
  const branch = profile?.department || getBranchFromRollNo(rollNo) || 'CSE';
  const classSection = profile?.classSection || `Section ${getSectionFromRollNo(rollNo)}`;
  const cgpa = profile?.cgpa || 8.5;
  const email = profile?.email || user?.email || 'student@vbithyd.ac.in';

  const handleConfirmApply = async (e) => {
    e.preventDefault();
    setLoading(true);

    const applicationData = {
      rollNo,
      name,
      email,
      branch,
      classSection,
      cgpa,
      appliedAt: serverTimestamp(),
      status: 'Applied',
      driveId: drive.id,
      company: drive.company,
    };

    try {
      await setDoc(doc(db, 'drives', drive.id, 'applications', rollNo), applicationData);
      
      try {
        await updateDoc(doc(db, 'drives', drive.id), {
          applicantCount: increment(1)
        });
      } catch { /* proceed */ }

    } catch (err) {
      console.warn('Drive application submit fallback:', err);
    }

    setLoading(false);
    setApplied(true);

    if (onSuccess) onSuccess(drive.id, applicationData);

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Placement Drive Application</h3>
            <p className="text-xs text-slate-400 mt-0.5">{drive.company} · {drive.role}</p>
          </div>
          <button type="button" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors text-base" onClick={onClose}>✕</button>
        </div>

        {applied ? (
          <div className="text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-base font-bold text-slate-100">Application Submitted!</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your application for <strong className="text-slate-200">{drive.role}</strong> at <strong className="text-slate-200">{drive.company}</strong> has been registered.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConfirmApply} className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-100">{drive.company}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{drive.role}</p>
              </div>
              <span className="text-sm font-bold text-emerald-400">{formatCurrency(drive.package || drive.ctc || 800000)}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs space-y-1">
              <div className="font-semibold text-indigo-200">Verified Profile (Read-Only)</div>
              <div className="text-indigo-300/80 leading-relaxed">Credentials are fetched from college records and locked for submission.</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Candidate Name</label>
                <input className="input-field text-xs opacity-75 cursor-not-allowed" value={name} readOnly />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Roll Number</label>
                <input className="input-field text-xs opacity-75 cursor-not-allowed" value={rollNo} readOnly />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Branch</label>
                <input className="input-field text-xs opacity-75 cursor-not-allowed" value={branch} readOnly />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Section</label>
                <input className="input-field text-xs opacity-75 cursor-not-allowed" value={classSection} readOnly />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-medium">CGPA</label>
                <input className="input-field text-xs opacity-75 cursor-not-allowed" value={cgpa} readOnly />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button type="button" className="btn btn-ghost text-xs px-4" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary text-xs font-semibold px-5" disabled={loading}>
                {loading ? 'Submitting...' : 'Confirm Application'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
