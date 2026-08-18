import React from 'react';
import './PrintableReceipt.css';
import { formatCurrency } from '../utils/currency';

// Hardcoded business name - can be easily changed here
const BUSINESS_NAME = "Grand Palace Marquee";

/**
 * PrintableReceipt Component
 * Professional A4 receipt/invoice for bookings
 * Designed for standard laser printers with high contrast
 */
function PrintableReceipt({ booking, payments, extras }) {
  if (!booking) {
    return (
      <div className="receipt-placeholder">
        <p>No booking selected</p>
      </div>
    );
  }

  // Use backend-calculated financials (Source of Truth) - all values in Paisa (INTEGER)
  // Backend already calculates: grand_total, total_paid, balance_due
  const grandTotal = booking.grand_total || 0;
  const totalPaid = booking.total_paid || 0;
  const balanceDue = booking.balance_due || 0;

  // Calculate base amount for display breakdown
  let baseAmount = 0;
  if (booking.service_mode === 'Food') {
    baseAmount = (booking.rate_per_head || 0) * (booking.guaranteed_guests || 0);
  } else if (booking.service_mode === 'HallOnly') {
    if (booking.hall_only_mode === 'perhead') {
      baseAmount = (booking.rate_per_head || 0) * (booking.guaranteed_guests || 0);
    } else {
      baseAmount = booking.flat_rent || 0;
    }
  }

  const totalExtras = extras.reduce((sum, extra) => sum + (extra.price || 0), 0);

  console.log('[PrintableReceipt] grand_total (Paisa):', grandTotal, '| total_paid (Paisa):', totalPaid, '| balance_due (Paisa):', balanceDue);

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  }

  function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="receipt-wrapper">
      <button className="btn-print no-print" onClick={handlePrint}>
        🖨️ Print Receipt
      </button>

      <div className="receipt-container">
        {/* Header Section */}
        <div className="receipt-header">
          <h1>{BUSINESS_NAME}</h1>
          <div className="receipt-meta">
            <p><strong>Invoice Date:</strong> {formatDate(new Date())}</p>
            <p><strong>Booking ID:</strong> #{booking.id.toString().padStart(6, '0')}</p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="receipt-section">
          <h2>Customer Information</h2>
          <table className="info-table">
            <tbody>
              <tr>
                <td className="label">Customer Name:</td>
                <td className="value">{booking.customer_name}</td>
              </tr>
              <tr>
                <td className="label">Contact Number:</td>
                <td className="value">{booking.customer_phone}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Venue & Timing */}
        <div className="receipt-section">
          <h2>Venue & Event Details</h2>
          <table className="info-table">
            <tbody>
              <tr>
                <td className="label">Venue/Hall:</td>
                <td className="value">{booking.venue_name || 'N/A'}</td>
              </tr>
              <tr>
                <td className="label">Event Date:</td>
                <td className="value">{formatDate(booking.start_time)}</td>
              </tr>
              <tr>
                <td className="label">Event Time:</td>
                <td className="value">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </td>
              </tr>
              <tr>
                <td className="label">Buffer Time:</td>
                <td className="value">{booking.buffer_mins} minutes</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Special Instructions / Notes */}
        {booking.notes && booking.notes.trim() && (
          <div className="receipt-section notes-section">
            <h2>Special Instructions / Notes</h2>
            <div className="notes-content">
              {booking.notes}
            </div>
          </div>
        )}

        {/* Service Mode & Charges */}
        <div className="receipt-section">
          <h2>Service Details</h2>
          <table className="charges-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Rate/Details</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {booking.service_mode === 'Food' ? (
                <>
                  <tr>
                    <td>Service Mode</td>
                    <td>Food Included</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td>Rate per Head</td>
                    <td>{formatCurrency(booking.rate_per_head)}</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td>Guaranteed Guests</td>
                    <td>{booking.guaranteed_guests} persons</td>
                    <td>-</td>
                  </tr>
                  <tr className="subtotal-row">
                    <td><strong>Base Charges</strong></td>
                    <td>{booking.guaranteed_guests} × {formatCurrency(booking.rate_per_head)}</td>
                    <td><strong>{formatCurrency(baseAmount)}</strong></td>
                  </tr>
                </>
              ) : (
                <>
                  <tr>
                    <td>Service Mode</td>
                    <td>Hall Only {booking.hall_only_mode === 'perhead' ? '(Per Head)' : '(Flat Rent)'}</td>
                    <td>-</td>
                  </tr>
                  {booking.hall_only_mode === 'perhead' ? (
                    <>
                      <tr>
                        <td>Rate per Head</td>
                        <td>{formatCurrency(booking.rate_per_head)}</td>
                        <td>-</td>
                      </tr>
                      <tr>
                        <td>Guaranteed Guests</td>
                        <td>{booking.guaranteed_guests} persons</td>
                        <td>-</td>
                      </tr>
                      <tr className="subtotal-row">
                        <td><strong>Base Charges</strong></td>
                        <td>{booking.guaranteed_guests} × {formatCurrency(booking.rate_per_head)}</td>
                        <td><strong>{formatCurrency(baseAmount)}</strong></td>
                      </tr>
                    </>
                  ) : (
                    <tr className="subtotal-row">
                      <td><strong>Flat Rent</strong></td>
                      <td>-</td>
                      <td><strong>{formatCurrency(baseAmount)}</strong></td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Extras */}
        {extras.length > 0 && (
          <div className="receipt-section">
            <h2>Additional Items/Services</h2>
            <table className="charges-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {extras.map((extra, index) => (
                  <tr key={index}>
                    <td>{extra.item_name}</td>
                    <td>{formatCurrency(extra.price)}</td>
                  </tr>
                ))}
                <tr className="subtotal-row">
                  <td><strong>Total Extras</strong></td>
                  <td><strong>{formatCurrency(totalExtras)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Grand Total */}
        <div className="receipt-section grand-total-section">
          <table className="total-table">
            <tbody>
              <tr className="grand-total-row">
                <td>GRAND TOTAL</td>
                <td>{formatCurrency(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Summary */}
        <div className="receipt-section">
          <h2>Payment Summary</h2>
          <table className="charges-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Note</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{textAlign: 'center', color: '#999'}}>
                    No payments recorded yet
                  </td>
                </tr>
              ) : (
                payments.map((payment, index) => (
                  <tr key={index}>
                    <td>{formatDate(payment.created_at)}</td>
                    <td>{payment.note || '-'}</td>
                    <td>{formatCurrency(payment.amount)}</td>
                  </tr>
                ))
              )}
              <tr className="subtotal-row">
                <td colSpan="2"><strong>Total Paid</strong></td>
                <td><strong>{formatCurrency(totalPaid)}</strong></td>
              </tr>
              <tr className={balanceDue > 0 ? 'balance-due-row' : 'balance-paid-row'}>
                <td colSpan="2"><strong>BALANCE DUE</strong></td>
                <td><strong>{formatCurrency(balanceDue)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="receipt-footer">
          <p>Thank you for choosing {BUSINESS_NAME}!</p>
          <p className="footer-note">Please settle the balance before the event concludes.</p>
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line"></div>
              <p>Customer Signature</p>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <p>Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrintableReceipt;
