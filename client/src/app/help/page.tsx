'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineMail,
  HiOutlineClock,
  HiOutlineClipboardList,
  HiOutlineInformationCircle,
  HiOutlineQuestionMarkCircle,
  HiOutlineShoppingBag,
  HiOutlineCreditCard,
  HiOutlineRefresh,
  HiOutlinePrinter,
  HiOutlineOfficeBuilding,
  HiOutlineTruck,
  HiOutlineUser,
  HiOutlineCode,
  HiOutlinePaperClip,
  HiOutlineCheckCircle,
  HiOutlineChatAlt2,
} from 'react-icons/hi';

const supportTopics = [
  { icon: <HiOutlineShoppingBag size={22} />, title: 'Order Issues', desc: 'Missing prints, wrong paper size, or formatting errors.' },
  { icon: <HiOutlineCreditCard size={22} />, title: 'Payment Problems', desc: 'Failed transactions, double charges, or Razorpay payment queries.' },
  { icon: <HiOutlineRefresh size={22} />, title: 'Refund Requests', desc: 'Cancellations, failed deliveries, or shop print errors.' },
  { icon: <HiOutlinePrinter size={22} />, title: 'Print Quality Concerns', desc: 'Faded ink, paper misalignments, or damaged print jobs.' },
  { icon: <HiOutlineOfficeBuilding size={22} />, title: 'Shop Registration', desc: 'Onboarding print shops, pricing configuration, or queue management.' },
  { icon: <HiOutlineTruck size={22} />, title: 'Delivery Issues', desc: 'Delayed campus deliveries, incorrect dropoff location, or missing codes.' },
  { icon: <HiOutlineUser size={22} />, title: 'Account Problems', desc: 'Login troubles, phone verification, hostel updates, or password resets.' },
  { icon: <HiOutlineCode size={22} />, title: 'Technical Bugs', desc: 'Website glitches, slow uploads, or unexpected errors.' },
  { icon: <HiOutlineQuestionMarkCircle size={22} />, title: 'General Questions', desc: 'Platform rules, bulk printing options, or campus partner feedback.' },
];

const helpfulDetails = [
  'Order ID (if applicable, e.g., #CP-8A2F1B)',
  'Registered Email Address & Phone Number',
  'Screenshots or photo of the issue (if available)',
  'Clear description of what happened and steps to reproduce',
];

