import React, { useState } from 'react';
import './RepairView.css';

/**
 * RepairView Component
 * Displayed when database is corrupted or missing
 * Offers option to restore from backup
 */
function RepairView() {
  const [isRestoring, setIsRestoring] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  async function handleRestoreBackup() {
    const userConfirmed = confirm(
      '⚠️ DATABASE REPAIR REQUIRED\n\n' +
      'The current database is corrupted or missing.\n\n' +
      'You will need to select a backup file to restore your data.\n\n' +
      'Click OK to select a backup file.'
    );

    if (!userConfirmed) {
      return;
    }

    setIsRestoring(true);
    try {
      const result = await window.api.importBackup(true);
      
      if (result.success) {
        setMessage({ 
          text: `✅ ${result.message}\n\nThe application will restart now.`, 
          type: 'success' 
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage({ text: result.message, type: 'info' });
      }
    } catch (error) {
      console.error('Restore failed:', error);
      setMessage({ 
        text: `❌ Restore failed: ${error.message}\n\nPlease contact support if this problem persists.`, 
        type: 'error' 
      });
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <div className="repair-container">
      <div className="repair-card">
        <div className="repair-header">
          <div className="icon-error">⚠️</div>
          <h1>Database Repair Required</h1>
          <p className="subtitle">MHMS - Marriage Hall Management System</p>
        </div>

        <div className="repair-body">
          <div className="error-section">
            <h3>What Happened?</h3>
            <p className="error-text">
              The application database is either missing or corrupted and cannot be loaded.
              This may have occurred due to:
            </p>
            <ul className="error-reasons">
              <li>Unexpected system shutdown or power failure</li>
              <li>Disk errors or storage device issues</li>
              <li>Manual deletion of database files</li>
              <li>File system corruption</li>
            </ul>
          </div>

          <div className="solution-section">
            <h3>How to Fix This</h3>
            <p className="solution-text">
              To restore your data, you will need a backup file (.mhms-backup) that you previously created.
            </p>
            
            {message.text && (
              <div className={`message message-${message.type}`}>
                {message.text}
              </div>
            )}

            <button 
              onClick={handleRestoreBackup}
              disabled={isRestoring}
              className="btn-restore-large"
            >
              {isRestoring ? 'Restoring Database...' : '📥 Restore from Backup'}
            </button>
          </div>

          <div className="warning-section">
            <h3>⚠️ Don't Have a Backup?</h3>
            <p className="warning-text">
              If you don't have a backup file, your data cannot be recovered.
              The application will need to start with a fresh database.
            </p>
            <p className="contact-text">
              Please contact support: <strong>zainiqbal7007@gmail.com</strong>
            </p>
          </div>
        </div>

        <div className="repair-footer">
          <p className="footer-note">
            💡 <strong>Prevention Tip:</strong> Always create regular backups using the Settings → Maintenance tab.
            Keep backup files on a USB drive or external storage separate from your computer.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RepairView;
