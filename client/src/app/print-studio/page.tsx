'use client';

import { useRouter } from 'next/navigation';

export default function PrintStudioPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-root)', padding: 24
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 440, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>🛠️</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: 'white' }}>Coming Soon</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Our PDF editing tools are currently being improved to provide a better editing experience. This feature will be available in a future update.
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => router.push('/student/new-order')}>
          OK
        </button>
      </div>
    </div>
  );
}
