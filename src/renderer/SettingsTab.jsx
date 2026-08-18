import React, { useState } from 'react';
import './SettingsTab.css';

/**
 * SettingsTab Component
 * Maintenance functions: Backup and Restore database
 */
function SettingsTab() {
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  function showMessage(text, type) {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  }

  async function handleBackup() {
    setIsProcessing(true);
    try {
      const result = await window.api.exportBackup();
      
      if (result.success) {
        showMessage(`✅ ${result.message}\nSaved to: ${result.path}`, 'success');
      } else {
        showMessage(result.message, 'info');
      }
    } catch (error) {
      console.error('Backup failed:', error);
      showMessage('❌ Backup failed: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRestore() {
    // Show heavy warning dialog
    const userConfirmed = confirm(
      '⚠️ WARNING: This will permanently delete your current records and replace them with the backup.\n\n' +
      'This action CANNOT be undone.\n\n' +
      'Are you absolutely sure you want to continue?'
    );

    if (!userConfirmed) {
      showMessage('Restore cancelled', 'info');
      return;
    }

    // Double confirmation
    const doubleConfirm = confirm(
      '⚠️ FINAL WARNING!\n\n' +
      'Clicking OK will ERASE all current data.\n\n' +
      'Do you want to proceed?'
    );

    if (!doubleConfirm) {
      showMessage('Restore cancelled', 'info');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await window.api.importBackup(true);
      
      if (result.success) {
        showMessage(`✅ ${result.message}`, 'success');
        
        if (result.requiresRestart) {
          setTimeout(() => {
            if (confirm('Database restored! The application needs to restart now. Click OK to restart.')) {
              window.location.reload();
            }
          }, 2000);
        }
      } else {
        showMessage(result.message, 'info');
      }
    } catch (error) {
      console.error('Restore failed:', error);
      showMessage('❌ Restore failed: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDatabaseReset() {
    // Triple confirmation for nuclear option
    const confirm1 = confirm(
      '🚨 DANGER ZONE 🚨\n\n' +
      'This will PERMANENTLY DELETE ALL DATA:\n' +
      '• All Venues\n' +
      '• All Bookings\n' +
      '• All Payments\n' +
      '• All Financial Records\n\n' +
      'The database will be wiped clean and recreated with a fresh schema.\n\n' +
      'This CANNOT be undone!\n\n' +
      'Are you sure you want to continue?'
    );

    if (!confirm1) {
      showMessage('Reset cancelled', 'info');
      return;
    }

    const confirm2 = confirm(
      '⚠️ SECOND WARNING ⚠️\n\n' +
      'You are about to wipe ALL data from the system.\n\n' +
      'This includes ALL customer records, bookings, and financial history.\n\n' +
      'Do you really want to proceed?'
    );

    if (!confirm2) {
      showMessage('Reset cancelled', 'info');
      return;
    }

    const confirm3 = confirm(
      '🔴 FINAL CONFIRMATION 🔴\n\n' +
      'Type YES in your mind and click OK to wipe everything.\n\n' +
      'Last chance to cancel!'
    );

    if (!confirm3) {
      showMessage('Reset cancelled', 'info');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await window.api.nuclearReset();
      
      if (result.success) {
        showMessage('✅ Database reset successfully! The app will restart now...', 'success');
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showMessage('❌ ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Reset failed:', error);
      showMessage('❌ Reset failed: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleForceSyncFinancials() {
    setIsProcessing(true);
    try {
      const result = await window.api.forceSyncFinancials();
      
      if (result.success) {
        showMessage('✅ ' + result.message + '\n\nDashboard will refresh automatically.', 'success');
        
        // Trigger a manual refresh of the dashboard stats if needed
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showMessage('❌ ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Force sync failed:', error);
      showMessage('❌ Synchronization failed: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="settings-tab">
      <h2>⚙️ Settings & Maintenance</h2>

      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-section">
        <h3>📦 Data Backup & Restore</h3>
        <p className="section-description">
          Protect your data by creating regular backups. Save to a USB drive or external storage.
        </p>

        <div className="maintenance-actions">
          <div className="action-card backup-card">
            <div className="action-icon">💾</div>
            <h4>Backup Data to USB</h4>
            <p>
              Save a complete copy of your database to a safe location. 
              Recommended: Do this at the end of each day.
            </p>
            <button 
              onClick={handleBackup} 
              disabled={isProcessing}
              className="btn-action btn-backup"
            >
              {isProcessing ? 'Creating Backup...' : '📥 Create Backup Now'}
            </button>
          </div>

          <div className="action-card restore-card">
            <div className="action-icon">⚠️</div>
            <h4>Restore Data from Backup</h4>
            <p>
              Replace current data with a previously saved backup.
              <strong className="warning-text"> WARNING: This will delete all current records!</strong>
            </p>
            <button 
              onClick={handleRestore} 
              disabled={isProcessing}
              className="btn-action btn-restore"
            >
              {isProcessing ? 'Restoring...' : '⚠️ Restore from Backup'}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section danger-zone">
        <h3>🚨 Danger Zone</h3>
        <p className="section-description danger-description">
          <strong>WARNING:</strong> These actions are irreversible and will permanently delete all your data.
          Only use this if you need to completely reset the system or fix database schema issues.
        </p>

        <div className="maintenance-actions">
          <div className="action-card sync-card">
            <div className="action-icon">🔄</div>
            <h4>Force Synchronize Financials</h4>
            <p>
              Recalculate dashboard statistics from raw data to clear ghost numbers 
              from previous buggy versions. This refreshes the "Events Today", 
              "Cash Collected", and "Balance Due" counters.
            </p>
            <p className="sync-use-case">
              <strong>Use this if:</strong>
            </p>
            <ul className="sync-list">
              <li>Dashboard shows wildly incorrect numbers (e.g., Rs. 16.5 million)</li>
              <li>"Events Today" or "Balance Due" counters are stuck or non-functional</li>
              <li>You want to verify the dashboard matches actual database records</li>
            </ul>
            <button 
              onClick={handleForceSyncFinancials} 
              disabled={isProcessing}
              className="btn-action btn-sync"
            >
              {isProcessing ? 'Synchronizing...' : '🔄 Force Sync Dashboard'}
            </button>
          </div>

          <div className="action-card danger-card">
            <div className="action-icon">💥</div>
            <h4>Wipe All Data & Fix Schema</h4>
            <p>
              This will <strong>PERMANENTLY DELETE</strong> everything:
              all venues, bookings, payments, and records.
              The database will be recreated with a fresh, clean schema.
            </p>
            <p className="danger-use-case">
              <strong>Use this only if:</strong>
            </p>
            <ul className="danger-list">
              <li>You're getting "no such column" database errors</li>
              <li>You want to start completely fresh with zero data</li>
              <li>The database schema is corrupted or outdated</li>
            </ul>
            <button 
              onClick={handleDatabaseReset} 
              disabled={isProcessing}
              className="btn-action btn-danger"
            >
              {isProcessing ? 'Resetting...' : '💥 Wipe Everything & Reset'}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>ℹ️ Application Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Product Name:</label>
            <span>Grand Palace - Marriage Hall System</span>
          </div>
          <div className="info-item">
            <label>Version:</label>
            <span>1.0.0</span>
          </div>
          <div className="info-item">
            <label>Database Location:</label>
            <span>%AppData%\Roaming\mhms\mhms.db</span>
          </div>
          <div className="info-item">
            <label>License Status:</label>
            <span className="status-active">✅ Activated</span>
          </div>
        </div>
      </div>

      <div className="settings-footer">
        <p className="footer-note">
          💡 <strong>Tip:</strong> Always keep at least one backup copy on a USB drive separate from your computer.
          In case of hardware failure, you can restore your data on a new machine.
        </p>
      </div>
    </div>
  );
}

export default SettingsTab;
