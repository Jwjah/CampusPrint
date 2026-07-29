'use client';

import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import QRScanner from '@/components/QRScanner';
import { HiOutlineQrcode } from 'react-icons/hi';

export default function AgentScannerPage() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanType, setScanType] = useState<'pickup' | 'delivery'>('pickup');
  const [entryMode, setEntryMode] = useState<'qr' | 'code'>('qr');
  const [loading, setLoading] = useState(false);

  // Manual code entry state
  const [manualOrderId, setManualOrderId] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const handleScan = async (hash: string) => {
    setScannerOpen(false);
    setLoading(true);
    try {
      const parsed = JSON.parse(hash);
      const orderId = parsed.orderId;
      const orderHash = parsed.hash;
      if (!orderId || !orderHash) throw new Error('Invalid QR payload');
      if (scanType === 'pickup') {
        await api.post('/agent/verify-pickup', { orderId, hash: orderHash });
        toast.success('✅ Pickup verified! Order is now in transit.');
      } else {
        await api.post('/agent/verify-delivery', { orderId, hash: orderHash });
        toast.success('✅ Delivery verified! Earnings credited.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid QR code. This code might not be for a print mission.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = async () => {
    if (!manualOrderId.trim()) { setCodeError('Order ID is required.'); return; }
    if (!manualCode || manualCode.length !== 6) { setCodeError('Please enter a valid 6-digit verification code.'); return; }
    setCodeError(null);
    setLoading(true);
    try {
      if (scanType === 'pickup') {
        await api.post('/agent/verify-pickup', { orderId: manualOrderId.trim(), code: manualCode });
        toast.success('✅ Pickup verified! Order is now in transit.');
      } else {
        await api.post('/agent/verify-delivery', { orderId: manualOrderId.trim(), code: manualCode });
        toast.success('✅ Delivery verified! Earnings credited.');
      }
      setManualOrderId('');
      setManualCode('');
    } catch (err: any) {
      setCodeError(err.response?.data?.error || 'Verification failed. Check the order ID and code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ width: 80, height: 80, background: 'var(--primary-glow)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', margin: '0 auto 24px' }}>
          <HiOutlineQrcode size={40} />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Quick Scan</h1>
        <p style={{ color: 'var(--text-tertiary)', marginBottom: 40, fontSize: 16 }}>
          Use this tool for rapid pickup or delivery verification.
        </p>

        <div className="glass-card" style={{ padding: 32, textAlign: 'left' }}>
          {/* Step 1: Verification Type */}
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Select Verification Type</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            <button onClick={() => setScanType('pickup')} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12, background: scanType === 'pickup' ? 'var(--primary-glow)' : 'var(--bg-tertiary)', border: `1px solid ${scanType === 'pickup' ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%' }}>
              <div style={{ fontSize: 24 }}>🏪</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: scanType === 'pickup' ? 'var(--primary-light)' : 'var(--text-primary)' }}>Verify Shop Pickup</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Confirm you collected the order from the shop</div>
              </div>
              {scanType === 'pickup' && <div style={{ color: 'var(--primary)' }}>●</div>}
            </button>
            <button onClick={() => setScanType('delivery')} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12, background: scanType === 'delivery' ? 'var(--success-bg)' : 'var(--bg-tertiary)', border: `1px solid ${scanType === 'delivery' ? 'var(--success)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%' }}>
              <div style={{ fontSize: 24 }}>🏠</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: scanType === 'delivery' ? 'var(--success)' : 'var(--text-primary)' }}>Verify Student Delivery</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Confirm the student received their order</div>
              </div>
              {scanType === 'delivery' && <div style={{ color: 'var(--success)' }}>●</div>}
            </button>
          </div>

          {/* Step 2: Entry Mode Toggle */}
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Verification Method</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button onClick={() => { setEntryMode('qr'); setCodeError(null); }} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', background: entryMode === 'qr' ? 'var(--primary)' : 'var(--bg-tertiary)', color: entryMode === 'qr' ? '#fff' : 'var(--text-secondary)', border: `1px solid ${entryMode === 'qr' ? 'var(--primary)' : 'var(--border)'}`, transition: 'all 0.2s' }}>📷 Scan QR</button>
            <button onClick={() => { setEntryMode('code'); setCodeError(null); }} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', background: entryMode === 'code' ? 'var(--primary)' : 'var(--bg-tertiary)', color: entryMode === 'code' ? '#fff' : 'var(--text-secondary)', border: `1px solid ${entryMode === 'code' ? 'var(--primary)' : 'var(--border)'}`, transition: 'all 0.2s' }}>🔢 Enter Code</button>
          </div>

          {/* QR Mode */}
          {entryMode === 'qr' && (
            <button className={`btn ${scanType === 'pickup' ? 'btn-primary' : 'btn-success'}`} style={{ width: '100%', height: 56, fontSize: 16 }} onClick={() => setScannerOpen(true)} disabled={loading}>
              {loading ? 'Processing...' : `Open ${scanType === 'pickup' ? 'Pickup' : 'Delivery'} Scanner`}
            </button>
          )}

          {/* Manual Code Mode */}
          {entryMode === 'code' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>Order ID (from printed document)</label>
                <input type="text" className="input" placeholder="e.g. 42" value={manualOrderId} onChange={e => { setManualOrderId(e.target.value); setCodeError(null); }} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
                  {scanType === 'pickup' ? 'Shop Pickup Code' : 'Delivery Code'} (6-digit from printed document)
                </label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} className="input" placeholder="• • • • • •" value={manualCode} onChange={e => { setManualCode(e.target.value.replace(/\D/g, '')); setCodeError(null); }} style={{ textAlign: 'center', fontSize: 28, letterSpacing: 10, fontWeight: 700, width: '100%' }} />
              </div>
              {codeError && <p style={{ color: 'var(--error)', fontSize: 13, margin: 0 }}>{codeError}</p>}
              <button className={`btn ${scanType === 'pickup' ? 'btn-primary' : 'btn-success'}`} style={{ width: '100%', height: 56, fontSize: 16 }} onClick={handleManualVerify} disabled={loading || !manualOrderId.trim() || manualCode.length !== 6}>
                {loading ? 'Verifying...' : `✓ Verify ${scanType === 'pickup' ? 'Pickup' : 'Delivery'}`}
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 32, padding: 20, borderRadius: 12, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: 'var(--warning)', fontSize: 20 }}>💡</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'left' }}>
            <strong>Tip:</strong> The Order ID and verification code are printed on the physical document. Use manual code entry if QR scanning is unavailable.
          </p>
        </div>
      </motion.div>

      {scannerOpen && (
        <QRScanner
          title={scanType === 'pickup' ? "Scan Shop QR" : "Scan Student QR"}
          description={scanType === 'pickup' ? "Scan the QR code shown on the shop's screen." : "Scan the QR code on the student's phone."}
          onClose={() => setScannerOpen(false)}
          onScan={handleScan}
        />
      )}
    </div>
  );
}
