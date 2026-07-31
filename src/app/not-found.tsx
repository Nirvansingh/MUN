import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        background: 'var(--bg-main)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family)',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <div style={{ fontSize: '56px', lineHeight: 1 }}>🌐</div>
      <h1 style={{ fontSize: '28px', color: 'var(--text-heading)', margin: 0 }}>404 — Page Not Found</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: 0 }}>
        The page you&apos;re looking for doesn&apos;t exist, or the research file may have been moved.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '8px',
          padding: '10px 20px',
          borderRadius: '8px',
          background: 'var(--accent-blue)',
          color: '#ffffff',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '14px',
        }}
      >
        ← Back to Home
      </Link>
    </main>
  );
}
