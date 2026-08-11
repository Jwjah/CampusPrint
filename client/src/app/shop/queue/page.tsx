'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { StaggerContainer, StaggerItem, TapButton, ModalOverlay } from '@/components/animations';
import { HiOutlineSearch } from 'react-icons/hi';

const statusFlow = ['pending', 'confirmed', 'printing', 'ready', 'delivered'];
const nextStatus: Record<string, string> = { pending: 'confirmed', confirmed: 'printing', printing: 'ready', ready: 'delivered' };
const statusLabels: Record<string, string> = {
  pending: '⏳ Pending', confirmed: '✅ Confirmed', printing: '🖨️ Printing', ready: '📦 Ready', delivered: '🎉 Done',
};
const statusColors: Record<string, string> = {
  pending: 'badge-pending', confirmed: 'badge-confirmed', printing: 'badge-printing', ready: 'badge-ready', delivered: 'badge-delivered',
};

export default function QueuePage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [qrModalOrder, setQrModalOrder] = useState<any>(null);
  const [showAgentGuide, setShowAgentGuide] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Check if agent is set up or just show the option
    if (typeof window !== 'undefined') {
      setShowAgentGuide(true);
    }
  }, []);

  const loadOrders = (background = false) => {
    if (!background) setLoading(true);
    api.get('/orders').then(({ data }) => setOrders(data.orders || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(); const i = setInterval(() => loadOrders(true), 5000); return () => clearInterval(i); }, []);

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order → ${statusLabels[status]}`);
      loadOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  const markAsDelivered = async (orderId: number) => {
    try {
      await api.post(`/orders/${orderId}/shop-deliver`);
      toast.success('🎉 Order marked as delivered!');
      loadOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to deliver order');
    }
  };

  const triggerPrint = async (orderId: number, shopId: number) => {
    try {
      await api.post(`/shops/${shopId}/trigger-print`, { orderId });
      toast.success('🖨️ Sending to local printer...');
      loadOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to print');
    }
  };

  const handlePrintAll = async () => {
    const printable = orders.filter(o => o.payment_status === 'PAID' && o.status === 'confirmed');
    if (printable.length === 0) {
      toast.error('No printable orders in the queue');
      return;
    }

    setLoading(true);
    try {
      for (const order of printable) {
        try {
          await api.post(`/shops/${order.shop_id}/trigger-print`, { orderId: order.id });
          toast.success(`Sent Order #${order.order_id || order.order_hash.substring(0, 8).toUpperCase()} to printer`);
        } catch (err: any) {
          const errorMsg = err.response?.data?.error || 'Unknown error';
          toast.error(`Failed to print Order #${order.order_id || order.order_hash.substring(0, 8).toUpperCase()}: ${errorMsg}`);
        }
      }
      loadOrders();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders
    .filter(o => o.status === tab)
    .filter(o => 
      o.order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.order_hash?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.student_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const counts = statusFlow.reduce((acc, s) => ({ ...acc, [s]: orders.filter(o => o.status === s).length }), {} as Record<string, number>);
  const printableOrders = orders.filter(o => o.payment_status === 'PAID' && o.status === 'confirmed');

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Print Queue</h1>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: 24 }}>Manage incoming print orders in real-time.</p>

      {/* Search & Actions Bar */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <HiOutlineSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            type="text" 
            className="input" 
            style={{ paddingLeft: 36, width: '100%' }} 
            placeholder="Search by Order ID or Student Name..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        {printableOrders.length > 0 && (
          <button
            className="btn btn-primary"
            disabled={loading}
            onClick={handlePrintAll}
            style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            🖨️ Print All ({printableOrders.length})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {statusFlow.slice(0, 4).map(s => (
          <motion.button
            key={s}
            whileTap={{ scale: 0.95 }}
            className={`tab ${tab === s ? 'active' : ''}`}
            onClick={() => setTab(s)}
          >
            {statusLabels[s]} {counts[s] > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>({counts[s]})</span>}
          </motion.button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card empty-state">
          <div className="empty-state-icon">{tab === 'pending' ? '📭' : '🎉'}</div>
          <h3>No {tab} orders</h3>
          <p>{tab === 'pending' ? 'New orders will appear here.' : `All ${tab} orders have been processed.`}</p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredOrders.map((order) => (
              <StaggerItem key={order.id}>
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, x: 100 }}
                  className="glass-card"
                  style={{ padding: 20 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        #{order.order_id || order.order_hash?.substring(0, 8)?.toUpperCase()}
                        <span className={`badge ${statusColors[order.status]}`} style={{ marginLeft: 12 }}>{statusLabels[order.status]}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
                        👤 {order.student_name} · {order.hostel && `🏠 ${order.hostel}`} {order.room_number && `#${order.room_number}`}
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>₹{parseFloat(order.total_price || 0).toFixed(0)}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    <span>📄 {order.total_pages} pages</span>
                    <span>📋 {order.copies} copies</span>
                    <span>{order.print_type === 'color' ? '🌈 Color' : '⬛ B&W'}</span>
                    <span>{order.layout === 'double' ? '📖 Double' : '📃 Single'}</span>
                    {order.binding ? (
                      <span>
                        📚 {(() => {
                          if (order.finishing_type && order.finishing_type !== 'none') {
                            const type = order.finishing_type.toLowerCase();
                            if (type === 'staple') return 'Staple';
                            if (type === 'spiral') return 'Spiral Binding';
                            if (type === 'stick') return 'Stick File';
                            return order.finishing_type;
                          }
                          const match = (order.notes || '').match(/Binding:\s*(\w+)/i);
                          const type = match ? match[1].toLowerCase() : 'spiral';
                          if (type === 'staple') return 'Staple';
                          if (type === 'spiral') return 'Spiral Binding';
                          if (type === 'stick') return 'Stick File';
                          return 'Binding';
                        })()}
                      </span>
                    ) : null}
                    <span>
                      {order.delivery_type === 'hostel' ? (
                        order.delivery_timeout_notified === 1 ? (
                          <span style={{ color: '#f59e0b', fontWeight: 700 }}>🏪 Waiting for Student Pickup (Agent Timeout)</span>
                        ) : (
                          <span>🚀 Delivery (Waiting for Delivery Agent)</span>
                        )
                      ) : (
                        '🏪 Pickup (Waiting for Student Pickup)'
                      )}
                    </span>
                  </div>

                  {order.notes && (
                    <div style={{ fontSize: 13, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: 8, marginBottom: 16 }}>
                      💬 {order.notes}
                    </div>
                  )}

                  {/* Middle: Large First-Page Document Preview */}
                  {order.files && order.files.length > 0 && (
                    <div>
                      <LargeDocumentPreview 
                        filePath={order.files[0].file_path || order.files[0].path} 
                        fileName={order.files[0].name || order.files[0].original_name} 
                      />
                    </div>
                  )}

                  {/* Bottom: Action Buttons */}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
                    {order.files && order.files.map((file: any) => (
                      <TapButton
                        key={file.id}
                        className="btn btn-secondary"
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          padding: '10px 18px',
                          fontSize: 14,
                          fontWeight: 600,
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        onClick={async () => {
                          try {
                            const { data } = await api.get(`/orders/files/${file.id}/download`);
                            window.open(data.url, '_blank');
                          } catch (err) {
                            toast.error('Failed to open file');
                          }
                        }}
                      >
                        📄 View Original {order.files.length > 1 ? `(${file.name || 'File'})` : ''}
                      </TapButton>
                    ))}

                    {order.status === 'pending' && (
                      <TapButton className="btn btn-danger btn-sm" onClick={() => updateStatus(order.id, 'cancelled')}>
                        ✕ Reject
                      </TapButton>
                    )}
                    
                    {(order.status === 'pending' || order.status === 'confirmed') && (
                      <TapButton 
                        className="btn btn-primary" 
                        style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)', padding: '10px 20px', fontSize: 14, fontWeight: 700, borderRadius: 10 }}
                        onClick={() => triggerPrint(order.id, order.shop_id)}
                      >
                        🖨️ ONE-CLICK PRINT
                      </TapButton>
                    )}

                    {order.status === 'ready' && (order.delivery_type === 'pickup' || order.delivery_type === 'self_pickup') && (
                      <TapButton 
                        className="btn btn-success" 
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)',
                          padding: '10px 22px',
                          fontSize: 14,
                          fontWeight: 700,
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                        onClick={() => markAsDelivered(order.id)}
                      >
                        <span>✓</span> MARK AS DELIVERED
                      </TapButton>
                    )}

                    {order.status === 'ready' && (
                      <TapButton 
                        className="btn btn-secondary" 
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          padding: '10px 18px',
                          fontSize: 14,
                          fontWeight: 600,
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                        onClick={() => setQrModalOrder(order)}
                      >
                        📱 View Code
                      </TapButton>
                    )}

                    {order.status === 'printing' && (
                      <TapButton className="btn btn-success" style={{ padding: '10px 20px', fontSize: 14, fontWeight: 700, borderRadius: 10 }} onClick={() => updateStatus(order.id, 'ready')}>
                        ✅ Mark as Ready
                      </TapButton>
                    )}
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </AnimatePresence>
      )}

      {/* Local Agent Setup Box */}
      {showAgentGuide && (
        <div className="glass-card" style={{ marginTop: 40, padding: 24, border: '1px dashed var(--primary)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            🔌 Connect Your Physical Printer
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            PFM supports direct, zero-click printing from the cloud to your local desktop printer. 
          </p>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', fontSize: 13 }}>
            <div style={{ fontWeight: 600, color: 'var(--primary-light)', marginBottom: 8 }}>⚡ Zero-Config Setup:</div>
            <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-tertiary)' }}>
              <li>
                <span 
                  onClick={() => {
                    try {
                      const token = localStorage.getItem('token') || '';
                      const apiBase = api.defaults.baseURL || '';
                      const downloadUrl = `${apiBase}/shops/download-agent?token=${token}`;
                      window.open(downloadUrl, '_blank');
                    } catch (err) {
                      toast.error('Failed to download print agent');
                    }
                  }}
                  style={{ color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Download your pre-configured Print Agent ZIP
                </span> and extract the folder to your computer.
              </li>
              <li>Double-click the <code>start-agent.bat</code> (Windows) or <code>start-agent.command</code> (Mac) file.</li>
            </ol>
          </div>
          <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            🟢 <strong>Note:</strong> The agent starts polling and registers itself to run automatically. No login, URLs, or setup credentials are required!
          </p>
        </div>
      )}


      {/* QR & Code Display Modal for Shop */}
      <ModalOverlay isOpen={!!qrModalOrder} onClose={() => setQrModalOrder(null)}>
        {qrModalOrder && (
          <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'var(--success-light)', color: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>
              ✅
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Print Ready!</h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 20 }}>
              Scan this QR code or verify the pickup code to complete handover.
            </p>

            {(() => {
              const qrSource = qrModalOrder.pickup_qr || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrModalOrder.order_hash || qrModalOrder.pickup_code || 'CAMPUSPRINT')}`;
              return (
                <div className="qr-container" style={{ background: '#fff', padding: 16, borderRadius: 16, display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginBottom: 16 }}>
                  <img src={qrSource} alt="Pickup QR Code" style={{ width: 200, height: 200, display: 'block' }} />
                </div>
              );
            })()}

            {qrModalOrder.pickup_code && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                  Pickup Code:
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 8, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {qrModalOrder.pickup_code}
                </div>
              </div>
            )}
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 28 }} onClick={() => setQrModalOrder(null)}>
              Close View
            </button>
          </div>
        )}
      </ModalOverlay>
    </div>
  );
}

function LargeDocumentPreview({ filePath, fileName }: { filePath: string; fileName: string }) {
  const [error, setError] = useState(false);

  let previewUrl = filePath;
  if (filePath && filePath.includes('cloudinary.com')) {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      previewUrl = filePath.replace('/upload/', '/upload/pg_1,w_800,c_fit,f_jpg/').replace(/\.pdf$/i, '.jpg');
    } else {
      previewUrl = filePath.replace('/upload/', '/upload/w_800,c_fit/');
    }
  }

  if (error || !previewUrl) {
    return (
      <div style={{
        width: '100%',
        padding: '36px 20px',
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-tertiary)',
        gap: 8,
        margin: '16px 0',
      }}>
        <span style={{ fontSize: 32, opacity: 0.6 }}>📄</span>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Preview unavailable</span>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      padding: '20px 16px',
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '16px 0',
      overflow: 'hidden',
    }}>
      <img
        src={previewUrl}
        alt={fileName || 'First page preview'}
        loading="lazy"
        onError={() => setError(true)}
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: 560,
          height: 'auto',
          objectFit: 'contain',
          borderRadius: 8,
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
          background: '#ffffff',
        }}
      />
    </div>
  );
}
