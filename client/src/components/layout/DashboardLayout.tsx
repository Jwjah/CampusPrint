'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PulseDot, NotificationBadge } from '@/components/animations';
import Logo from '@/components/ui/Logo';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  HiOutlineHome, HiOutlineDocumentText, HiOutlineCog, HiOutlineLogout,
  HiOutlineBell, HiOutlineMenu, HiOutlineX, HiOutlineChartBar,
  HiOutlineUserGroup, HiOutlineShoppingBag, HiOutlineTruck,
  HiOutlineCurrencyDollar, HiOutlineLocationMarker, HiOutlineQrcode,
  HiOutlineClock, HiOutlineCash,
} from 'react-icons/hi';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

const roleNavItems: Record<string, NavItem[]> = {
  student: [
    { href: '/student', icon: <HiOutlineHome size={20} />, label: 'Dashboard' },
    { href: '/student/new-order', icon: <HiOutlineDocumentText size={20} />, label: 'New Order' },
    { href: '/student/orders', icon: <HiOutlineShoppingBag size={20} />, label: 'My Orders' },
    { href: '/student/notifications', icon: <HiOutlineBell size={20} />, label: 'Notifications' },
    { href: '/student/settings', icon: <HiOutlineCog size={20} />, label: 'Settings' },
  ],
  shop: [
    { href: '/shop', icon: <HiOutlineHome size={20} />, label: 'Dashboard' },
    { href: '/shop/queue', icon: <HiOutlineDocumentText size={20} />, label: 'Print Queue' },
    { href: '/shop/history', icon: <HiOutlineClock size={20} />, label: 'History' },
    { href: '/shop/wallet', icon: <HiOutlineCurrencyDollar size={20} />, label: 'Wallet' },
    { href: '/shop/notifications', icon: <HiOutlineBell size={20} />, label: 'Notifications' },
    { href: '/shop/settings', icon: <HiOutlineCog size={20} />, label: 'Settings' },
  ],
  agent: [
    { href: '/agent', icon: <HiOutlineHome size={20} />, label: 'Dashboard' },
    { href: '/agent/radar', icon: <HiOutlineLocationMarker size={20} />, label: 'Gig Radar' },
    { href: '/agent/missions', icon: <HiOutlineTruck size={20} />, label: 'Missions' },
    { href: '/agent/history', icon: <HiOutlineClock size={20} />, label: 'History' },
    { href: '/agent/scanner', icon: <HiOutlineQrcode size={20} />, label: 'QR Scanner' },
    { href: '/agent/earnings', icon: <HiOutlineCurrencyDollar size={20} />, label: 'Earnings' },
    { href: '/agent/notifications', icon: <HiOutlineBell size={20} />, label: 'Notifications' },
    { href: '/agent/settings', icon: <HiOutlineCog size={20} />, label: 'Settings' },
  ],
  admin: [
    { href: '/admin', icon: <HiOutlineChartBar size={20} />, label: 'Analytics' },
    { href: '/admin/users', icon: <HiOutlineUserGroup size={20} />, label: 'Users' },
    { href: '/admin/shops', icon: <HiOutlineShoppingBag size={20} />, label: 'Shops' },
    { href: '/admin/orders', icon: <HiOutlineDocumentText size={20} />, label: 'Orders' },
    { href: '/admin/withdrawals', icon: <HiOutlineCash size={20} />, label: 'Withdrawals' },
    { href: '/admin/notifications', icon: <HiOutlineBell size={20} />, label: 'Notifications' },
    { href: '/admin/danger', icon: <HiOutlineCog size={20} />, label: 'Danger Zone' },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loadUser, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const dismissed = sessionStorage.getItem('dismissed-notification-banner') === 'true';
      if (Notification.permission === 'default' && !dismissed) {
        setShowNotificationPrompt(true);
      }
    }
  }, []);

  const enableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setShowNotificationPrompt(false);
        window.dispatchEvent(new Event('subscribe-push'));
        toast.success('System notifications enabled successfully!');
      } else if (permission === 'denied') {
        setShowNotificationPrompt(false);
        toast.error('Notification permission denied. Please allow them in your browser settings.');
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
    }
  };

  const dismissNotificationPrompt = () => {
    setShowNotificationPrompt(false);
    sessionStorage.setItem('dismissed-notification-banner', 'true');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (!isStandalone) {
      setShowInstallBtn(true);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({ phone: '', hostel: '', room_number: '', acceptTerms: false });
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === 'student') {
      const modeKey = `campusprint_dashboard_mode_${user.id}`;
      // 1. Restrict access to /agent if not a delivery partner
      if (pathname.startsWith('/agent') && !user.is_delivery_partner) {
        router.replace('/student');
        return;
      }
      
      // 2. Initial mode restoration
      const savedMode = localStorage.getItem(modeKey);
      if (pathname === '/student' && savedMode === 'delivery' && user.is_delivery_partner) {
        router.replace('/agent');
        return;
      }
      
      // 3. Sync localStorage to current path
      if (pathname.startsWith('/agent')) {
        localStorage.setItem(modeKey, 'delivery');
      } else if (pathname.startsWith('/student')) {
        localStorage.setItem(modeKey, 'student');
      }
    }
  }, [user, pathname, router]);

  useEffect(() => {
    if (user) {
      setOnboardingForm({
        phone: user.phone || '',
        hostel: user.hostel || '',
        room_number: user.room_number || '',
        acceptTerms: false
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const fetchNotifs = () => {
        api.get('/admin/notifications').then(({ data }) => {
          setNotifCount(data.unread);
          setNotifications(data.notifications || []);
        }).catch(() => {});
        // Also refresh user data (including live agent status)
        loadUser();
      };
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 30000);
      return () => clearInterval(interval);
    }
  }, [user, pathname, loadUser]);

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingForm.acceptTerms) {
      toast.error('You must accept the Terms and Conditions.');
      return;
    }
    setOnboardingLoading(true);
    try {
      await api.post('/auth/register-agent', onboardingForm);
      toast.success('Successfully registered as a Delivery Partner!');
      api.post('/auth/audit', { event: 'DELIVERY_PARTNER_REGISTERED' }).catch(()=>{});
      await loadUser(); // Reload user to get updated is_delivery_partner flag
      setShowOnboarding(false);
      if (user) {
        localStorage.setItem(`campusprint_dashboard_mode_${user.id}`, 'delivery');
      }
      router.push('/agent'); // Switch to delivery mode immediately
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setOnboardingLoading(false);
    }
  };

  const isAgentRoute = pathname.startsWith('/agent');
  const displayRole = (user?.role === 'student' && isAgentRoute) ? 'agent' : user?.role;

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-root)' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}
        />
      </div>
    );
  }

  const navItems = roleNavItems[displayRole as keyof typeof roleNavItems] || [];
  const roleLabels: Record<string, string> = { student: '🎓 Student', shop: '🏪 Shop', agent: '🚴 Agent', admin: '⚡ Admin' };

  const handleLogout = () => {
    if (user) {
      localStorage.removeItem(`campusprint_dashboard_mode_${user.id}`);
    }
    logout();
    router.push('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-root)' }}>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isMobile ? (sidebarOpen ? 0 : -260) : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          width: 260, flexShrink: 0, position: 'fixed', top: 0, bottom: 0, left: 0,
          background: 'var(--bg-primary)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', zIndex: 50,
        }}
      >
        {/* Logo */}
        <div style={{
          padding: 'calc(24px + env(safe-area-inset-top, 0px)) 20px 24px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href={`/${displayRole}`} style={{ textDecoration: 'none' }}>
              <Logo size={32} />
            </Link>
            
            {showInstallBtn && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.dispatchEvent(new Event('trigger-pwa-install'))}
                className="btn btn-primary btn-sm"
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #3b82f6, #ec4899)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                  whiteSpace: 'nowrap',
                }}
              >
                📲 Install App
              </motion.button>
            )}
          </div>
          <button onClick={() => setSidebarOpen(false)} className="btn btn-ghost btn-icon mobile-only"
            style={{ padding: 4 }}>
            <HiOutlineX size={20} />
          </button>
        </div>

        {/* Role badge */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8,
            background: 'var(--primary-glow)', fontSize: 13, fontWeight: 600,
            color: 'var(--primary-light)',
          }}>
            <PulseDot /> {roleLabels[displayRole as keyof typeof roleLabels]}
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }} onClick={() => setSidebarOpen(false)}>
                <motion.div
                  whileHover={{ x: 4, backgroundColor: 'var(--bg-tertiary)' }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                    color: isActive ? 'var(--primary-light)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--primary-glow)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  }}
                >
                  {item.icon}
                  {item.label}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          {user.role === 'student' && (
            <div style={{ marginBottom: 16 }}>
              {user.is_delivery_partner ? (
                <>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Delivery Partner</div>
                    <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, color: user.delivery_agent_status === 'AVAILABLE' ? 'var(--success)' : 'var(--text-tertiary)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: user.delivery_agent_status === 'AVAILABLE' ? 'var(--success)' : 'currentColor' }} />
                      {user.delivery_agent_status === 'AVAILABLE' ? 'Available' : 'Offline'}
                    </div>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const newMode = isAgentRoute ? 'student' : 'agent';
                      if (user) {
                        localStorage.setItem(`campusprint_dashboard_mode_${user.id}`, newMode === 'agent' ? 'delivery' : 'student');
                      }
                      api.post('/auth/audit', { event: newMode === 'agent' ? 'MODE_SWITCHED_TO_DELIVERY' : 'MODE_SWITCHED_TO_STUDENT' }).catch(()=>{});
                      router.push(`/${newMode}`);
                      setSidebarOpen(false);
                    }}
                    className="btn btn-secondary" style={{ width: '100%', fontSize: 12, padding: '8px', justifyContent: 'center' }}
                  >
                    {isAgentRoute ? '🎓 Switch to Student Mode' : '🚴 Switch to Delivery Mode'}
                  </motion.button>
                </>
              ) : (
                <>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Delivery Partner</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Not Registered</div>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowOnboarding(true)}
                    className="btn btn-primary" style={{ width: '100%', fontSize: 12, padding: '8px', justifyContent: 'center' }}
                  >
                    🚴 Become a Delivery Partner
                  </motion.button>
                </>
              )}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.email}</div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 8, color: 'var(--error)', fontSize: 13 }}
          >
            <HiOutlineLogout size={18} /> Sign Out
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: isMobile ? 0 : 260, minHeight: '100vh', transition: 'margin-left 0.3s ease' }}>
        {/* Top bar */}
        <motion.header
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            position: 'sticky', top: 0, zIndex: 30,
            padding: 'calc(16px + env(safe-area-inset-top, 0px)) 24px 16px 24px',
            background: 'rgba(5, 5, 16, 0.8)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setSidebarOpen(true)} className="btn btn-ghost btn-icon mobile-only"
              style={{ padding: 4 }}>
              <HiOutlineMenu size={22} />
            </button>
            
            {showInstallBtn && isMobile && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.dispatchEvent(new Event('trigger-pwa-install'))}
                className="btn btn-primary btn-sm mobile-only"
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #3b82f6, #ec4899)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                  whiteSpace: 'nowrap',
                }}
              >
                📲 Install App
              </motion.button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div 
              style={{ position: 'relative' }}
              onMouseEnter={() => setShowNotifDropdown(true)}
              onMouseLeave={() => setShowNotifDropdown(false)}
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="btn btn-ghost btn-icon"
                onClick={() => router.push(`/${user.role}/notifications`)}
              >
                <HiOutlineBell size={20} />
                <NotificationBadge count={notifCount} />
              </motion.button>
              
              <AnimatePresence>
                {showNotifDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    style={{
                      position: 'absolute', right: 0, top: '100%', width: '300px',
                      background: 'rgba(5, 5, 16, 0.95)', backdropFilter: 'blur(10px)',
                      border: '1px solid var(--border)', borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)', padding: '12px', zIndex: 100,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>Notifications</span>
                      <span style={{ fontSize: '12px', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => router.push(`/${user.role}/notifications`)}>View All</span>
                    </div>
                    {notifications.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                        {notifications.slice(0, 5).map((n: any) => (
                          <div key={n.id} style={{ padding: '8px', background: n.is_read ? 'transparent' : 'rgba(210, 41, 75, 0.1)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{n.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{n.message}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)' }}>No recent notifications</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.header>

        {/* Page content */}
        <div style={{ padding: '24px' }}>
          <AnimatePresence>
            {showNotificationPrompt && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '16px 24px',
                  marginBottom: '24px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(236, 72, 153, 0.05))',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 15px rgba(99, 102, 241, 0.1)',
                  borderRadius: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
                  <span style={{ fontSize: '24px' }}>🔔</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                      Never miss a print job or update!
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                      Enable push notifications to get alerts when you close the app or switch tabs.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={enableNotifications}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #3b82f6, #ec4899)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    Enable Notifications
                  </button>
                  <button
                    onClick={dismissNotificationPrompt}
                    style={{
                      padding: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Onboarding Modal */}
          <AnimatePresence>
            {showOnboarding && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                  padding: 24,
                }}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="glass-card"
                  style={{ width: '100%', maxWidth: 480, padding: 32, maxHeight: '90vh', overflowY: 'auto' }}
                >
                  <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>🚴 Become a Delivery Partner</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
                    Deliver prints on campus and earn money. Please review the terms and complete any missing details below.
                  </p>

                  <form onSubmit={handleRegisterAgent} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {!user.phone && (
                      <div className="input-group">
                        <label>Phone Number <span style={{color:'var(--error)'}}>*</span></label>
                        <input className="input" type="tel" required placeholder="e.g. +91 9876543210"
                          value={onboardingForm.phone} onChange={(e) => setOnboardingForm({...onboardingForm, phone: e.target.value})} />
                      </div>
                    )}
                    
                    {(!user.hostel || !user.room_number) && (
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div className="input-group" style={{ flex: 1 }}>
                          <label>Hostel</label>
                          <input className="input" type="text" placeholder="e.g. Barak"
                            value={onboardingForm.hostel} onChange={(e) => setOnboardingForm({...onboardingForm, hostel: e.target.value})} />
                        </div>
                        <div className="input-group" style={{ flex: 1 }}>
                          <label>Room No.</label>
                          <input className="input" type="text" placeholder="e.g. 204"
                            value={onboardingForm.room_number} onChange={(e) => setOnboardingForm({...onboardingForm, room_number: e.target.value})} />
                        </div>
                      </div>
                    )}

                    <div style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, maxHeight: 150, overflowY: 'auto', marginBottom: 8 }}>
                      <strong>Terms and Conditions</strong><br/>
                      1. You agree to deliver prints securely and promptly to the designated locations.<br/>
                      2. You are responsible for verifying QR codes at pickup and dropoff.<br/>
                      3. Earnings will be credited to your wallet upon successful delivery verification.<br/>
                      4. Misuse of the platform or failure to deliver may result in suspension of your delivery partner privileges.
                    </div>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" style={{ marginTop: 2 }} required
                        checked={onboardingForm.acceptTerms} onChange={(e) => setOnboardingForm({...onboardingForm, acceptTerms: e.target.checked})} />
                      <span>I agree to the Terms and Conditions and understand my responsibilities as a delivery partner.</span>
                    </label>

                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowOnboarding(false)} style={{ flex: 1 }}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={onboardingLoading || !onboardingForm.acceptTerms} style={{ flex: 2 }}>
                        {onboardingLoading ? 'Registering...' : 'Register as Partner'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      <style jsx>{`
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </div>
  );
}
