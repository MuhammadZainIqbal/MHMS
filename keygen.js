#!/usr/bin/env node

/**
 * MHMS License Key Generator
 * 
 * This is a developer-only tool to generate activation keys for clients.
 * 
 * Usage:
 *   node keygen.js <MACHINE-ID>
 * 
 * Example:
 *   node keygen.js d464c01d-3cbe-4e75-b200-2f34136ad222
 * 
 * The script will output a SHA-256 hash that can be used as an activation key
 * for the MHMS application on the specified machine.
 */

import crypto from 'crypto';

// Secret salt - KEEP THIS SECRET! Change this to your own unique value.
const SECRET_SALT = 'mhms-secret-salt-2026-grandpalace';

/**
 * Generate activation key for a given machine ID
 * @param {string} machineId - The machine ID from the client
 * @returns {string} - SHA-256 activation key
 */
function generateActivationKey(machineId) {
  if (!machineId || typeof machineId !== 'string') {
    throw new Error('Invalid machine ID');
  }

  const hash = crypto
    .createHash('sha256')
    .update(machineId + SECRET_SALT)
    .digest('hex');

  return hash;
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\n========================================');
    console.log('   MHMS License Key Generator');
    console.log('========================================\n');
    console.log('Usage:');
    console.log('  node keygen.js <MACHINE-ID>\n');
    console.log('Example:');
    console.log('  node keygen.js d464c01d-3cbe-4e75-b200-2f34136ad222\n');
    console.log('The client can get their Machine ID by running the MHMS app.');
    console.log('It will be displayed on the activation screen.\n');
    process.exit(1);
  }

  const machineId = args[0];

  try {
    const activationKey = generateActivationKey(machineId);

    console.log('\n========================================');
    console.log('   ACTIVATION KEY GENERATED');
    console.log('========================================\n');
    console.log('Machine ID:');
    console.log('  ' + machineId + '\n');
    console.log('Activation Key:');
    console.log('  ' + activationKey + '\n');
    console.log('========================================\n');
    console.log('Copy the activation key above and send it to your client.');
    console.log('They should enter it in the MHMS activation screen.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
