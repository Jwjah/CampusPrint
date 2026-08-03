export default function RefundPolicyPage() {
  return (
    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 24 }}>Refund & Cancellation Policy</h1>
      
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 16 }}>1. Order Cancellations</h2>
      <p>
        You may cancel a print order for a full refund only if the print shop has not yet started printing your documents (i.e., the order is in the "Pending" or "Confirmed" state). Once the order status changes to "Printing", cancellations are no longer permitted.
      </p>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 16 }}>2. Refund Eligibility</h2>
      <p>
        Refunds may be issued under the following circumstances:
      </p>
      <ul style={{ listStyleType: 'disc', paddingLeft: 24, marginBottom: 16 }}>
        <li>The print shop cancels your order due to printer failure or inability to fulfill the request.</li>
        <li>The printed documents are entirely illegible or incorrect due to a demonstrable shop error.</li>
        <li>A delivery agent fails to deliver your order within the guaranteed timeframe, resulting in a lost order.</li>
      </ul>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 16 }}>3. Refund Process</h2>
      <p>
        To request a refund for a completed or failed order, you must contact support within 24 hours of the order completion or failure. Approved refunds will be processed back to your original payment method (via Razorpay) within 5-7 business days.
      </p>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 16 }}>4. Non-Refundable Scenarios</h2>
      <p>
        We do not issue refunds for user errors, such as uploading the wrong document, selecting the wrong print options (e.g., Black & White instead of Color), or failing to collect an order from the shop.
      </p>
    </div>
  );
}
