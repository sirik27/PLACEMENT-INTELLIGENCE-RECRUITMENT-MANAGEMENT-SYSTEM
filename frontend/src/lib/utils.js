/* ── Formatting ───────────────────────────────── */
export const formatDate = (date) => {
  if (!date) return '—';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || amount === '') return '₹0';
  let val = amount;
  if (typeof val === 'string') {
    const match = val.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (match) {
      val = parseFloat(match[1]);
    } else {
      val = Number(val);
    }
  } else {
    val = Number(val);
  }
  if (isNaN(val)) return '₹0';
  if (val > 0 && val <= 100) {
    val = val * 100000;
  } else if (val >= 5000000) {
    // Correct mis-parsed 9500000 (95 * 100000) down to 950000 (9.5 Lakhs)
    val = val / 10;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(val);
};

export const formatPercentage = (value, decimals = 1) =>
  `${(value * 100).toFixed(decimals)}%`;

/* ── Roll Number Parsing (VBITHyd) ────────────── */
const BRANCH_CODES = {
  '01': 'CIVIL', '02': 'EEE', '03': 'MECH',
  '04': 'ECE', '05': 'CSE', '67': 'DS',
};

export const parseRollNumber = (rollNo) => {
  const m = rollNo?.match(/^(\d{2})P6([15])A(\d{2})(\d{2})$/i);
  if (!m) return null;
  return {
    year: `20${m[1]}`,
    type: m[2] === '1' ? 'Regular' : 'Lateral',
    branch: BRANCH_CODES[m[3]] || 'Unknown',
    number: parseInt(m[4], 10),
  };
};

export const getBranchFromRollNo = (rollNo) =>
  parseRollNumber(rollNo)?.branch || 'Unknown';

export const getSectionFromRollNo = (rollNo) => {
  const p = parseRollNumber(rollNo);
  if (!p) return '?';
  const sectionsCount = p.branch === 'CSE' ? 6 : 3;
  return String.fromCharCode(65 + ((p.number - 1) % sectionsCount));
};

/* ── Colors ───────────────────────────────────── */
export const getReadinessColor = (score) => {
  if (score >= 0.8) return 'var(--success-500)';
  if (score >= 0.6) return 'var(--accent-500)';
  if (score >= 0.4) return 'var(--warning-500)';
  return 'var(--error-500)';
};

export const getStatusColor = (status) => ({
  placed: 'var(--success-500)', selected: 'var(--success-400)',
  shortlisted: 'var(--accent-500)', applied: 'var(--primary-400)',
  rejected: 'var(--error-500)', pending: 'var(--warning-500)',
  active: 'var(--success-500)', closed: 'var(--gray-500)',
})[status?.toLowerCase()] || 'var(--gray-400)';

/* ── Helpers ──────────────────────────────────── */
export const debounce = (fn, delay = 300) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delay); };
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const getInitials = (name) =>
  name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

export const capitalize = (s) =>
  s?.replace(/\b\w/g, c => c.toUpperCase()) || '';

export const truncate = (s, n = 50) =>
  s?.length > n ? `${s.slice(0, n)}…` : s || '';

export const downloadCSV = (data, filename) => {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};
