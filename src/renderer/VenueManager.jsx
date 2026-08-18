import React, { useState, useEffect } from 'react';
import DangerModal from './DangerModal';
import './VenueManager.css';

/**
 * VenueManager Component
 * Full CRUD interface for managing venues
 */
function VenueManager() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [dangerModal, setDangerModal] = useState({ isOpen: false, title: '', message: '', details: '' });
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    ladiesPrivacy: false
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    loadVenues();
  }, []);

  async function loadVenues() {
    setLoading(true);
    try {
      const result = await window.api.getVenues({ includeInactive: true });
      setVenues(result.success ? result.venues : []);
    } catch (error) {
      console.error('Failed to load venues:', error);
      setMessage({ text: 'Failed to load venues', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function handleFormChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  async function handleAddVenue(e) {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.capacity) {
      setMessage({ text: 'Please fill in all fields', type: 'error' });
      return;
    }

    try {
      await window.api.addVenue({
        name: formData.name,
        capacity: parseInt(formData.capacity),
        ladiesPrivacy: formData.ladiesPrivacy
      });

      setMessage({ text: 'Venue added successfully!', type: 'success' });
      setFormData({ name: '', capacity: '', ladiesPrivacy: false });
      setShowAddForm(false);
      loadVenues();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  }

  async function handleUpdateVenue(e) {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.capacity) {
      setMessage({ text: 'Please fill in all fields', type: 'error' });
      return;
    }

    try {
      await window.api.updateVenue({
        id: editingVenue.id,
        name: formData.name,
        capacity: parseInt(formData.capacity),
        ladiesPrivacy: formData.ladiesPrivacy
      });

      setMessage({ text: 'Venue updated successfully!', type: 'success' });
      setEditingVenue(null);
      setFormData({ name: '', capacity: '', ladiesPrivacy: false });
      loadVenues();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  }

  async function handleDeleteVenue(id) {
    try {
      const result = await window.api.deleteVenue(id);
      
      if (result.blocked) {
        // Future bookings exist - show danger modal
        setDangerModal({
          isOpen: true,
          title: 'Cannot Delete Venue',
          message: result.message,
          details: 'Please reassign or cancel the upcoming bookings before attempting to delete this venue.'
        });
        setMessage({ text: result.message, type: 'error' });
        return;
      }
      
      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        loadVenues();
      } else {
        setMessage({ text: result.message, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: error.message || 'Failed to delete venue', type: 'error' });
    }
  }

  async function handleReactivate(id) {
    try {
      const result = await window.api.reactivateVenue(id);
      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        loadVenues();
      } else {
        setMessage({ text: result.message, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: error.message || 'Failed to reactivate venue', type: 'error' });
    }
  }

  function startEdit(venue) {
    setEditingVenue(venue);
    setFormData({
      name: venue.name,
      capacity: venue.capacity,
      ladiesPrivacy: venue.ladies_privacy === 1
    });
    setShowAddForm(false);
  }

  function cancelEdit() {
    setEditingVenue(null);
    setFormData({ name: '', capacity: '', ladiesPrivacy: false });
  }

  // Check if any venue is inactive
  const hasInactiveVenues = venues.some(v => v.is_active === 0);

  return (
    <div className="venue-manager">
      <div className="venue-header">
        <h2>🏛️ Venue Management</h2>
        <button 
          className="btn-add-venue"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingVenue(null);
            setFormData({ name: '', capacity: '', ladiesPrivacy: false });
          }}
        >
          {showAddForm ? '❌ Cancel' : '➕ Add New Venue'}
        </button>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingVenue) && (
        <div className="venue-form-card">
          <h3>{editingVenue ? 'Edit Venue' : 'Add New Venue'}</h3>
          <form onSubmit={editingVenue ? handleUpdateVenue : handleAddVenue}>
            <div className="form-row">
              <label>
                Venue Name:
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g., Grand Hall"
                  required
                />
              </label>

              <label>
                Capacity:
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleFormChange}
                  placeholder="e.g., 500"
                  min="1"
                  required
                />
              </label>
            </div>

            <div className="form-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="ladiesPrivacy"
                  checked={formData.ladiesPrivacy}
                  onChange={handleFormChange}
                />
                <span className="checkbox-text">Ladies Privacy Available</span>
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                {editingVenue ? '💾 Update Venue' : '➕ Add Venue'}
              </button>
              {editingVenue && (
                <button type="button" className="btn-cancel" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Venues Table */}
      <div className="venues-table-container">
        {loading ? (
          <div className="loading">Loading venues...</div>
        ) : venues.length === 0 ? (
          <div className="empty-state">
            <p>No venues found. Add your first venue to get started!</p>
          </div>
        ) : (
          <table className="venues-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Capacity</th>
                <th>Ladies Privacy</th>
                {hasInactiveVenues && <th>Status</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {venues.map(venue => (
                <tr key={venue.id} className={venue.is_active === 0 ? 'inactive-row' : ''}>
                  <td className="venue-name">{venue.name}</td>
                  <td>{venue.capacity} guests</td>
                  <td>
                    {venue.ladies_privacy === 1 ? (
                      <span className="privacy-badge privacy-yes">YES</span>
                    ) : (
                      <span className="privacy-badge privacy-no">NO</span>
                    )}
                  </td>
                  {hasInactiveVenues && (
                    <td>
                      {venue.is_active === 1 ? (
                        <span className="status-badge status-active">Active</span>
                      ) : (
                        <span className="status-badge status-inactive">Inactive</span>
                      )}
                    </td>
                  )}
                  <td className="actions-cell">
                    {venue.is_active === 1 ? (
                      <>
                        <button 
                          className="btn-edit"
                          onClick={() => startEdit(venue)}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => handleDeleteVenue(venue.id)}
                        >
                          🗑️ Delete
                        </button>
                      </>
                    ) : (
                      <button 
                        className="btn-reactivate"
                        onClick={() => handleReactivate(venue.id)}
                      >
                        ♻️ Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DangerModal
        isOpen={dangerModal.isOpen}
        onClose={() => setDangerModal({ ...dangerModal, isOpen: false })}
        title={dangerModal.title}
        message={dangerModal.message}
        details={dangerModal.details}
      />
    </div>
  );
}

export default VenueManager;
