const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const fs = require('fs-extra');

module.exports = {
  packagerConfig: {
    name: 'Grand Palace - Marriage Hall System',
    executableName: 'GrandPalaceMHMS',
    appCopyright: 'Copyright © 2026 Zain Iqbal',
    appVersion: '1.0.0',
    // icon: './assets/icon', // Uncomment when you add icon files
    asar: false,
    prune: false,  // Don't prune node_modules - we need native modules
  },
  rebuildConfig: {},
  hooks: {
    postPackage: async (forgeConfig, options) => {
      console.log('[HOOK] postPackage: Copying native modules and dependencies...');
      
      const appPath = path.join(options.outputPaths[0], 'resources', 'app');
      const nodeModulesTarget = path.join(appPath, 'node_modules');
      
      // Create node_modules directory
      await fs.ensureDir(nodeModulesTarget);
      
      // List of modules to copy (better-sqlite3 and all its dependencies)
      const modulesToCopy = [
        'better-sqlite3',
        'bindings',
        'file-uri-to-path',
        'node-machine-id'
      ];
      
      for (const moduleName of modulesToCopy) {
        const moduleSource = path.join(process.cwd(), 'node_modules', moduleName);
        const moduleTarget = path.join(nodeModulesTarget, moduleName);
        
        if (await fs.pathExists(moduleSource)) {
          console.log(`[HOOK] Copying ${moduleName}...`);
          await fs.copy(moduleSource, moduleTarget, { dereference: true });
        } else {
          console.log(`[HOOK] Warning: ${moduleName} not found, skipping`);
        }
      }
      
      console.log('[HOOK] ✓ All native modules and dependencies copied successfully');
    }
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'GrandPalaceMHMS',
        authors: 'Zain Iqbal',
        description: 'Grand Palace - Marriage Hall Management System',
        // setupIcon: './assets/icon.ico', // Uncomment when you add icon.ico
        // loadingGif: './assets/loading.gif' // Optional: Add loading animation
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'src/main.js',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};
