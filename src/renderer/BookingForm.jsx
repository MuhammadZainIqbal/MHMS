import React, { useState, useEffect } from 'react';
import './BookingForm.css';
import MoneyInput from './MoneyInput';
import { rupeesToPaisa, paisaToRupees, formatCurrency } from '../utils/currency';

/**
 * BookingForm Component
 * Uncle-proof form for creating new bookings with validation
 */
function BookingForm({ onBookingCreated }) {
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [formData, setFormData] = useState({
    venueId: '',
    customerName: '',
    phone: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    bufferMins: '90',
    serviceMode: 'Food',
    hallOnlyMode: 'flat', // 'flat' or 'perhead'
    ratePerHead: '',
    guaranteedGuests: '',
    flatRent: '',
    bayanah: '0',
    notes: ''
  });

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      const result = await window.api.getVenues();
      setVenues(result.success ? result.venues : []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load venues:', error);
      setMessage({ text: 'Failed to load venues', type: 'error' });
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setAvailabilityChecked(false); // Reset availability check on any change
    
    // Update selected venue when venue changes
    if (field === 'venueId') {
      const venue = venues.find(v => v.id === parseInt(value));
      setSelectedVenue(venue || null);
    }
  };

  const handleCheckAvailability = async () => {
    // Validate required fields for availability check
    if (!formData.venueId || !formData.startDate || !formData.startTime || 
        !formData.endDate || !formData.endTime) {
      setMessage({ text: 'Please fill in venue, start date/time, and end date/time first', type: 'error' });
      return;
    }

    setCheckingAvailability(true);
    setMessage({ text: '', type: '' });

    try {
      const startTime = `${formData.startDate}T${formData.startTime}`;
      const endTime = `${formData.endDate}T${formData.endTime}`;

      // Validate that end time is after start time
      if (new Date(endTime) <= new Date(startTime)) {
        setMessage({ text: 'End time must be after start time', type: 'error' });
        setCheckingAvailability(false);
        return;
      }

      const result = await window.api.checkAvailability({
        venueId: parseInt(formData.venueId),
        startTime,
        endTime,
        bufferMins: parseInt(formData.bufferMins) || 0
      });

      if (result.available) {
        setMessage({ text: '✅ Venue is available for this time slot!', type: 'success' });
        setAvailabilityChecked(true);
      } else {
        const conflict = result.conflict;
        const occupiedUntil = new Date(conflict.occupiedUntil).toLocaleString();
        setMessage({
          text: `❌ CONFLICT! This hall is busy (including cleanup time) until ${occupiedUntil}. Customer: ${conflict.customerName}`,
          type: 'error'
        });
        setAvailabilityChecked(false);
      }
    } catch (error) {
      setMessage({ text: 'Error checking availability: ' + error.message, type: 'error' });
      setAvailabilityChecked(false);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!availabilityChecked) {
      setMessage({ text: 'Please check availability first!', type: 'error' });
      return;
    }

    // Validate service mode specific fields
    if (formData.serviceMode === 'Food') {
      if (!formData.ratePerHead || !formData.guaranteedGuests) {
        setMessage({ text: 'Rate per head and guaranteed guests are required for Food service', type: 'error' });
        return;
      }
    } else if (formData.serviceMode === 'HallOnly') {
      if (formData.hallOnlyMode === 'flat' && !formData.flatRent) {
        setMessage({ text: 'Flat rent is required for Hall Only (Flat Rent) service', type: 'error' });
        return;
      } else if (formData.hallOnlyMode === 'perhead' && (!formData.ratePerHead || !formData.guaranteedGuests)) {
        setMessage({ text: 'Rate per head and guaranteed guests are required for Hall Only (Per Head) service', type: 'error' });
        return;
      }
    }

    setSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const startTime = `${formData.startDate}T${formData.startTime}`;
      const endTime = `${formData.endDate}T${formData.endTime}`;

      const bookingData = {
        venueId: parseInt(formData.venueId),
        customerName: formData.customerName,
        phone: formData.phone,
        startTime,
        endTime,
        bufferMins: parseInt(formData.bufferMins) || 0,
        serviceMode: formData.serviceMode,
        hallOnlyMode: formData.serviceMode === 'HallOnly' ? formData.hallOnlyMode : 'flat',
        ratePerHead: (formData.serviceMode === 'Food' || (formData.serviceMode === 'HallOnly' && formData.hallOnlyMode === 'perhead')) 
          ? parseFloat(formData.ratePerHead) || 0 
          : 0,
        guaranteedGuests: (formData.serviceMode === 'Food' || (formData.serviceMode === 'HallOnly' && formData.hallOnlyMode === 'perhead')) 
          ? parseInt(formData.guaranteedGuests) || 0 
          : 0,
        flatRent: (formData.serviceMode === 'HallOnly' && formData.hallOnlyMode === 'flat') 
          ? parseFloat(formData.flatRent) || 0 
          : 0,
        bayanah: parseFloat(formData.bayanah) || 0,
        notes: formData.notes
      };

      const result = await window.api.createBooking(bookingData);

      if (result.success) {
        setMessage({ text: '✅ ' + result.message, type: 'success' });
        
        // Reset form
        setFormData({
          venueId: '',
          customerName: '',
          phone: '',
          startDate: '',
          startTime: '',
          endDate: '',
          endTime: '',
          bufferMins: '90',
          serviceMode: 'Food',
          hallOnlyMode: 'flat',
          ratePerHead: '',
          guaranteedGuests: '',
          flatRent: '',
          bayanah: '0',
          notes: ''
        });
        setAvailabilityChecked(false);

        // Notify parent component
        if (onBookingCreated) {
          onBookingCreated(result.bookingId);
        }

        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      setMessage({ text: 'Failed to create booking: ' + error.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="booking-form loading">Loading form...</div>;
  }

  if (venues.length === 0) {
    return (
      <div className="booking-form empty">
        <p>⚠️ No venues available. Please add a venue first in the Venues tab.</p>
      </div>
    );
  }

  const calculateTotal = () => {
    if (formData.serviceMode === 'Food' && formData.ratePerHead && formData.guaranteedGuests) {
      return parseFloat(formData.ratePerHead) * parseInt(formData.guaranteedGuests);
    } else if (formData.serviceMode === 'HallOnly') {
      if (formData.hallOnlyMode === 'flat' && formData.flatRent) {
        return parseFloat(formData.flatRent);
      } else if (formData.hallOnlyMode === 'perhead' && formData.ratePerHead && formData.guaranteedGuests) {
        return parseFloat(formData.ratePerHead) * parseInt(formData.guaranteedGuests);
      }
    }
    return 0;
  };

  const total = calculateTotal();

  return (
    <div className="booking-form">
      <h2>📅 Create New Booking</h2>

      {message.text && (
        <div className={`message message-${message.type} ${message.type === 'error' ? 'message-large' : ''}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Customer Details */}
        <div className="form-section">
          <h3>👤 Customer Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="customerName">Customer Name *</label>
              <input
                type="text"
                id="customerName"
                value={formData.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                placeholder="Enter customer name"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="03XX-XXXXXXX"
                required
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        {/* Special Instructions / Notes */}
        <div className="form-section">
          <h3>📝 Special Instructions / Notes</h3>
          
          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="notes">Notes (Optional)</label>
              <textarea
                id="notes"
                rows="4"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any special requests? (e.g., Customer bringing own flower decor, Extra security needed, Vegetarian menu, etc.)"
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        {/* Venue & Timing */}
        <div className="form-section">
          <h3>🏛️ Venue & Timing</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="venue">Select Venue *</label>
              <select
                id="venue"
                value={formData.venueId}
                onChange={(e) => handleInputChange('venueId', e.target.value)}
                required
                disabled={submitting}
              >
                <option value="">-- Select a Venue --</option>
                {venues.map(venue => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} (Capacity: {venue.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="bufferMins">Buffer Time (Minutes) *</label>
              <input
                type="number"
                id="bufferMins"
                value={formData.bufferMins}
                onChange={(e) => handleInputChange('bufferMins', e.target.value)}
                placeholder="90"
                min="0"
                required
                disabled={submitting}
              />
              <small>Cleanup time after event ends</small>
            </div>
          {/* Ladies Privacy Indicator */}
          {selectedVenue && (
            <div className="privacy-indicator">
              {selectedVenue.ladies_privacy === 1 ? (
                <span className="privacy-yes">✓ This hall supports Ladies Privacy</span>
              ) : (
                <span className="privacy-no">✗ Note: No Ladies Privacy</span>
              )}
            </div>
          )}          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input
                type="date"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="startTime">Start Time *</label>
              <input
                type="time"
                id="startTime"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="endDate">End Date *</label>
              <input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="endTime">End Time *</label>
              <input
                type="time"
                id="endTime"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckAvailability}
            className="btn-check-availability"
            disabled={checkingAvailability || submitting}
          >
            {checkingAvailability ? 'Checking...' : '🔍 Check Availability'}
          </button>
        </div>

        {/* Service Mode */}
        <div className="form-section">
          <h3>🍽️ Service Mode</h3>
          
          <div className="service-mode-toggle">
            <button
              type="button"
              className={`toggle-btn ${formData.serviceMode === 'Food' ? 'active' : ''}`}
              onClick={() => handleInputChange('serviceMode', 'Food')}
              disabled={submitting}
            >
              🍽️ Food Included
            </button>
            <button
              type="button"
              className={`toggle-btn ${formData.serviceMode === 'HallOnly' ? 'active' : ''}`}
              onClick={() => handleInputChange('serviceMode', 'HallOnly')}
              disabled={submitting}
            >
              🏛️ Hall Only
            </button>
          </div>

          {formData.serviceMode === 'Food' && (
            <div className="form-row">
              <MoneyInput
                id="ratePerHead"
                label="Rate Per Head (PKR) *"
                value={formData.ratePerHead}
                onChange={(e) => handleInputChange('ratePerHead', e.target.value)}
                placeholder="e.g., 2500"
                required={true}
                disabled={submitting}
              />

              <div className="form-group">
                <label htmlFor="guaranteedGuests">Guaranteed Guests *</label>
                <input
                  type="number"
                  id="guaranteedGuests"
                  value={formData.guaranteedGuests}
                  onChange={(e) => handleInputChange('guaranteedGuests', e.target.value)}
                  placeholder="e.g., 300"
                  min="1"
                  required
                  disabled={submitting}
                />
              </div>
            </div>
          )}

          {formData.serviceMode === 'HallOnly' && (
            <>
              <div className="form-group">
                <label>Hall Only Pricing Mode</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="hallOnlyMode"
                      value="flat"
                      checked={formData.hallOnlyMode === 'flat'}
                      onChange={(e) => handleInputChange('hallOnlyMode', e.target.value)}
                      disabled={submitting}
                    />
                    <span>Flat Rent</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="hallOnlyMode"
                      value="perhead"
                      checked={formData.hallOnlyMode === 'perhead'}
                      onChange={(e) => handleInputChange('hallOnlyMode', e.target.value)}
                      disabled={submitting}
                    />
                    <span>Per Head Rent</span>
                  </label>
                </div>
              </div>

              {formData.hallOnlyMode === 'flat' && (
                <div className="form-row">
                  <MoneyInput
                    id="flatRent"
                    label="Flat Rent (PKR) *"
                    value={formData.flatRent}
                    onChange={(e) => handleInputChange('flatRent', e.target.value)}
                    placeholder="e.g., 150000"
                    required={true}
                    disabled={submitting}
                  />
                </div>
              )}

              {formData.hallOnlyMode === 'perhead' && (
                <div className="form-row">
                  <MoneyInput
                    id="ratePerHead"
                    label="Rate Per Head (PKR) *"
                    value={formData.ratePerHead}
                    onChange={(e) => handleInputChange('ratePerHead', e.target.value)}
                    placeholder="e.g., 500"
                    required={true}
                    disabled={submitting}
                  />

                  <div className="form-group">
                    <label htmlFor="guaranteedGuests">Guaranteed Guests *</label>
                    <input
                      type="number"
                      id="guaranteedGuests"
                      value={formData.guaranteedGuests}
                      onChange={(e) => handleInputChange('guaranteedGuests', e.target.value)}
                      placeholder="e.g., 300"
                      min="1"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {total > 0 && (
            <div className="total-display">
              <strong>Total Agreement:</strong>
              <span className="total-amount">{formatCurrency(total)}</span>
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="form-section">
          <h3>💰 Initial Payment (Bayanah)</h3>
          
          <div className="form-row">
            <MoneyInput
              id="bayanah"
              label="Advance Amount (PKR)"
              value={formData.bayanah}
              onChange={(e) => handleInputChange('bayanah', e.target.value)}
              placeholder="0"
              disabled={submitting}
            />
            <small style={{gridColumn: '1 / -1', marginTop: '-12px'}}>Can be 0 if customer will pay later</small>
          </div>
        </div>

        {/* Submit */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn-submit-booking"
            disabled={!availabilityChecked || submitting}
          >
            {submitting ? 'Creating Booking...' : '✅ Create Booking'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default BookingForm;
