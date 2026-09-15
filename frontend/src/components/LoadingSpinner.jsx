export default function LoadingSpinner({ fullScreen = false, text = '' }) {
  return (
    <div
      className={fullScreen ? 'flex items-center justify-center' : 'flex items-center justify-center p-6'}
      style={fullScreen ? { position: 'fixed', inset: 0, background: 'var(--bg-primary)', zIndex: 9999, flexDirection: 'column', gap: '1.25rem' } : { flexDirection: 'column', gap: '1rem' }}
    >
      <div
        style={{
          width: 44, height: 44,
          border: '3px solid var(--slate-800)',
          borderTopColor: 'var(--primary-500)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      {text && <p className="text-sm text-muted" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>{text}</p>}
    </div>
  );
}
