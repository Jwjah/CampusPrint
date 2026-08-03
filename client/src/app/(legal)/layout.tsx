'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          padding: 'calc(16px + env(safe-area-inset-top, 0px)) 24px 16px 24px',
          background: 'rgba(5, 5, 16, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo size={40} />
          </Link>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/login">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-ghost">
                Log In
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.nav>

      <main style={{ flex: 1, paddingTop: 120, paddingBottom: 60, maxWidth: 800, margin: '0 auto', width: '100%', paddingLeft: 24, paddingRight: 24 }}>
        {children}
      </main>

      <footer style={{
        padding: '40px 24px', borderTop: '1px solid var(--border)',
        textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
          <Link href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/refunds" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Refund Policy</Link>
          <Link href="/payout-policy" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Payout Policy</Link>
          <Link href="/copyright" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Copyright Policy</Link>
          <Link href="/contact" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact Us</Link>
        </div>
        <p>© 2024 CampusPrint. Built with ❤️ for campus communities.</p>
      </footer>
    </div>
  );
}
