import React, { useState, useEffect } from 'react';
import './ActivationView.css';

/**
 * ActivationView Component
 * Displays when the application is not activated
 * Shows the Machine ID and allows the user to enter an activation key
 */
function ActivationView({ onActivated }) {
  const [machineId, setMachineId] = useState('Loading...');
  const [activationKey, setActivationKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showTestKey, setShowTestKey] = useState(false);
  const [isProduction, setIsProduction] = useState(true);

  // Load machine ID and check production mode on component mount
  useEffect(() => {
    loadMachineId();
    // Check if running in production
    setIsProduction(window.api.isProduction());
  }, []);

  const loadMachineId = async () => {
    try {
      const id = await window.api.getMachineId();
      setMachineId(id);
    } catch (error) {
      setMachineId('Error loading Machine ID');
      console.error('Failed to get machine ID:', error);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    
    if (!activationKey.trim()) {
      setMessage({ text: 'Please enter an activation key', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const result = await window.api.activateApp(activationKey);
      
      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        
        // Wait a moment to show success message, then notify parent
        setTimeout(() => {
          onActivated();
        }, 1000);
      } else {
        setMessage({ text: result.message, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Activation failed: ' + error.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMachineId = () => {
    navigator.clipboard.writeText(machineId);
    setMessage({ text: 'Machine ID copied to clipboard', type: 'info' });
    setTimeout(() => setMessage({ text: '', type: '' }), 2000);
  };

  const handleGenerateTestKey = async () => {
    try {
      const testKey = await window.api.generateTestKey();
      setActivationKey(testKey);
      setShowTestKey(true);
      setMessage({ text: 'Test key generated! Click "Activate" to use it.', type: 'info' });
    } catch (error) {
      setMessage({ text: 'Failed to generate test key', type: 'error' });
    }
  };

  return (
    <div className="activation-container">
      <div className="activation-card">
        <div className="activation-header">
          <div className="icon-lock">🔒</div>
          <h1>Application Activation Required</h1>
          <p className="subtitle">MHMS - Marriage Hall Management System</p>
        </div>

        <div className="activation-body">
          <div className="info-section">
            <h3>Your Hardware ID</h3>
            <div className="machine-id-container">
              <code className="machine-id">{machineId}</code>
              <button 
                className="btn-copy" 
                onClick={handleCopyMachineId}
                title="Copy to clipboard"
              >
                📋 Copy
              </button>
            </div>
            <p className="info-text">
              Share this Hardware ID with your vendor to receive an activation key.
            </p>
          </div>

          <form onSubmit={handleActivate} className="activation-form">
            <div className="form-group">
              <label htmlFor="activationKey">Activation Key</label>
              <input
                type="text"
                id="activationKey"
                value={activationKey}
                onChange={(e) => setActivationKey(e.target.value)}
                placeholder="Enter your activation key here"
                disabled={isLoading}
                className="input-key"
              />
            </div>

            {message.text && (
              <div className={`message message-${message.type}`}>
                {message.text}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading || !activationKey.trim()}
              className="btn-activate"
            >
              {isLoading ? 'Activating...' : 'Activate Application'}
            </button>
          </form>

          {/* Development/Testing Only - Hidden in Production */}
          {!isProduction && (
            <div className="test-section">
              <hr />
              <p className="test-label">🧪 Development Mode</p>
              <button 
                onClick={handleGenerateTestKey}
                className="btn-test"
                type="button"
              >
                Generate Test Key
              </button>
              {showTestKey && (
                <p className="test-info">
                  ⚠️ This feature is only available in development
                </p>
              )}
            </div>
          )}
        </div>

        <div className="activation-footer">
          <p>© 2026 MHMS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default ActivationView;
