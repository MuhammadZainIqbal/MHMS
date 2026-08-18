import React, { useState, useEffect } from 'react';
import ActivationView from './ActivationView';
import MainApp from './MainApp';
import RepairView from './RepairView';

/**
 * Root App Component
 * Manages the application state based on license activation and database health
 * Shows RepairView if database is corrupted, ActivationView if not licensed, MainApp if all OK
 */
function App() {
  const [isActivated, setIsActivated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDatabaseHealthy, setIsDatabaseHealthy] = useState(true);

  useEffect(() => {
    checkAppHealth();
    
    // Listen for license status changes from main process
    window.api.onLicenseStatusChanged((status) => {
      setIsActivated(status);
    });
  }, []);

  const checkAppHealth = async () => {
    setIsChecking(true);
    try {
      // Check database health first
      const dbHealth = await window.api.checkDatabaseHealth();
      setIsDatabaseHealthy(dbHealth);

      // Only check license if database is healthy
      if (dbHealth) {
        const status = await window.api.checkLicenseStatus();
        setIsActivated(status);
      }
    } catch (error) {
      console.error('Failed to check app health:', error);
      setIsDatabaseHealthy(false);
      setIsActivated(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleActivated = () => {
    setIsActivated(true);
  };

  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '18px'
      }}>
        Initializing application...
      </div>
    );
  }

  // Show repair view if database is corrupted/missing
  if (!isDatabaseHealthy) {
    return <RepairView />;
  }

  return (
    <>
      {!isActivated ? (
        <ActivationView onActivated={handleActivated} />
      ) : (
        <MainApp />
      )}
    </>
  );
}

export default App;
