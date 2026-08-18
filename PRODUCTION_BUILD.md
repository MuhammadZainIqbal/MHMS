# MHMS Production Build Guide

## 🚀 Building for Production

This guide explains how to create a production-ready Windows installer for MHMS.

## Prerequisites

Before building, ensure you have:
- Node.js installed (v18 or later)
- All dependencies installed (`npm install`)
- Application icon in `assets/icon.ico` (optional but recommended)

## Build Commands

### 1. Package the Application
Creates a distributable package without installer:
```bash
npm run package
```

Output: `out/mhms-win32-x64/` folder with executable

### 2. Create Windows Installer
Creates a full Windows installer using Squirrel.Windows:
```bash
npm run make
```

Output: `out/make/squirrel.windows/x64/` folder with installer files

## Production Configuration

### Current Settings

**Application Metadata** (from `package.json`):
- **Name:** Grand Palace - Marriage Hall System
- **Version:** 1.0.0
- **Executable:** GrandPalaceMHMS.exe
- **Author:** Zain Iqbal

**Security Features:**
- ✅ Developer Tools (F12) disabled in production
- ✅ Test key generator hidden in production builds
- ✅ Context isolation enabled
- ✅ Node integration disabled
- ✅ ASAR integrity validation
- ✅ Hardware-locked licensing

**Build Configuration** (from `forge.config.js`):
- Native modules unpacked (better-sqlite3, node-machine-id)
- Squirrel.Windows maker configured
- Icon path: `./assets/icon.ico`
- Loading GIF path: `./assets/loading.gif` (optional)

## Step-by-Step Production Build

### Step 1: Prepare Application
1. Test the application thoroughly in development mode
2. Ensure database operations work correctly
3. Verify licensing system functions properly
4. Test backup/restore functionality

### Step 2: Add Application Icon (Recommended)
1. Create or obtain a 256x256 pixel icon
2. Convert to `.ico` format with multiple sizes
3. Save as `assets/icon.ico`
4. (Optional) Add `assets/loading.gif` for installer

### Step 3: Clean Previous Builds
```bash
# Remove old build artifacts
rm -rf out/
```

### Step 4: Run Production Build
```bash
npm run make
```

This will:
1. Bundle all source code
2. Compile native modules for Windows
3. Package the application with Electron
4. Create Squirrel.Windows installer
5. Output installer files to `out/make/squirrel.windows/x64/`

### Step 5: Locate Installer Files
After successful build, find these files in `out/make/squirrel.windows/x64/`:

- **Setup.exe** - Main installer (distribute this to clients)
- **RELEASES** - Update metadata file
- **GrandPalaceMHMS-{version}-full.nupkg** - Full package
- Other supporting files

### Step 6: Test Installation
1. Copy `Setup.exe` to a clean test machine
2. Run the installer
3. Verify application installs correctly
4. Test activation with a generated key
5. Test all major features
6. Verify database backup/restore works

## Distribution

### What to Send to Clients

**For First-Time Installation:**
1. Send `Setup.exe` from the build output
2. Provide installation instructions
3. Request their Machine ID after installation
4. Generate and send them an activation key using `keygen.js`

**Installation Steps for Clients:**
1. Download `Setup.exe`
2. Run the installer (may show Windows SmartScreen warning - click "More info" → "Run anyway")
3. Application installs to: `%LocalAppData%\GrandPalaceMHMS\`
4. Shortcut created on Desktop and Start Menu
5. Launch the application
6. Copy the Machine ID displayed on activation screen
7. Send Machine ID to you (vendor)
8. Receive and enter activation key
9. Application is ready to use!

## Installer Behavior

**Installation:**
- Installs to: `C:\Users\{Username}\AppData\Local\GrandPalaceMHMS\`
- Creates desktop shortcut
- Adds to Start Menu
- Database stored in: `C:\Users\{Username}\AppData\Roaming\mhms\mhms.db`

**Updates:**
- Currently manual - distribute new `Setup.exe` for updates
- Database preserved during updates
- License key preserved during updates

**Uninstallation:**
- Run uninstaller from: `C:\Users\{Username}\AppData\Local\GrandPalaceMHMS\Update.exe --uninstall`
- Or use Windows "Add or Remove Programs"
- Database files remain (in AppData\Roaming\mhms) for safety
- Can be manually deleted if needed

## Code Signing (Optional but Recommended)

To avoid Windows SmartScreen warnings, sign your executable with a code signing certificate:

1. Obtain a code signing certificate from:
   - Sectigo
   - DigiCert
   - GlobalSign

2. Add to `forge.config.js` packagerConfig:
```javascript
packagerConfig: {
  // ... existing config
  osxSign: {},
  windowsSign: {
    certificateFile: './path/to/certificate.pfx',
    certificatePassword: 'your-password'
  }
}
```

## Troubleshooting

**Build fails with native module errors:**
```bash
npm rebuild better-sqlite3 --build-from-source
npm rebuild node-machine-id
npm run make
```

**"Cannot find module" errors after build:**
- Check that native modules are in `asarUnpack` list in `forge.config.js`
- Verify `vite.main.config.mjs` has correct `external` configuration

**Database not found after installation:**
- Verify user has write permissions to `AppData\Roaming\mhms\`
- Check console logs for database path errors

**Icon not showing:**
- Verify `assets/icon.ico` exists
- Ensure icon is proper .ico format with multiple sizes
- Rebuild the application

## Version Management

When releasing updates:

1. Update version in `package.json`:
```json
{
  "version": "1.1.0"
}
```

2. Update version in `forge.config.js`:
```javascript
packagerConfig: {
  appVersion: '1.1.0'
}
```

3. Rebuild and distribute new installer

## Developer Notes

**Environment Detection:**
- Development: `!app.isPackaged` returns `true`
- Production: `!app.isPackaged` returns `false`
- Used to hide test features in production

**Database Location:**
- Development: Same as production (AppData)
- Production: `%AppData%\Roaming\mhms\mhms.db`
- Backups: User-selected location with `.mhms-backup` extension

**Security:**
- Activation keys are hardware-locked SHA-256 hashes
- Secret salt is hardcoded (change for added security)
- Database encrypted? No (can be added if needed)

## Additional Resources

- [Electron Forge Documentation](https://www.electronforge.io/)
- [Squirrel.Windows Guide](https://github.com/Squirrel/Squirrel.Windows)
- [Code Signing Guide](https://www.electronjs.org/docs/latest/tutorial/code-signing)

---

For support: zainiqbal7007@gmail.com

© 2026 Zain Iqbal - Grand Palace MHMS
