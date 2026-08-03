export default function PayoutPolicyPage() {
  return (
    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 24 }}>Payout Policy</h1>
      
      <p style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 32 }}>
        This policy outlines how and when Print Shop Owners and Delivery Agents receive payments for their services on CampusPrint.
      </p>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 16 }}>1. Payment Processing and Settlement</h2>
      <p>
        When a student places an order, the payment is securely processed by our payment gateway (Razorpay) and held by CampusPrint. 
        <strong> Shops and delivery agents are NOT paid instantly at the moment of the transaction.</strong> 
        Earnings remain in a "Pending" state until the funds have successfully settled from the payment processor to CampusPrint's bank accounts.
      </p>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 16 }}>2. Settlement Timelines</h2>
      <p>
        Razorpay settlement typically takes <strong>T+2 to T+3 business days</strong> (where T is the date of the transaction). 
        Only after the earnings have fully settled will they be moved to your "Available Balance", at which point they become withdrawable.
      </p>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 16 }}>3. Withdrawals</h2>
      <p>
        Withdrawal requests can be made at any time for funds in your Available Balance. Withdrawals are processed according to CampusPrint's payout schedule. 
        Once approved and processed, bank transfers (NEFT/IMPS) or UPI transfers may take an additional 1-2 business days depending on banking network operations.
      </p>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 16 }}>4. Disputes and Adjustments</h2>
      <p>
        Refunds, customer disputes, or chargebacks may delay payouts. If a refund is issued for an order (e.g., due to poor print quality or failed delivery), the corresponding amount will be deducted from your pending earnings or available balance.
      </p>
    </div>
  );
}
