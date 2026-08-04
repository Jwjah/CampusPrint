'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineChatAlt2,
  HiOutlineSearch,
  HiOutlineExternalLink,
  HiOutlineX,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineClipboardCopy,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineUser,
  HiOutlineMail,
  HiOutlineTag,
  HiOutlineCalendar,
  HiOutlineDownload,
  HiOutlinePaperClip,
} from 'react-icons/hi';

const CATEGORIES = [
  'All Categories',
  'Bug Report',
  'Feature Request',
  'Payment Issue',
  'Refund Issue',
  'Print Quality',
  'Delivery Issue',
  'Shop Issue',
  'Account Issue',
  'User Experience',
  'General Feedback',
];

const STATUS_TABS = [
  { id: 'All Statuses', label: 'All Feedback' },
  { id: 'New', label: 'New' },
  { id: 'In Review', label: 'In Review' },
  { id: 'Resolved', label: 'Resolved' },
  { id: 'Closed', label: 'Closed' },
];

const ROLES = ['All Roles', 'student', 'shop', 'agent', 'admin'];

export default function AdminFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [roleFilter, setRoleFilter] = useState('All Roles');

  // Detail Modal / Drawer
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState('New');
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'All Statuses') params.status = statusFilter;
      if (categoryFilter !== 'All Categories') params.category = categoryFilter;
      if (roleFilter !== 'All Roles') params.role = roleFilter;

      const res = await api.get('/admin/feedback', { params });
      setFeedbackList(res.data.feedback || []);
    } catch (err: any) {
      console.error('Failed to fetch admin feedback:', err);
      if (err.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else if (err.response?.status === 403) {
        toast.error('Permission denied. Admin access required.');
      } else {
        toast.error('Unable to load feedback records. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [statusFilter, categoryFilter, roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFeedback();
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success(`Copied ${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openDetailModal = (item: any) => {
    setSelectedFeedback(item);
    setEditStatus(item.status || 'New');
    setEditNotes(item.admin_notes || '');
  };

  const handleUpdateFeedback = async () => {
    if (!selectedFeedback) return;
    try {
      setUpdating(true);
      const res = await api.patch(`/admin/feedback/${selectedFeedback.id}`, {
        status: editStatus,
        admin_notes: editNotes,
      });

      if (res.data?.success) {
        toast.success('Feedback status updated successfully');
        setSelectedFeedback(null);
        fetchFeedback();
      }
    } catch (err: any) {
      console.error('Update feedback error:', err);
      toast.error(err.response?.data?.error || 'Failed to update feedback status');
    } finally {
      setUpdating(false);
    }
  };

  const handleExportCSV = () => {
    if (feedbackList.length === 0) {
      toast.error('No feedback data available to export');
      return;
    }
    const headers = ['Feedback ID', 'Date', 'User Name', 'User Email', 'Role', 'Category', 'Subject', 'Rating', 'Status', 'Message'];
    const rows = feedbackList.map(f => [
      f.feedback_id,
      new Date(f.created_at).toISOString(),
      `"${(f.user_name || '').replace(/"/g, '""')}"`,
      `"${(f.user_email || '').replace(/"/g, '""')}"`,
      f.role,
      f.category,
      `"${(f.subject || '').replace(/"/g, '""')}"`,
      f.rating || '',
      f.status,
      `"${(f.message || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campusprint_feedback_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Feedback report exported to CSV');
  };

  const getCategoryTagStyle = (category: string) => {
    switch (category) {
      case 'Bug Report':
        return { background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)' };
      case 'Feature Request':
        return { background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' };
      case 'Payment Issue':
      case 'Refund Issue':
        return { background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'Print Quality':
        return { background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' };
      case 'Delivery Issue':
        return { background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.3)' };
      default:
        return { background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return (
          <span style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} /> New
          </span>
        );
      case 'In Review':
        return (
          <span style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#eab308', boxShadow: '0 0 8px #eab308' }} /> In Review
          </span>
        );
      case 'Resolved':
        return (
          <span style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} /> Resolved
          </span>
        );
      case 'Closed':
        return (
          <span style={{ background: 'rgba(156, 163, 175, 0.12)', color: '#9ca3af', border: '1px solid rgba(156, 163, 175, 0.3)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af' }} /> Closed
          </span>
        );
      default:
        return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{status}</span>;
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating || rating < 1) return <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>;
    return (
      <span style={{ color: '#f59e0b', fontSize: 13, letterSpacing: 1.5, fontWeight: 700 }}>
        {'★'.repeat(rating)}<span style={{ color: 'rgba(255,255,255,0.15)' }}>{'★'.repeat(5 - rating)}</span>
      </span>
    );
  };

  const totalCount = feedbackList.length;
  const newCount = feedbackList.filter(f => f.status === 'New').length;
  const inReviewCount = feedbackList.filter(f => f.status === 'In Review').length;
  const resolvedCount = feedbackList.filter(f => f.status === 'Resolved').length;

  const ratedItems = feedbackList.filter(f => typeof f.rating === 'number' && f.rating > 0);
  const avgRating = ratedItems.length > 0
    ? (ratedItems.reduce((acc, curr) => acc + curr.rating, 0) / ratedItems.length).toFixed(1)
    : null;

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 64 }}>
        
        {/* Top Header & Breadcrumb */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 8 }}>
            <span>Admin</span>
            <span>/</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>Feedback Management</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: 0 }}>
                  Feedback & Requests
                </h1>
                <span style={{
                  background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#4ade80', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                  display: 'inline-flex', alignItems: 'center', gap: 6
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
                  Live Sync
                </span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4, margin: '4px 0 0 0' }}>
                Monitor, triage, and resolve user feedback, bug reports, and service ratings across CampusPrint.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={fetchFeedback}
                className="btn btn-ghost"
                style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <HiOutlineRefresh size={16} /> Refresh
              </button>
              <button
                onClick={handleExportCSV}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10 }}
              >
                <HiOutlineDownload size={16} /> Export Report
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI METRICS CARDS GRID (Stripe / Vercel style) ──────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          
          <div className="glass-card" style={{ padding: '16px 20px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(30,27,75,0.4) 0%, rgba(15,23,42,0.4) 100%)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Total Feedback
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{totalCount}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Submissions logged</div>
          </div>

          <div className="glass-card" style={{ padding: '16px 20px', borderRadius: 14, borderLeft: '3px solid #3b82f6' }}>
            <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Needs Action
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#60a5fa', letterSpacing: '-0.02em' }}>{newCount}</div>
            <div style={{ fontSize: 12, color: '#60a5fa', marginTop: 4 }}>● Unread / New</div>
          </div>

          <div className="glass-card" style={{ padding: '16px 20px', borderRadius: 14, borderLeft: '3px solid #eab308' }}>
            <div style={{ fontSize: 11, color: '#fde047', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              In Progress
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fde047', letterSpacing: '-0.02em' }}>{inReviewCount}</div>
            <div style={{ fontSize: 12, color: '#fde047', marginTop: 4 }}>◐ Under review</div>
          </div>

          <div className="glass-card" style={{ padding: '16px 20px', borderRadius: 14, borderLeft: '3px solid #22c55e' }}>
            <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Resolved
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#4ade80', letterSpacing: '-0.02em' }}>{resolvedCount}</div>
            <div style={{ fontSize: 12, color: '#4ade80', marginTop: 4 }}>✓ Successfully fixed</div>
          </div>

          <div className="glass-card" style={{ padding: '16px 20px', borderRadius: 14, borderLeft: '3px solid #f59e0b' }}>
            <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Avg Rating
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#f59e0b', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: 4 }}>
              {avgRating ? `${avgRating}` : 'N/A'}
              {avgRating && <span style={{ fontSize: 14, color: '#f59e0b' }}>/ 5.0 ★</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              {ratedItems.length} user rating{ratedItems.length === 1 ? '' : 's'}
            </div>
          </div>

        </div>

        {/* ── COMMAND BAR & FILTERS (Linear / GitHub style) ───────────────── */}
        <div className="glass-card" style={{ padding: 18, borderRadius: 16, marginBottom: 20 }}>
          
          {/* Status Tabs Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 12, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: 16 }}>
            {STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.id;
              const tabCount = tab.id === 'All Statuses'
                ? totalCount
                : feedbackList.filter(f => f.status === tab.id).length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#fff' : 'var(--text-tertiary)',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                  <span style={{
                    fontSize: 11,
                    padding: '2px 7px',
                    borderRadius: 10,
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                    color: isActive ? '#fff' : 'var(--text-tertiary)',
                  }}>
                    {tabCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Dropdown Filter Row */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            
            {/* Instant Search Bar */}
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <HiOutlineSearch size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input"
                type="text"
                placeholder="Search Feedback ID, subject, message, user name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 42, fontSize: 13, borderRadius: 10, background: 'var(--bg-tertiary)' }}
              />
            </div>

            {/* Category Filter */}
            <select
              className="input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: 'auto', background: '#1e1b4b', color: '#fff', fontSize: 13, borderRadius: 10 }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Role Filter */}
            <select
              className="input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ width: 'auto', background: '#1e1b4b', color: '#fff', fontSize: 13, borderRadius: 10 }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r === 'All Roles' ? 'All Roles' : `${r.charAt(0).toUpperCase() + r.slice(1)}s`}</option>)}
            </select>

            {(search || categoryFilter !== 'All Categories' || roleFilter !== 'All Roles' || statusFilter !== 'All Statuses') && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('All Statuses');
                  setCategoryFilter('All Categories');
                  setRoleFilter('All Roles');
                }}
                style={{ fontSize: 13, color: 'var(--error)' }}
              >
                Reset Filters
              </button>
            )}
          </form>
        </div>

        {/* ── MAIN DATA TABLE (Stripe / Linear style) ─────────────────────── */}
        <div className="glass-card" style={{ padding: 0, borderRadius: 16, overflow: 'hidden' }}>
          {loading ? (
            /* Skeleton Loading State */
            <div style={{ padding: 24 }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: 0.4 }}>
                  <div style={{ width: 90, height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 6 }} />
                  <div style={{ width: 140, height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 6 }} />
                  <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 6 }} />
                  <div style={{ width: 80, height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 6 }} />
                </div>
              ))}
            </div>
          ) : feedbackList.length === 0 ? (
            /* Professional Empty State */
            <div style={{ padding: '72px 24px', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)', marginBottom: 16
              }}>
                <HiOutlineChatAlt2 size={32} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
                No feedback submissions found
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)', maxWidth: 400, margin: '0 auto 20px auto', lineHeight: 1.6 }}>
                No user feedback, bug reports, or feature requests match your selected filters.
              </p>
              {(search || categoryFilter !== 'All Categories' || roleFilter !== 'All Roles' || statusFilter !== 'All Statuses') && (
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('All Statuses');
                    setCategoryFilter('All Categories');
                    setRoleFilter('All Roles');
                  }}
                  style={{ color: 'var(--primary-light)', fontSize: 13 }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead style={{ background: '#0f172a', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <tr style={{ color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <th style={{ padding: '14px 18px' }}>Feedback ID</th>
                    <th style={{ padding: '14px 18px' }}>User & Role</th>
                    <th style={{ padding: '14px 18px' }}>Category</th>
                    <th style={{ padding: '14px 18px' }}>Subject & Snippet</th>
                    <th style={{ padding: '14px 18px' }}>Rating</th>
                    <th style={{ padding: '14px 18px' }}>Status</th>
                    <th style={{ padding: '14px 18px' }}>Date</th>
                    <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackList.map((item) => {
                    const tagStyle = getCategoryTagStyle(item.category);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => openDetailModal(item)}
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', cursor: 'pointer', transition: 'background 0.15s' }}
                        className="hover:bg-white/5"
                      >
                        {/* ID */}
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            onClick={(e) => handleCopyId(item.feedback_id, e)}
                            style={{
                              fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--primary-light)',
                              background: 'rgba(99, 102, 241, 0.1)', padding: '4px 8px', borderRadius: 6,
                              display: 'inline-flex', alignItems: 'center', gap: 4
                            }}
                            title="Click to copy ID"
                          >
                            {item.feedback_id}
                            <HiOutlineClipboardCopy size={12} style={{ opacity: 0.6 }} />
                          </span>
                        </td>

                        {/* User Profile Cell */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0
                            }}>
                              {(item.user_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>{item.user_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{item.user_email}</span>
                                <span style={{
                                  background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4,
                                  textTransform: 'capitalize', fontSize: 10
                                }}>
                                  {item.role}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                            ...tagStyle
                          }}>
                            {item.category}
                          </span>
                        </td>

                        {/* Subject & Snippet */}
                        <td style={{ padding: '14px 18px', maxWidth: 280 }}>
                          <div style={{ fontWeight: 600, color: '#fff', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.subject}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                            {item.message}
                          </div>
                        </td>

                        {/* Rating */}
                        <td style={{ padding: '14px 18px' }}>{renderStars(item.rating)}</td>

                        {/* Status Badge */}
                        <td style={{ padding: '14px 18px' }}>{getStatusBadge(item.status)}</td>

                        {/* Date */}
                        <td style={{ padding: '14px 18px', color: 'var(--text-tertiary)', fontSize: 12 }}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>

                        {/* Quick Action */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: 12, color: 'var(--primary-light)', fontWeight: 600 }}
                          >
                            Inspect →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── INSPECTION SLIDE-OVER DRAWER (Clerk / Notion style) ───────────── */}
      <AnimatePresence>
        {selectedFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
              alignItems: 'center', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            }}
            onClick={() => setSelectedFeedback(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                width: '100%', maxWidth: 580, height: '100vh', background: '#0b0f19',
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)', padding: 32,
                overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary-light)', fontSize: 14 }}>
                      {selectedFeedback.feedback_id}
                    </span>
                    <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, ...getCategoryTagStyle(selectedFeedback.category) }}>
                      {selectedFeedback.category}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                    {selectedFeedback.subject}
                  </h2>
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => setSelectedFeedback(null)}
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <HiOutlineX size={22} />
                </button>
              </div>

              {/* User Metadata Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: 16, borderRadius: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                    Submitted By
                  </div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{selectedFeedback.user_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{selectedFeedback.user_email}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                    Details & Order
                  </div>
                  <div style={{ fontSize: 13, color: '#fff', textTransform: 'capitalize', fontWeight: 600 }}>
                    Role: {selectedFeedback.role}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    Date: {new Date(selectedFeedback.created_at).toLocaleString()}
                  </div>
                  {selectedFeedback.order_id && (
                    <div style={{ fontSize: 12, color: 'var(--primary-light)', fontWeight: 700, marginTop: 2 }}>
                      Related Order: #{selectedFeedback.order_id}
                    </div>
                  )}
                </div>
              </div>

              {/* Full Message Box */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                  Full Feedback Message
                </label>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: 18,
                  borderRadius: 14,
                  fontSize: 14,
                  color: '#f1f5f9',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {selectedFeedback.message}
                </div>
              </div>

              {/* Rating & Attachment Info */}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {selectedFeedback.rating && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '10px 16px', borderRadius: 10, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Rating: </span>
                    <strong style={{ color: '#f59e0b', fontSize: 15 }}>{renderStars(selectedFeedback.rating)} ({selectedFeedback.rating} / 5)</strong>
                  </div>
                )}

                {selectedFeedback.attachment_url && (
                  <a
                    href={selectedFeedback.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      padding: '10px 16px',
                      borderRadius: 10,
                      fontSize: 13,
                      color: 'var(--primary-light)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 600
                    }}
                  >
                    <HiOutlinePaperClip size={18} /> View Attachment File
                  </a>
                )}
              </div>

              {/* Admin Actions Panel */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 20, marginTop: 'auto' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 16 }}>Triage & Status Action</h3>

                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label style={{ color: '#fff', fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block' }}>
                    Update Status
                  </label>
                  <select
                    className="input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={{ background: '#1e1b4b', color: '#fff', fontSize: 13 }}
                  >
                    <option value="New">New (Unread)</option>
                    <option value="In Review">In Review (Under Investigation)</option>
                    <option value="Resolved">Resolved (Fixed)</option>
                    <option value="Closed">Closed (Archived)</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 20 }}>
                  <label style={{ color: '#fff', fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block' }}>
                    Internal Investigation Notes
                  </label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Add internal resolution notes, engineering tickets, or customer response notes..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setSelectedFeedback(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={updating}
                    onClick={handleUpdateFeedback}
                    style={{ padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}
                  >
                    {updating ? 'Saving...' : 'Save & Update'}
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
