#!/usr/bin/env node

/**
 * Script to update the local ASVS data file from the official OWASP repository
 * Run this when you want to update to the latest ASVS data
 */

import fetch from 'node-fetch';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ASVS_URL = "https://raw.githubusercontent.com/OWASP/ASVS/refs/heads/master/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.json";
const OUTPUT_PATH = join(__dirname, '..', 'data', 'asvs-5.0.0.json');

async function updateASVSData() {
  console.log('Downloading ASVS 5.0.0 data from OWASP repository...');
  console.log(`URL: ${ASVS_URL}`);

  try {
    const response = await fetch(ASVS_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Ensure data directory exists
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

    // Write to file
    writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ Successfully updated ASVS data!`);
    console.log(`📁 File saved to: ${OUTPUT_PATH}`);
    console.log(`📊 File size: ${(JSON.stringify(data).length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Failed to update ASVS data:', error.message);
    process.exit(1);
  }
}

updateASVSData();
