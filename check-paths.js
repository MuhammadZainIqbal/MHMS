/**
 * Path Verification Script for Production Debugging
 * This script logs all critical paths to a text file on the user's desktop
 */

const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

app.on('ready', () => {
  const desktopPath = path.join(os.homedir(), 'Desktop', 'MHMS-Path-Check.txt');
  
  const pathInfo = [
    '=== MHMS Path Verification Report ===',
    `Generated: ${new Date().toISOString()}`,
    '',
    '--- Application Paths ---',
    `app.isPackaged: ${app.isPackaged}`,
    `process.resourcesPath: ${process.resourcesPath}`,
    `app.getAppPath(): ${app.getAppPath()}`,
    `app.getPath('userData'): ${app.getPath('userData')}`,
    `app.getPath('exe'): ${app.getPath('exe')}`,
    '',
    '--- Expected Native Module Path ---',
    `better-sqlite3 expected at: ${path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'better-sqlite3')}`,
    '',
    '--- Directory Existence Checks ---',
    `resources folder exists: ${fs.existsSync(process.resourcesPath)}`,
    `app.asar exists: ${fs.existsSync(path.join(process.resourcesPath, 'app.asar'))}`,
    `app.asar.unpacked exists: ${fs.existsSync(path.join(process.resourcesPath, 'app.asar.unpacked'))}`,
    ''
  ];

  // Check for better-sqlite3 in unpacked location
  const sqlitePath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'better-sqlite3');
  if (fs.existsSync(sqlitePath)) {
    pathInfo.push('✓ better-sqlite3 found in unpacked location');
    try {
      const files = fs.readdirSync(sqlitePath);
      pathInfo.push('  Contents: ' + files.join(', '));
      
      const buildPath = path.join(sqlitePath, 'build', 'Release');
      if (fs.existsSync(buildPath)) {
        const buildFiles = fs.readdirSync(buildPath);
        pathInfo.push('  Build files: ' + buildFiles.join(', '));
      }
    } catch (err) {
      pathInfo.push('  Error reading directory: ' + err.message);
    }
  } else {
    pathInfo.push('✗ better-sqlite3 NOT FOUND in unpacked location');
  }

  pathInfo.push('');
  pathInfo.push('--- Node Environment ---');
  pathInfo.push(`Node version: ${process.version}`);
  pathInfo.push(`Electron version: ${process.versions.electron}`);
  pathInfo.push(`Platform: ${process.platform}`);
  pathInfo.push(`Arch: ${process.arch}`);
  pathInfo.push('');
  pathInfo.push('=== End of Report ===');

  const report = pathInfo.join('\n');
  
  fs.writeFileSync(desktopPath, report, 'utf8');
  console.log('[PATH-CHECK] Report written to:', desktopPath);
  console.log(report);
  
  // Exit after writing the report
  setTimeout(() => {
    app.quit();
  }, 1000);
});
