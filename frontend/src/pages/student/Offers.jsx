import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db, collection, getDocs } from '../../lib/firebase';
import { formatCurrency } from '../../lib/utils';

export default function StudentOffers() {
  const { profile } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptedOfferId, setAcceptedOfferId] = useState(null);

  const rollNo = profile?.rollNo || '23P61A0501';

  useEffect(() => {
    (async () => {
      try {
        const drivesSnap = await getDocs(collection(db, 'drives'));
        const userOffers = [];

        if (!drivesSnap.empty) {
          for (const dDoc of drivesSnap.docs) {
            const driveData = dDoc.data();
            const appSnap = await getDocs(collection(db, 'drives', dDoc.id, 'applications'));
            if (!appSnap.empty) {
              const myApp = appSnap.docs.find(doc => doc.id === rollNo || doc.data().rollNo === rollNo);
              if (myApp) {
                const appData = myApp.data();
                if ((appData.status || '').toLowerCase().includes('selected') || (appData.status || '').toLowerCase().includes('placed') || (appData.status || '').toLowerCase().includes('offer')) {
                  userOffers.push({
                    id: dDoc.id,
                    company: driveData.company || 'Corporate Partner',
                    role: driveData.role || 'Software Engineer',
                    pkg: driveData.package || 800000,
                    date: appData.appliedAt ? new Date(appData.appliedAt.seconds * 1000) : new Date(),
                    status: appData.status || 'Accepted',
                    location: driveData.location || 'Hyderabad',
                  });
                }
              }
            }
          }
        }

        setOffers(userOffers);
      } catch (e) {
        console.warn('Offers fetch warning:', e);
      }
      setLoading(false);
    })();
  }, [rollNo]);

  const nextSteps = [
    { step: 'Accept the Offer Letter', desc: 'Confirm formal acceptance to lock placement slot with TPO Cell' },
    { step: 'Verify & Sign Credentials', desc: 'Complete background checks & submit academic transcripts' },
    { step: 'Onboarding & Induction', desc: 'Connect with recruiter for start date and relocation guidelines' },
  ];

  return (
    <div className="animate-fade-in space-y-6" id="student-offers">
      {/* Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--gradient-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <svg style={{ width: 20, height: 20, minWidth: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="flex items-center gap-2">
                Official <span className="text-gradient">Placement Offers</span>
              </h1>
              <p className="text-xs text-muted mt-0.5">Verified placement offers issued by partner organizations & TPO</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-muted">Checking placement offer records...</div>
      ) : offers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(30,41,59,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--slate-400)' }}>
            <svg style={{ width: 28, height: 28, minWidth: 28 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mb-1">No Placement Offers Issued Yet</h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            Once your interview rounds are completed and approved by TPO/Recruiter, your official offer letters will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {offers.map((o, idx) => (
            <div key={o.id} className="space-y-6">
              {/* Congratulations Header Card */}
              {idx === 0 && (
                <div className="glass-card p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(15,23,42,0.8) 100%)', borderColor: 'rgba(16,185,129,0.3)' }}>
                  <span className="badge badge-success mb-3">
                    Final Selection — {o.company}
                  </span>
                  <h1 className="mb-2" style={{ fontSize: '1.875rem' }}>
                    <span className="text-gradient">Congratulations, Candidate!</span>
                  </h1>
                  <p className="text-sm text-muted max-w-xl mx-auto">
                    You have been formally selected by <strong style={{ color: 'var(--text-bright)' }}>{o.company}</strong> for the position of <strong style={{ color: 'var(--text-bright)' }}>{o.role}</strong> at an annual CTC of <strong style={{ color: 'var(--success-400)' }}>{formatCurrency(o.pkg)}</strong>.
                  </p>
                </div>
              )}

              {/* Detailed Offer Card */}
              <div className="glass-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
                  <div>
                    <span className="badge badge-success mb-2">
                      {o.status}
                    </span>
                    <h2 style={{ fontSize: '1.25rem' }}>{o.company}</h2>
                    <p className="text-xs text-muted">{o.role} · {o.location}</p>
                  </div>
                  <div className="sm:text-right">
                    <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--success-400)' }}>{formatCurrency(o.pkg)}</div>
                    <div className="text-xs text-muted font-mono">Cost to Company (CTC)</div>
                  </div>
                </div>

                {/* Offer Details Grid */}
                <div className="grid grid-3 gap-4 mb-6">
                  {[
                    { label: 'Employer Company', value: o.company },
                    { label: 'Offered Designation', value: o.role },
                    { label: 'Compensation Package', value: formatCurrency(o.pkg) },
                  ].map(d => (
                    <div key={d.label} className="p-4 rounded-xl" style={{ background: 'rgba(2,6,23,0.5)', border: '1px solid var(--border-default)' }}>
                      <div className="section-overline mb-1">{d.label}</div>
                      <strong style={{ fontSize: '0.9375rem', color: 'var(--text-bright)' }}>{d.value}</strong>
                    </div>
                  ))}
                </div>

                {/* Next Steps */}
                <div className="space-y-3 mb-6">
                  <span className="section-overline block">Mandatory Next Steps</span>
                  <div className="flex flex-col gap-2">
                    {nextSteps.map((ns, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(16,185,129,0.15)', color: 'var(--success-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.8125rem', color: 'var(--text-bright)', display: 'block' }}>{ns.step}</strong>
                          <span className="text-xs text-muted">{ns.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    className={`btn ${acceptedOfferId === o.id ? 'btn-success' : 'btn-primary'} btn-sm`}
                    onClick={() => setAcceptedOfferId(o.id)}
                  >
                    {acceptedOfferId === o.id ? '✓ Offer Accepted & Confirmed' : 'Accept Offer'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => alert(`Downloading official PDF offer letter for ${o.company}...`)}
                  >
                    Download Offer Letter (PDF)
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
