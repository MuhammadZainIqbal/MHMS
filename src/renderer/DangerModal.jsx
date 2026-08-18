import React from 'react';
import './DangerModal.css';

/**
 * DangerModal Component
 * Red warning modal for critical errors (e.g., venue deletion with future bookings)
 */
function DangerModal({ isOpen, onClose, title, message, details }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content danger-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header danger-header">
          <span className="warning-icon">⚠️</span>
          <h2>{title || 'Warning'}</h2>
        </div>
        
        <div className="modal-body">
          <p className="danger-message">{message}</p>
          {details && <p className="danger-details">{details}</p>}
        </div>
        
        <div className="modal-footer">
          <button className="btn-danger-close" onClick={onClose}>
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

export default DangerModal;
