'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console for debugging.
    console.error('MUN Research Hub error:', error);
  }, [error]);

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
      <div style={{ fontSize: '56px', lineHeight: 1 }}>⚠️</div>
      <h1 style={{ fontSize: '26px', color: 'var(--text-heading)', margin: 0 }}>Something went wrong</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: 0 }}>
        An unexpected error occurred while loading this page. You can try again below.
      </p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            background: 'var(--accent-blue)',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          🔄 Try Again
        </button>
        <Link
          href="/"
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            background: 'var(--bg-input)',
            color: 'var(--text-heading)',
            border: '1px solid var(--border-color)',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
