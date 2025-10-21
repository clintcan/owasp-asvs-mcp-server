#!/usr/bin/env node

/**
 * Fetch ISO 27001 mappings from OpenCRE for all ASVS requirements
 *
 * This script:
 * 1. Fetches all ASVS requirements from OpenCRE API
 * 2. For each requirement, gets linked CREs
 * 3. For each CRE, fetches ISO 27001 mappings
 * 4. Saves to data/opencre-iso27001-mappings.json
 *
 * Usage: node scripts/fetch-opencre-iso27001.js
 */

import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://www.opencre.org/rest/v1';
const OUTPUT_FILE = join(__dirname, '..', 'data', 'opencre-iso27001-mappings.json');
const REQUEST_DELAY = 150; // 150ms between requests to be nice to API

// Simple sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'OWASP-ASVS-MCP-Server-Mapper/1.0' }
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 404) {
        return null; // Not found is expected for some requests
      }

      console.error(`HTTP ${response.status} for ${url}, retrying...`);
      await sleep(1000 * (i + 1)); // Exponential backoff
    } catch (error) {
      console.error(`Error fetching ${url}:`, error.message);
      if (i === retries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }
  return null;
}

/**
 * Fetch all ASVS standards from OpenCRE
 */
async function fetchASVSStandards() {
  console.log('Fetching ASVS standards from OpenCRE...');
  const url = `${BASE_URL}/standard/ASVS?page=1&limit=2000`;
  const data = await fetchWithRetry(url);

  if (!data || !data.standards) {
    throw new Error('Failed to fetch ASVS standards');
  }

  console.log(`Found ${data.standards.length} ASVS requirements`);
  return data.standards;
}

/**
 * Fetch CRE details by ID
 */
async function fetchCRE(creId) {
  const url = `${BASE_URL}/id/${creId}`;
  const data = await fetchWithRetry(url);
  return data?.data || null;
}

/**
 * Extract ISO 27001 mappings from CRE
 */
function extractISO27001FromCRE(cre) {
  if (!cre || !cre.links) return [];

  const iso27001Links = cre.links.filter(
    link => link.document.name === 'ISO 27001' && link.document.sectionID
  );

  return iso27001Links.map(link => ({
    sectionID: link.document.sectionID,
    section: link.document.section || '',
    via_cre: cre.id
  }));
}

/**
 * Get ISO 27001 mappings for an ASVS requirement
 */
async function getISO27001ForASVS(asvsReq) {
  const asvsId = asvsReq.sectionID;

  if (!asvsReq.links || asvsReq.links.length === 0) {
    return [];
  }

  // Get CRE links
  const creLinks = asvsReq.links.filter(link => link.document.doctype === 'CRE');

  if (creLinks.length === 0) {
    return [];
  }

  const allMappings = [];

  // For each CRE, fetch its details and extract ISO 27001 mappings
  for (const creLink of creLinks) {
    if (!creLink.document.id) continue;

    await sleep(REQUEST_DELAY); // Rate limiting

    const creData = await fetchCRE(creLink.document.id);

    if (creData) {
      const iso27001Mappings = extractISO27001FromCRE(creData);
      allMappings.push(...iso27001Mappings);
    }
  }

  // Deduplicate by sectionID
  const seen = new Set();
  const unique = allMappings.filter(m => {
    if (seen.has(m.sectionID)) return false;
    seen.add(m.sectionID);
    return true;
  });

  return unique;
}

/**
 * Main function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  OpenCRE ISO 27001 Mapping Fetcher                    ║');
  console.log('║  Fetching mappings for ASVS requirements...           ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // Step 1: Fetch all ASVS standards
    const asvsStandards = await fetchASVSStandards();

    // Step 2: Process each ASVS requirement
    const mappings = {};
    let processed = 0;
    let withMappings = 0;

    for (const asvsReq of asvsStandards) {
      const asvsId = asvsReq.sectionID;

      if (!asvsId) continue;

      processed++;
      process.stdout.write(`\rProcessing ${processed}/${asvsStandards.length}: ${asvsId.padEnd(10)}`);

      const iso27001Mappings = await getISO27001ForASVS(asvsReq);

      if (iso27001Mappings.length > 0) {
        mappings[asvsId] = iso27001Mappings.map(m => m.sectionID);
        withMappings++;
      }
    }

    console.log('\n');

    // Step 3: Save to file
    const output = {
      _meta: {
        source: 'OpenCRE (https://www.opencre.org)',
        generated: new Date().toISOString(),
        total_asvs_requirements: asvsStandards.length,
        requirements_with_mappings: withMappings,
        coverage_percent: ((withMappings / asvsStandards.length) * 100).toFixed(1)
      },
      mappings
    };

    writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  Fetch Complete!                                       ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`✓ Total ASVS requirements:        ${asvsStandards.length}`);
    console.log(`✓ Requirements with ISO 27001:    ${withMappings}`);
    console.log(`✓ Coverage:                       ${output._meta.coverage_percent}%`);
    console.log(`✓ Time elapsed:                   ${elapsed}s`);
    console.log(`✓ Output:                         ${OUTPUT_FILE}`);
    console.log('');

    // Show some examples
    console.log('Sample mappings:');
    let count = 0;
    for (const [asvsId, iso27001Sections] of Object.entries(mappings)) {
      if (count++ >= 5) break;
      console.log(`  ${asvsId} → ISO 27001 ${iso27001Sections.join(', ')}`);
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

main();
