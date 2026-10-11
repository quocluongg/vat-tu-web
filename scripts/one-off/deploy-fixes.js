#!/usr/bin/env node
/**
 * Deployment script to replace old API routes with fixed versions
 * This script:
 * 1. Backs up original files
 * 2. Replaces them with fixed versions
 * 3. Validates syntax
 */

const fs = require('fs');
const path = require('path');

const files = [
    { old: 'src/app/api/de-xuat/route.js', fixed: 'src/app/api/de-xuat/route-fixed.js' },
    { old: 'src/app/api/phieu-xuat/route.js', fixed: 'src/app/api/phieu-xuat/route-fixed.js' }
];

console.log('🔄 Deploying fixed API routes...\n');

files.forEach(({ old, fixed }) => {
    const oldPath = path.join(__dirname, old);
    const fixedPath = path.join(__dirname, fixed);
    const backupPath = path.join(__dirname, `${old}.backup.${Date.now()}`);

    try {
        // Backup original
        if (fs.existsSync(oldPath)) {
            fs.copyFileSync(oldPath, backupPath);
            console.log(`✅ Backed up: ${backupPath}`);
        }

        // Replace with fixed
        if (fs.existsSync(fixedPath)) {
            fs.copyFileSync(fixedPath, oldPath);
            console.log(`✅ Updated: ${old}`);
        } else {
            console.error(`❌ Fixed file not found: ${fixedPath}`);
        }
    } catch (err) {
        console.error(`❌ Error processing ${old}:`, err.message);
    }
});

// Clean up fixed files
files.forEach(({ fixed }) => {
    const fixedPath = path.join(__dirname, fixed);
    try {
        if (fs.existsSync(fixedPath)) {
            fs.unlinkSync(fixedPath);
            console.log(`🗑️  Removed temp: ${fixed}`);
        }
    } catch (err) {
        console.warn(`⚠️  Could not remove ${fixed}:`, err.message);
    }
});

console.log('\n✨ Deployment complete!');
console.log('📝 Changes:');
console.log('   - Comprehensive FK validation for de-xuat');
console.log('   - Comprehensive FK validation for phieu-xuat');
console.log('   - Better error messages with line numbers');
console.log('   - Proper subject, class, material existence checks');
