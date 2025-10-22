#!/usr/bin/env node
/**
 * Validates HIPAA to ASVS 4.0.3 mappings for consistency
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load data files
const asvsPath = path.join(__dirname, '..', 'data', 'asvs-4.0.3.json');
const hipaaPath = path.join(__dirname, '..', 'data', 'hipaa_security_privacy_asvs_4.0.3.json');

const asvsData = JSON.parse(fs.readFileSync(asvsPath, 'utf8'));
const hipaaData = JSON.parse(fs.readFileSync(hipaaPath, 'utf8'));

// Build ASVS requirement index
const asvsIndex = new Map();
asvsData.Requirements.forEach(chapter => {
  chapter.Items.forEach(section => {
    section.Items.forEach(requirement => {
      asvsIndex.set(requirement.Shortcode, {
        id: requirement.Shortcode,
        description: requirement.Description,
        chapter: chapter.Shortcode,
        chapterName: chapter.Name,
        section: section.Shortcode,
        sectionName: section.Name,
        L1: requirement.L1.Required,
        L2: requirement.L2.Required,
        L3: requirement.L3.Required
      });
    });
  });
});

console.log(`✓ Loaded ${asvsIndex.size} ASVS 4.0.3 requirements\n`);

// Extract all HIPAA mappings
const hipaaMappings = [];
hipaaData.categories.forEach(category => {
  category.sections.forEach(section => {
    section.requirements.forEach(requirement => {
      if (requirement.owasp_asvs_mapping) {
        requirement.owasp_asvs_mapping.forEach(mapping => {
          hipaaMappings.push({
            hipaaId: requirement.id,
            hipaaDesc: requirement.description,
            hipaaCategory: category.name,
            hipaaSection: section.name,
            asvsMapping: mapping,
            hipaaLevel: requirement.level
          });
        });
      }
    });
  });
});

console.log(`✓ Found ${hipaaMappings.length} HIPAA→ASVS mappings\n`);

// Validation results
const issues = {
  invalidMappings: [],
  formatIssues: [],
  levelMismatches: [],
  warnings: []
};

// Validate each mapping
hipaaMappings.forEach(mapping => {
  const asvsId = mapping.asvsMapping;

  // Check format: should be "v4.0.3-X.Y.Z"
  const formatRegex = /^v4\.0\.3-\d+\.\d+\.\d+$/;
  if (!formatRegex.test(asvsId)) {
    issues.formatIssues.push({
      hipaaId: mapping.hipaaId,
      asvsMapping: asvsId,
      issue: 'Invalid format (expected v4.0.3-X.Y.Z)'
    });
    return;
  }

  // Extract ASVS shortcode (e.g., "V1.1.1" from "v4.0.3-1.1.1")
  const shortcode = 'V' + asvsId.replace('v4.0.3-', '');

  // Check if ASVS requirement exists
  const asvsReq = asvsIndex.get(shortcode);
  if (!asvsReq) {
    issues.invalidMappings.push({
      hipaaId: mapping.hipaaId,
      hipaaDesc: mapping.hipaaDesc.substring(0, 80) + '...',
      asvsMapping: asvsId,
      shortcode: shortcode,
      issue: 'ASVS requirement not found'
    });
    return;
  }

  // Check level alignment (HIPAA L1/Required should map to ASVS L1 or L2)
  const hipaaLevel = mapping.hipaaLevel[0]; // e.g., "L1", "L2", "L3"
  const hipaaType = mapping.hipaaDesc.includes('Required') ? 'Required' : 'Addressable';

  if (hipaaLevel === 'L1' && hipaaType === 'Required') {
    // HIPAA L1 Required should ideally map to ASVS L1 or L2
    if (!asvsReq.L1 && !asvsReq.L2) {
      issues.warnings.push({
        hipaaId: mapping.hipaaId,
        asvsMapping: asvsId,
        issue: `HIPAA L1 Required maps to ASVS L3-only requirement (${shortcode})`
      });
    }
  }
});

// Report findings
console.log('='.repeat(80));
console.log('VALIDATION RESULTS');
console.log('='.repeat(80));

if (issues.formatIssues.length > 0) {
  console.log(`\n❌ FORMAT ISSUES (${issues.formatIssues.length}):`);
  issues.formatIssues.forEach(issue => {
    console.log(`  ${issue.hipaaId}: "${issue.asvsMapping}" - ${issue.issue}`);
  });
}

if (issues.invalidMappings.length > 0) {
  console.log(`\n❌ INVALID MAPPINGS (${issues.invalidMappings.length}):`);
  issues.invalidMappings.forEach(issue => {
    console.log(`  ${issue.hipaaId} → ${issue.asvsMapping} (${issue.shortcode})`);
    console.log(`     HIPAA: ${issue.hipaaDesc}`);
    console.log(`     Issue: ${issue.issue}\n`);
  });
}

if (issues.warnings.length > 0) {
  console.log(`\n⚠️  WARNINGS (${issues.warnings.length}):`);
  issues.warnings.forEach(issue => {
    console.log(`  ${issue.hipaaId} → ${issue.asvsMapping}: ${issue.issue}`);
  });
}

if (issues.invalidMappings.length === 0 && issues.formatIssues.length === 0) {
  console.log('\n✅ ALL MAPPINGS ARE VALID!');
  console.log(`   - ${hipaaMappings.length} total mappings checked`);
  console.log(`   - ${new Set(hipaaMappings.map(m => m.asvsMapping)).size} unique ASVS requirements referenced`);
  console.log(`   - ${issues.warnings.length} warnings (non-critical)`);
}

// Coverage analysis
console.log('\n' + '='.repeat(80));
console.log('COVERAGE ANALYSIS');
console.log('='.repeat(80));

const chapterCoverage = new Map();
asvsData.Requirements.forEach(chapter => {
  chapterCoverage.set(chapter.Shortcode, {
    name: chapter.Name,
    total: 0,
    mapped: new Set()
  });
});

// Count total requirements per chapter
asvsData.Requirements.forEach(chapter => {
  const coverage = chapterCoverage.get(chapter.Shortcode);
  chapter.Items.forEach(section => {
    coverage.total += section.Items.length;
  });
});

// Count mapped requirements
hipaaMappings.forEach(mapping => {
  const shortcode = 'V' + mapping.asvsMapping.replace('v4.0.3-', '');
  const chapter = shortcode.split('.')[0]; // e.g., "V1"
  const coverage = chapterCoverage.get(chapter);
  if (coverage) {
    coverage.mapped.add(shortcode);
  }
});

console.log('\nASVS Chapter Coverage by HIPAA Mappings:\n');
chapterCoverage.forEach((coverage, chapter) => {
  const mappedCount = coverage.mapped.size;
  const percentage = ((mappedCount / coverage.total) * 100).toFixed(1);
  const bar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
  console.log(`${chapter.padEnd(4)} ${coverage.name.substring(0, 35).padEnd(35)} ${bar} ${percentage}% (${mappedCount}/${coverage.total})`);
});

// Summary statistics
console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total HIPAA requirements:        ${hipaaData.categories.reduce((sum, cat) => sum + cat.sections.reduce((s, sec) => s + sec.requirements.length, 0), 0)}`);
console.log(`Total HIPAA→ASVS mappings:       ${hipaaMappings.length}`);
console.log(`Unique ASVS requirements mapped: ${new Set(hipaaMappings.map(m => m.asvsMapping)).size}`);
console.log(`Invalid mappings:                ${issues.invalidMappings.length}`);
console.log(`Format issues:                   ${issues.formatIssues.length}`);
console.log(`Warnings:                        ${issues.warnings.length}`);

const exitCode = (issues.invalidMappings.length + issues.formatIssues.length) > 0 ? 1 : 0;
process.exit(exitCode);
