#!/usr/bin/env node

/**
 * Parse NIST markdown mapping file into JSON format
 * Converts the markdown table from OWASP ASVS into usable JSON
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/asvs-nist-mapping.md');
const outputFile = path.join(__dirname, '../data/asvs-nist-mapping.json');

// Read the markdown file
const content = fs.readFileSync(inputFile, 'utf8');

// Parse the markdown table
const lines = content.split('\n');
const mapping = {};

for (const line of lines) {
  // Match lines like: | **2.1.1** | 5.1.1.2 |
  const match = line.match(/\|\s*\*\*([0-9.]+)\*\*\s*\|\s*([^|]*?)\s*\|/);

  if (match) {
    const asvsId = match[1].trim();
    const nistSection = match[2].trim();

    // Only add if there's a NIST section (not empty)
    if (nistSection && nistSection !== '') {
      // Handle multiple NIST sections separated by comma or slash
      const nistSections = nistSection
        .split(/[,\/]/)
        .map(s => s.trim())
        .filter(s => s !== '');

      if (nistSections.length > 0) {
        mapping[asvsId] = nistSections;
      }
    }
  }
}

// Write the JSON file
fs.writeFileSync(outputFile, JSON.stringify(mapping, null, 2));

console.log(`Parsed ${Object.keys(mapping).length} NIST mappings`);
console.log(`Output written to: ${outputFile}`);
