import React, { useState, useEffect } from 'react';
import PrintableReceipt from './PrintableReceipt';
import MoneyInput from './MoneyInput';
import './FinancialTab.css';
import { rupeesToPaisa, paisaToRupees, formatCurrency } from '../utils/currency';

/**
 * FinancialTab Component
 * View and manage payments and extras for existing bookings
 */
function FinancialTab({ initialBookingId }) {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showReceipt, setShowReceipt] = useState(false);
  
  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: '', note: '' });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  
  // Extra form state
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraData, setExtraData] = useState({ itemName: '', price: '' });
  const [submittingExtra, setSubmittingExtra] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    // If an initial booking ID is passed, load it automatically
    if (initialBookingId && bookings.length > 0) {
      loadBookingDetails(initialBookingId);
    }
  }, [initialBookingId, bookings]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await window.api.getBookings({ status: 'Confirmed' });
      setBookings(data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      setMessage({ text: 'Failed to load bookings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadBookingDetails = async (bookingId) => {
    try {
      setDetailsLoading(true);
      const details = await window.api.getBooking(bookingId);
      console.log('[FinancialTab] Loaded booking details - grand_total (Paisa):', details.grand_total, '| total_paid (Paisa):', details.total_paid, '| balance_due (Paisa):', details.balance_due);
      setSelectedBooking(details);
      setMessage({ text: '', type: '' });
    } catch (error) {
      console.error('Failed to load booking details:', error);
      setMessage({ text: 'Failed to load booking details', type: 'error' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    
    if (!paymentData.amount || paymentData.amount <= 0) {
      setMessage({ text: 'Payment amount must be greater than 0', type: 'error' });
      return;
    }

    setSubmittingPayment(true);
    setMessage({ text: '', type: '' });

    try {
      const result = await window.api.addPayment({
        bookingId: selectedBooking.id,
        amount: parseFloat(paymentData.amount),
        note: paymentData.note.trim()
      });

      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        setPaymentData({ amount: '', note: '' });
        setShowPaymentForm(false);
        
        // Reload booking details
        await loadBookingDetails(selectedBooking.id);
      }
    } catch (error) {
      setMessage({ text: 'Failed to add payment: ' + error.message, type: 'error' });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleAddExtra = async (e) => {
    e.preventDefault();
    
    if (!extraData.itemName.trim()) {
      setMessage({ text: 'Item name is required', type: 'error' });
      return;
    }

    if (extraData.price < 0) {
      setMessage({ text: 'Price cannot be negative', type: 'error' });
      return;
    }

    setSubmittingExtra(true);
    setMessage({ text: '', type: '' });

    try {
      const result = await window.api.addExtra({
        bookingId: selectedBooking.id,
        itemName: extraData.itemName.trim(),
        price: parseFloat(extraData.price) || 0
      });

      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        setExtraData({ itemName: '', price: '' });
        setShowExtraForm(false);
        
        // Reload booking details
        await loadBookingDetails(selectedBooking.id);
      }
    } catch (error) {
      setMessage({ text: 'Failed to add extra: ' + error.message, type: 'error' });
    } finally {
      setSubmittingExtra(false);
    }
  };

  const handleDeleteExtra = async (extraId) => {
    try {
      const result = await window.api.deleteExtra(extraId);

      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        // Reload booking details
        await loadBookingDetails(selectedBooking.id);
      }
    } catch (error) {
      setMessage({ text: 'Failed to delete extra: ' + error.message, type: 'error' });
    }
  };

  const calculateTotalDeal = (booking) => {
    let baseTotal = 0;
    
    // All values are already in Paisa (INTEGER), so just add them up
    if (booking.service_mode === 'Food') {
      baseTotal = (booking.rate_per_head || 0) * (booking.guaranteed_guests || 0);
    } else if (booking.service_mode === 'HallOnly') {
      // Check hall_only_mode to determine pricing
      if (booking.hall_only_mode === 'perhead') {
        baseTotal = (booking.rate_per_head || 0) * (booking.guaranteed_guests || 0);
      } else {
        baseTotal = booking.flat_rent || 0;
      }
    }

    const extrasTotal = (booking.extras || []).reduce((sum, extra) => sum + (extra.price || 0), 0);
    
    return baseTotal + extrasTotal;
  };

  const calculateTotalPaid = (booking) => {
    return (booking.payments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
  };

  if (loading) {
    return <div className="financial-tab loading">Loading bookings...</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="financial-tab empty">
        <p>No confirmed bookings found. Create a booking first.</p>
      </div>
    );
  }

  return (
    <div className="financial-tab">
      <h2>💰 Financial Management</h2>

      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="financial-layout">
        {/* Bookings List */}
        <div className="bookings-sidebar">
          <h3>Select Booking</h3>
          <div className="bookings-list">
            {bookings.map(booking => (
              <div
                key={booking.id}
                className={`booking-item ${selectedBooking?.id === booking.id ? 'active' : ''}`}
                onClick={() => loadBookingDetails(booking.id)}
              >
                <div className="booking-item-header">
                  <strong>{booking.customer_name}</strong>
                  <span className="booking-id">#{booking.id}</span>
                </div>
                <div className="booking-item-venue">{booking.venue_name}</div>
                <div className="booking-item-date">
                  {new Date(booking.start_time).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Details */}
        <div className="booking-details">
          {!selectedBooking ? (
            <div className="select-prompt">
              <p>👈 Select a booking to view financial details</p>
            </div>
          ) : detailsLoading ? (
            <div className="details-loading">Loading details...</div>
          ) : (
            <>
              {/* Booking Info */}
              <div className="details-section">
                <h3>📋 Booking Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Customer:</label>
                    <span>{selectedBooking.customer_name}</span>
                  </div>
                  <div className="info-item">
                    <label>Phone:</label>
                    <span>{selectedBooking.phone}</span>
                  </div>
                  <div className="info-item">
                    <label>Venue:</label>
                    <span>{selectedBooking.venue_name}</span>
                  </div>
                  <div className="info-item">
                    <label>Service:</label>
                    <span className={`service-badge ${selectedBooking.service_mode.toLowerCase()}`}>
                      {selectedBooking.service_mode === 'Food' ? '🍽️ Food Included' : '🏛️ Hall Only'}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Event Date:</label>
                    <span>{new Date(selectedBooking.start_time).toLocaleString()}</span>
                  </div>
                  <div className="info-item">
                    <label>End Time:</label>
                    <span>{new Date(selectedBooking.end_time).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="details-section">
                <h3>💵 Financial Summary</h3>
                
                {selectedBooking.service_mode === 'Food' ? (
                  <div className="calculation-box">
                    <div className="calc-row">
                      <span>Rate per Head:</span>
                      <span>{formatCurrency(selectedBooking.rate_per_head)}</span>
                    </div>
                    <div className="calc-row">
                      <span>Guaranteed Guests:</span>
                      <span>{selectedBooking.guaranteed_guests}</span>
                    </div>
                    <div className="calc-row total">
                      <span>Base Total:</span>
                      <span>{formatCurrency(selectedBooking.rate_per_head * selectedBooking.guaranteed_guests)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="calculation-box">
                    {selectedBooking.hall_only_mode === 'perhead' ? (
                      <>
                        <div className="calc-row">
                          <span>Rate per Head:</span>
                          <span>{formatCurrency(selectedBooking.rate_per_head)}</span>
                        </div>
                        <div className="calc-row">
                          <span>Guaranteed Guests:</span>
                          <span>{selectedBooking.guaranteed_guests}</span>
                        </div>
                        <div className="calc-row total">
                          <span>Base Total (Per Head):</span>
                          <span>{formatCurrency(selectedBooking.rate_per_head * selectedBooking.guaranteed_guests)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="calc-row total">
                        <span>Flat Rent:</span>
                        <span>{formatCurrency(selectedBooking.flat_rent)}</span>
                      </div>
                    )}
                  </div>
                )}

                {selectedBooking.extras && selectedBooking.extras.length > 0 && (
                  <div className="extras-summary">
                    <div className="calc-row">
                      <span>Extras Total:</span>
                      <span>{formatCurrency(selectedBooking.extras.reduce((sum, e) => sum + (e.price || 0), 0))}</span>
                    </div>
                  </div>
                )}

                <div className="grand-total">
                  <span>Total Deal:</span>
                  <span className="amount">{formatCurrency(selectedBooking.grand_total || 0)}</span>
                </div>

                <div className="payment-status">
                  <div className="status-row paid">
                    <span>Total Paid:</span>
                    <span>{formatCurrency(selectedBooking.total_paid || 0)}</span>
                  </div>
                  <div className="status-row remaining">
                    <span>Remaining:</span>
                    <span>{formatCurrency(selectedBooking.balance_due || 0)}</span>
                  </div>
                </div>

                {/* Print Receipt Button */}
                <button 
                  onClick={() => setShowReceipt(!showReceipt)} 
                  className="btn-print-receipt"
                >
                  🖨️ {showReceipt ? 'Hide Receipt' : 'Print Receipt'}
                </button>
              </div>

              {/* Printable Receipt */}
              {showReceipt && (
                <PrintableReceipt 
                  booking={selectedBooking}
                  payments={selectedBooking.payments || []}
                  extras={selectedBooking.extras || []}
                />
              )}

              {/* Payments */}
              <div className="details-section">
                <div className="section-header">
                  <h3>💳 Payment History</h3>
                  {!showPaymentForm && (
                    <button onClick={() => setShowPaymentForm(true)} className="btn-add">
                      ➕ Add Payment
                    </button>
                  )}
                </div>

                {showPaymentForm && (
                  <form onSubmit={handleAddPayment} className="add-form">
                    <div className="form-row">
                      <MoneyInput
                        label="Amount (PKR) *"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                        placeholder="Enter amount"
                        required={true}
                        disabled={submittingPayment}
                      />
                      <div className="form-group">
                        <label>Note (Optional)</label>
                        <input
                          type="text"
                          value={paymentData.note}
                          onChange={(e) => setPaymentData({ ...paymentData, note: e.target.value })}
                          placeholder="e.g., 2nd Installment"
                          disabled={submittingPayment}
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="button" onClick={() => {setShowPaymentForm(false); setPaymentData({amount: '', note: ''});}} className="btn-cancel">
                        Cancel
                      </button>
                      <button type="submit" className="btn-submit" disabled={submittingPayment}>
                        {submittingPayment ? 'Adding...' : 'Add Payment'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="payments-list">
                  {selectedBooking.payments && selectedBooking.payments.length > 0 ? (
                    selectedBooking.payments.map(payment => (
                      <div key={payment.id} className="payment-item">
                        <div className="payment-date">
                          {new Date(payment.date).toLocaleString()}
                        </div>
                        <div className="payment-amount">
                          {formatCurrency(payment.amount)}
                        </div>
                        {payment.note && (
                          <div className="payment-note">{payment.note}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="empty-list">No payments recorded yet</div>
                  )}
                </div>
              </div>

              {/* Extras */}
              <div className="details-section">
                <div className="section-header">
                  <h3>➕ Extra Items/Services</h3>
                  {!showExtraForm && (
                    <button onClick={() => setShowExtraForm(true)} className="btn-add">
                      ➕ Add Extra
                    </button>
                  )}
                </div>

                {showExtraForm && (
                  <form onSubmit={handleAddExtra} className="add-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Item Name *</label>
                        <input
                          type="text"
                          value={extraData.itemName}
                          onChange={(e) => setExtraData({ ...extraData, itemName: e.target.value })}
                          placeholder="e.g., Stage, Diesel Generator"
                          required
                          disabled={submittingExtra}
                        />
                      </div>
                      <MoneyInput
                        label="Price (PKR)"
                        value={extraData.price}
                        onChange={(e) => setExtraData({ ...extraData, price: e.target.value })}
                        placeholder="0"
                        disabled={submittingExtra}
                      />
                    </div>
                    <div className="form-actions">
                      <button type="button" onClick={() => {setShowExtraForm(false); setExtraData({itemName: '', price: ''});}} className="btn-cancel">
                        Cancel
                      </button>
                      <button type="submit" className="btn-submit" disabled={submittingExtra}>
                        {submittingExtra ? 'Adding...' : 'Add Extra'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="extras-list">
                  {selectedBooking.extras && selectedBooking.extras.length > 0 ? (
                    selectedBooking.extras.map(extra => (
                      <div key={extra.id} className="extra-item">
                        <div className="extra-name">{extra.item_name}</div>
                        <div className="extra-price">{formatCurrency(extra.price)}</div>
                        <button
                          className="btn-delete-extra"
                          onClick={() => handleDeleteExtra(extra.id)}
                          title="Delete this extra"
                        >
                          ❌
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-list">No extra items added</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default FinancialTab;
