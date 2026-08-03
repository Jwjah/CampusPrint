export default function PrivacyPolicyPage() {
  return (
    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 24 }}>Privacy Policy</h1>
      <p>Last updated: August 2026</p>
      
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 16 }}>1. Information We Collect</h2>
      <p>
        CampusPrint collects information you provide directly to us when you create an account, submit a print order, or communicate with us. 
        This includes your name, email address, phone number, and uploaded documents. For delivery agents, we also collect hostel room details.
      </p>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 16 }}>2. How We Use Your Information</h2>
      <p>
        We use the information we collect to operate our marketplace, process your print orders, facilitate delivery, and securely process payments. 
        Your uploaded documents are only accessible to you and the specific shop processing your order. They are automatically deleted after printing.
      </p>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 16 }}>3. Data Security</h2>
      <p>
        We implement enterprise-grade security measures to protect your personal information. 
        Payments are processed securely via Razorpay, and we do not store your full credit card or banking details on our servers.
      </p>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 16 }}>4. Information Sharing</h2>
      <p>
        We do not sell or rent your personal data to third parties. We share information only with print shops and delivery agents strictly to fulfill your order, and with payment processors to handle transactions securely.
      </p>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 16 }}>5. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, please contact us at support@campusprint.com.
      </p>
    </div>
  );
}
