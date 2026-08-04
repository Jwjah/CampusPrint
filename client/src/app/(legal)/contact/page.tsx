import { HiOutlineMail, HiOutlineClock, HiOutlineChatAlt2 } from 'react-icons/hi';

export default function ContactPage() {
  return (
    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 24 }}>Contact Us</h1>
      
      <p style={{ fontSize: 18, marginBottom: 40 }}>
        Need help? We're here for you. Choose a category below to direct your inquiry to the right team.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 48 }}>
        
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ color: 'var(--primary)', fontSize: 32, marginBottom: 16 }}><HiOutlineMail /></div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Email Support</h3>
          <p style={{ marginBottom: 16 }}>Reach out to us via email for general inquiries, order issues, or technical support.</p>
          <a href="mailto:support.campusprint@gmail.com" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>support.campusprint@gmail.com</a>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ color: 'var(--primary)', fontSize: 32, marginBottom: 16 }}><HiOutlineClock /></div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Business Hours</h3>
          <p style={{ marginBottom: 8 }}>Our support team operates during the following hours:</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-tertiary)' }}>
            <li>Monday - Friday: 9:00 AM - 6:00 PM</li>
            <li>Saturday: 10:00 AM - 2:00 PM</li>
            <li>Sunday: Closed</li>
          </ul>
        </div>

      </div>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 24 }}>Issue Categories</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="glass-card" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ color: 'var(--primary)', fontSize: 24, marginTop: 4 }}><HiOutlineChatAlt2 /></div>
          <div>
            <h4 style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Order Problems & Refunds</h4>
            <p style={{ fontSize: 14 }}>Missing prints, failed deliveries, or refund requests. <br/>Email: <strong>support.campusprint@gmail.com</strong></p>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ color: 'var(--primary)', fontSize: 24, marginTop: 4 }}><HiOutlineChatAlt2 /></div>
          <div>
            <h4 style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Payment Issues & Shop Payouts</h4>
            <p style={{ fontSize: 14 }}>Failed transactions, settlement delays, or payout inquiries for shop owners. <br/>Email: <strong>support.campusprint@gmail.com</strong></p>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ color: 'var(--primary)', fontSize: 24, marginTop: 4 }}><HiOutlineChatAlt2 /></div>
          <div>
            <h4 style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Copyright Complaints</h4>
            <p style={{ fontSize: 14 }}>Report intellectual property infringement or unauthorized material. <br/>Email: <strong>support.campusprint@gmail.com</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
