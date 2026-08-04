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
  HiOutlineStar,
  HiOutlineUser,
  HiOutlineMail,
  HiOutlineTag,
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlineCheck,
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

const STATUSES = ['All Statuses', 'New', 'In Review', 'Resolved', 'Closed'];
const ROLES = ['All Roles', 'student', 'shop', 'agent', 'admin'];

export default function AdminFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [roleFilter, setRoleFilter] = useState('All Roles');

  // Selected Item for Detail Modal
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return (
          <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            ● New
          </span>
        );
      case 'In Review':
        return (
          <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            ◐ In Review
          </span>
        );
      case 'Resolved':
        return (
          <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            ✓ Resolved
          </span>
        );
      case 'Closed':
        return (
          <span style={{ background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: '1px solid rgba(156, 163, 175, 0.3)', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            ✕ Closed
          </span>
        );
      default:
        return (
          <span style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
            {status}
          </span>
        );
    }
  };

  const renderStarIcons = (rating?: number) => {
    if (!rating || rating < 1) return <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>N/A</span>;
    return (
      <span style={{ color: '#f59e0b', fontSize: 13, letterSpacing: 1 }}>
        {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
      </span>
    );
  };

  // Stats calculation
  const totalCount = feedbackList.length;
  const newCount = feedbackList.filter(f => f.status === 'New').length;
  const inReviewCount = feedbackList.filter(f => f.status === 'In Review').length;
  const resolvedCount = feedbackList.filter(f => f.status === 'Resolved').length;
  const closedCount = feedbackList.filter(f => f.status === 'Closed').length;

  const ratedItems = feedbackList.filter(f => typeof f.rating === 'number' && f.rating > 0);
  const avgRating = ratedItems.length > 0
    ? (ratedItems.reduce((acc, curr) => acc + curr.rating, 0) / ratedItems.length).toFixed(1)
    : null;

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 48 }}>
        
        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)', color: '#fff'
              }}>
                <HiOutlineChatAlt2 size={24} />
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                Feedback Management
              </h1>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Manage, filter, and resolve user feedback, bug reports, and suggestions.
            </p>
          </div>
        </div>

        {/* Compact Statistics Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
          <div className="glass-card" style={{ padding: '14px 18px', borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Feedback</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{totalCount}</div>
          </div>
          <div className="glass-card" style={{ padding: '14px 18px', borderRadius: 12, borderLeft: '3px solid #60a5fa' }}>
            <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>New</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#60a5fa' }}>{newCount}</div>
          </div>
          <div className="glass-card" style={{ padding: '14px 18px', borderRadius: 12, borderLeft: '3px solid #fde047' }}>
            <div style={{ fontSize: 11, color: '#fde047', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>In Review</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fde047' }}>{inReviewCount}</div>
          </div>
          <div className="glass-card" style={{ padding: '14px 18px', borderRadius: 12, borderLeft: '3px solid #4ade80' }}>
            <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Resolved</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#4ade80' }}>{resolvedCount}</div>
          </div>
          <div className="glass-card" style={{ padding: '14px 18px', borderRadius: 12, borderLeft: '3px solid #9ca3af' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Closed</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#9ca3af' }}>{closedCount}</div>
          </div>
          <div className="glass-card" style={{ padding: '14px 18px', borderRadius: 12, borderLeft: '3px solid #f59e0b' }}>
            <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Avg Rating</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{avgRating ? `${avgRating} ★` : 'N/A'}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="glass-card" style={{ padding: 16, borderRadius: 14, marginBottom: 20 }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <HiOutlineSearch size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input"
                type="text"
                placeholder="Search Feedback ID, subject, user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 38, fontSize: 13 }}
              />
            </div>

            {/* Status Filter */}
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto', background: '#1e1b4b', color: '#fff', fontSize: 13 }}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Category Filter */}
            <select
              className="input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: 'auto', background: '#1e1b4b', color: '#fff', fontSize: 13 }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Role Filter */}
            <select
              className="input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ width: 'auto', background: '#1e1b4b', color: '#fff', fontSize: 13 }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
              Search
            </button>
          </form>
        </div>

        {/* Data Table */}
        <div className="glass-card" style={{ padding: 0, borderRadius: 16, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 32 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: 0.5 }}>
                  <div style={{ width: 100, height: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                  <div style={{ width: 150, height: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                  <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                </div>
              ))}
            </div>
          ) : feedbackList.length === 0 ? (
            /* Empty State */
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
                No feedback yet
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)', maxWidth: 360, margin: '0 auto 20px auto', lineHeight: 1.5 }}>
                Once users submit feedback, bug reports, or suggestions, they will appear here.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#0f172a', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 16px' }}>Feedback ID</th>
                    <th style={{ padding: '14px 16px' }}>Date</th>
                    <th style={{ padding: '14px 16px' }}>User</th>
                    <th style={{ padding: '14px 16px' }}>Role</th>
                    <th style={{ padding: '14px 16px' }}>Category</th>
                    <th style={{ padding: '14px 16px' }}>Subject</th>
                    <th style={{ padding: '14px 16px' }}>Rating</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackList.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => openDetailModal(item)}
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer', transition: 'background 0.2s' }}
                      className="hover:bg-white/5"
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary-light)' }}>{item.feedback_id}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-tertiary)', fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{item.user_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.user_email}</div>
                      </td>
                      <td style={{ padding: '14px 16px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{item.role}</td>
                      <td style={{ padding: '14px 16px', color: '#fff', fontWeight: 500 }}>{item.category}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subject}</td>
                      <td style={{ padding: '14px 16px' }}>{renderStarIcons(item.rating)}</td>
                      <td style={{ padding: '14px 16px' }}>{getStatusBadge(item.status)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--primary-light)' }}>
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── FEEDBACK DETAIL MODAL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
              alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
              padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', padding: 32, borderRadius: 20, textAlign: 'left' }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--primary-light)', fontWeight: 700, letterSpacing: 1 }}>
                    {selectedFeedback.feedback_id}
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 2, marginBottom: 4 }}>
                    {selectedFeedback.subject}
                  </h2>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                    Category: <strong style={{ color: '#fff' }}>{selectedFeedback.category}</strong> | Date: {new Date(selectedFeedback.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => setSelectedFeedback(null)}
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <HiOutlineX size={20} />
                </button>
              </div>

              {/* User Metadata Card */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: 16, borderRadius: 12, marginBottom: 20, fontSize: 13, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Submitted By</div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{selectedFeedback.user_name}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{selectedFeedback.user_email}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>User Role & Order</div>
                  <div style={{ fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>Role: {selectedFeedback.role}</div>
                  {selectedFeedback.order_id && (
                    <div style={{ color: 'var(--primary-light)' }}>Order ID: #{selectedFeedback.order_id}</div>
                  )}
                </div>
              </div>

              {/* Full Message */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Full Message
                </label>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: 16,
                  borderRadius: 10,
                  fontSize: 14,
                  color: '#fff',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {selectedFeedback.message}
                </div>
              </div>

              {/* Rating & Attachment Info */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                {selectedFeedback.rating && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '8px 14px', borderRadius: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Rating: </span>
                    <strong style={{ color: '#f59e0b' }}>{renderStarIcons(selectedFeedback.rating)} ({selectedFeedback.rating}/5)</strong>
                  </div>
                )}

                {selectedFeedback.attachment_url && (
                  <a
                    href={selectedFeedback.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 13,
                      color: 'var(--primary-light)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <HiOutlineExternalLink size={16} /> View Attachment File
                  </a>
                )}
              </div>

              {/* Admin Actions (Status & Notes) */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Admin Management</h3>

                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label style={{ color: '#fff', fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block' }}>
                    Status
                  </label>
                  <select
                    className="input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={{ background: '#1e1b4b', color: '#fff' }}
                  >
                    <option value="New">New</option>
                    <option value="In Review">In Review</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 20 }}>
                  <label style={{ color: '#fff', fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block' }}>
                    Internal Admin Notes
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Add internal investigation notes or resolution details..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
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
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
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
