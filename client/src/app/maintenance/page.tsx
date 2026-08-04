'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiOutlineRefresh, HiOutlineShieldCheck, HiOutlineSparkles } from 'react-icons/hi';
import api from '@/lib/api';

export default function MaintenancePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const checkStatus = async () => {
    setChecking(true);
    setStatusMsg('');
    try {
      // Try an auth endpoint or me request to check if system is back online
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        setStatusMsg('System is online! Redirecting...');
        setTimeout(() => {
          router.push(res.data.user.role === 'admin' ? '/admin' : '/student');
        }, 1000);
        return;
      }
    } catch (err: any) {
      if (err.response?.status === 503) {
        setStatusMsg('Maintenance is still in progress. Please check again in a moment.');
      } else {
        setStatusMsg('System status checked.');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 30%, #1e1b4b 0%, #09090b 100%)',
      color: '#fff',
      padding: 24,
      textAlign: 'center',
    }}>
      {/* Background Decorator */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 300,
        height: 300,
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />

      <div className="glass-card" style={{
        width: '100%',
        maxWidth: 480,
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        backdropFilter: 'blur(12px)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Branding Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 24,
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: -0.5,
          color: '#fff',
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
          }}>
            <HiOutlineSparkles size={24} color="#fff" />
          </div>
          <span>CampusPrint</span>
        </div>

        {/* Maintenance Icon */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          marginBottom: 20,
          color: '#818cf8',
        }}>
          🛠️
        </div>

        {/* Title & Description */}
        <h1 style={{
          fontSize: 26,
          fontWeight: 800,
          marginBottom: 12,
          color: '#fff',
          letterSpacing: '-0.02em',
        }}>
          CampusPrint is Under Maintenance
        </h1>

        <p style={{
          fontSize: 15,
          color: 'var(--text-secondary, #9ca3af)',
          lineHeight: 1.6,
          marginBottom: 28,
        }}>
          We’re performing scheduled maintenance to improve your experience.
          <br />
          Please check back in a few minutes.
        </p>

        {/* Status indicator badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          padding: '6px 14px',
          borderRadius: 20,
          fontSize: 13,
          color: '#fde047',
          marginBottom: 28,
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#eab308',
            display: 'inline-block',
            animation: 'pulse 2s infinite',
          }} />
          Scheduled Upgrade in Progress
        </div>

        {/* Feedback status message */}
        {statusMsg && (
          <div style={{
            fontSize: 13,
            color: '#818cf8',
            marginBottom: 20,
            padding: '8px 14px',
            borderRadius: 8,
            background: 'rgba(99, 102, 241, 0.1)',
            width: '100%',
          }}>
            {statusMsg}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={checkStatus}
          disabled={checking}
          className="btn btn-primary btn-lg"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '14px 24px',
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 12,
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
          }}
        >
          <HiOutlineRefresh size={20} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Checking Status...' : 'Refresh Status'}
        </button>

        {/* Footer info */}
        <div style={{
          marginTop: 32,
          fontSize: 12,
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <HiOutlineShieldCheck size={16} />
          Your document security & user data remain 100% safe.
        </div>
      </div>
    </div>
  );
}
