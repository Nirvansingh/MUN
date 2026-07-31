export default function Loading() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        background: 'var(--bg-main)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '4px solid var(--border-color)',
          borderTopColor: 'var(--accent-blue)',
          animation: 'munSpin 0.9s linear infinite',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '15px' }}>
        <span>🌐</span>
        <span>Loading MUN Research Hub…</span>
      </div>
      <style>{`@keyframes munSpin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