const CATEGORIES = [
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

export default function HelpAndSupportPage() {
  const [form, setForm] = useState({
    category: 'General Feedback',
    subject: '',
    message: '',
    rating: 0,
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedFeedbackId, setSubmittedFeedbackId] = useState<string | null>(null);

  const [myFeedback, setMyFeedback] = useState<any[]>([]);
  const [loadingMyFeedback, setLoadingMyFeedback] = useState(true);

  const fetchMyFeedback = async () => {
    try {
      setLoadingMyFeedback(true);
      const res = await api.get('/feedback/my');
      setMyFeedback(res.data.feedback || []);
    } catch (err) {
      console.error('Failed to fetch my feedback:', err);
    } finally {
      setLoadingMyFeedback(false);
    }
  };

  useEffect(() => {
    fetchMyFeedback();
  }, []);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (form.subject.length > 120) {
      toast.error('Subject cannot exceed 120 characters');
      return;
    }
    if (!form.message.trim()) {
      toast.error('Message is required');
      return;
    }
    if (form.message.length > 3000) {
      toast.error('Message cannot exceed 3000 characters');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('category', form.category);
      formData.append('subject', form.subject.trim());
      formData.append('message', form.message.trim());
      if (form.rating > 0) {
        formData.append('rating', String(form.rating));
      }
      if (file) {
        formData.append('attachment', file);
      }

      const res = await api.post('/feedback', formData);

      if (res.data?.success) {
        setSubmittedFeedbackId(res.data.feedback_id);
        setForm({ category: 'General Feedback', subject: '', message: '', rating: 0 });
        setFile(null);
        toast.success('Feedback submitted successfully!');
        fetchMyFeedback();
      }
    } catch (err: any) {
      console.error('Submit feedback error:', err);
      if (err.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else if (err.response?.status === 403) {
        toast.error('Permission denied.');
      } else {
        toast.error(err.response?.data?.error || 'Unable to submit feedback. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>New</span>;
      case 'In Review':
        return <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fde047', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>In Review</span>;
      case 'Resolved':
        return <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>Resolved</span>;
      case 'Closed':
        return <span style={{ background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>Closed</span>;
      default:
        return <span style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{status}</span>;
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 48 }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(99, 102, 241, 0.25)'
            }}>
              <HiOutlineQuestionMarkCircle size={26} color="#fff" />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Need Help?</h1>
          </div>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            If you experience any issues while using CampusPrint, our support team is here to help.
          </p>
        </div>

        {/* Contact Banner */}
        <div className="glass-card" style={{
          padding: 28,
          borderRadius: 16,
          marginBottom: 32,
          border: '1px solid rgba(99, 102, 241, 0.3)',
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.6) 100%)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--primary)',
            }}>
              <HiOutlineMail size={30} />
            </div>
            <div>
              <div style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 4 }}>
                Official CampusPrint Support Email
              </div>
              <a
                href="mailto:support.campusprint@gmail.com"
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'var(--primary-light, #818cf8)',
                  textDecoration: 'none',
                  letterSpacing: '-0.01em',
                }}
              >
                support.campusprint@gmail.com
              </a>
            </div>
          </div>

          <a
            href="mailto:support.campusprint@gmail.com"
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: 14, fontWeight: 600, borderRadius: 10 }}
          >
            Send Email Now →
          </a>
        </div>

        {/* Response Time & Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
          
          <div className="glass-card" style={{ padding: 24, borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: 'var(--primary-light)' }}>
              <HiOutlineClock size={24} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Expected Response Time</h3>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              We aim to respond to all support emails within <strong>24–48 business hours</strong>.
            </p>
          </div>

          <div className="glass-card" style={{ padding: 24, borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: 'var(--primary-light)' }}>
              <HiOutlineInformationCircle size={24} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Direct Support</h3>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Support is available for Students, Print Shop Owners, and Delivery Agents across all campus locations.
            </p>
          </div>

        </div>

        {/* Support Topics Grid */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 20 }}>Common Support Topics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {supportTopics.map((topic, idx) => (
              <div key={idx} className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }}>
                  {topic.icon}
                </div>
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{topic.title}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5, margin: 0 }}>{topic.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Helpful Information Checklist */}
        <div className="glass-card" style={{ padding: 28, borderRadius: 16, marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: 'var(--primary)' }}>
            <HiOutlineClipboardList size={26} />
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>Helpful Information to Include</h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Including these details in your email helps our team resolve your request more quickly:
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {helpfulDetails.map((detail, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--text-primary)' }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0
                }}>
                  ✓
                </span>
                {detail}
              </li>
            ))}
          </ul>
        </div>

        {/* ── SUBMIT FEEDBACK SECTION ────────────────────────────────────────── */}
        <div className="glass-card" style={{ padding: 32, borderRadius: 16, marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ color: 'var(--primary)' }}>
              <HiOutlineChatAlt2 size={28} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>Submit Feedback</h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
            Submit feedback, report bugs, or share suggestions directly with the CampusPrint team.
          </p>

          <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Category Dropdown */}
            <div className="input-group">
              <label style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 6, display: 'block' }}>
                Category <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
                style={{ background: 'var(--bg-tertiary)', color: '#fff' }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} style={{ background: '#1e1b4b', color: '#fff' }}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Input */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                  Subject <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <span style={{ fontSize: 12, color: form.subject.length > 120 ? 'var(--error)' : 'var(--text-tertiary)' }}>
                  {form.subject.length}/120
                </span>
              </div>
              <input
                className="input"
                type="text"
                maxLength={120}
                required
                placeholder="Brief summary of your feedback or issue"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>

            {/* Message Textarea */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                  Message <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <span style={{ fontSize: 12, color: form.message.length > 3000 ? 'var(--error)' : 'var(--text-tertiary)' }}>
                  {form.message.length}/3000
                </span>
              </div>
              <textarea
                className="input"
                rows={5}
                maxLength={3000}
                required
                placeholder="Tell us what happened or how we can improve CampusPrint."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Overall Experience (1-5 Star Rating) */}
            <div className="input-group">
              <label style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block' }}>
                Overall Experience (Optional)
              </label>
              <div style={{ display: 'flex', gap: 8, fontSize: 24, cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setForm({ ...form, rating: form.rating === star ? 0 : star })}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: 26,
                      color: star <= form.rating ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)',
                      transition: 'color 0.2s',
                    }}
                  >
                    ★
                  </button>
                ))}
                {form.rating > 0 && (
                  <span style={{ fontSize: 13, color: 'var(--text-tertiary)', alignSelf: 'center', marginLeft: 8 }}>
                    ({form.rating} / 5 Stars)
                  </span>
                )}
              </div>
            </div>

            {/* Attachment File Input */}
            <div className="input-group">
              <label style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 6, display: 'block' }}>
                Attachment (Optional)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label className="btn btn-ghost" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px dashed rgba(255, 255, 255, 0.2)' }}>
                  <HiOutlinePaperClip size={18} />
                  <span>{file ? file.name : 'Upload File (PNG, JPG, JPEG, PDF — Max 10MB)'}</span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (f.size > 10 * 1024 * 1024) {
                          toast.error('File size exceeds 10 MB limit');
                          return;
                        }
                        setFile(f);
                      }
                    }}
                  />
                </label>
                {file && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 13 }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !form.subject.trim() || !form.message.trim()}
              className="btn btn-primary btn-lg"
              style={{ marginTop: 12, padding: '14px 28px', borderRadius: 10 }}
            >
              {loading ? 'Submitting Feedback...' : 'Submit Feedback'}
            </button>
          </form>
        </div>

        {/* ── MY RECENT FEEDBACK SECTION ───────────────────────────────────── */}
        <div className="glass-card" style={{ padding: 28, borderRadius: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 16 }}>My Recent Feedback</h2>
          {loadingMyFeedback ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading submissions...</div>
          ) : myFeedback.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
              You haven't submitted any feedback yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-tertiary)', fontSize: 12, textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Feedback ID</th>
                    <th style={{ padding: '12px 16px' }}>Category</th>
                    <th style={{ padding: '12px 16px' }}>Subject</th>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myFeedback.map((item) => (
                    <tr key={item.feedback_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary-light)' }}>{item.feedback_id}</td>
                      <td style={{ padding: '14px 16px', color: '#fff' }}>{item.category}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subject}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-tertiary)', fontSize: 13 }}>{new Date(item.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '14px 16px' }}>{getStatusBadge(item.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── SUCCESS DIALOG MODAL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {submittedFeedbackId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
              alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
              padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: 440, padding: 32, textAlign: 'center', borderRadius: 20 }}
            >
              <div style={{ color: '#4ade80', display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <HiOutlineCheckCircle size={54} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 12 }}>✅ Thank You!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
                Your feedback has been submitted successfully.
              </p>

              <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '12px 20px', borderRadius: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>Feedback ID</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-light)', letterSpacing: 1 }}>{submittedFeedbackId}</span>
              </div>

              <p style={{ color: 'var(--text-tertiary)', fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
                We truly appreciate your feedback and will use it to improve CampusPrint.
              </p>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', borderRadius: 10 }}
                onClick={() => setSubmittedFeedbackId(null)}
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
