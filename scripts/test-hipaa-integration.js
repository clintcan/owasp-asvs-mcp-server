import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('HIPAA Integration Test\n');
console.log('='.repeat(80));

// Load HIPAA mapping
const hipaaData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'asvs-5.0.0-hipaa-mapping.json'), 'utf8'));

// Load ASVS data
const asvsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'asvs-5.0.0.json'), 'utf8'));

// Build ASVS index
const asvsIndex = new Map();
asvsData.Requirements.forEach(chapter => {
  chapter.Items.forEach(section => {
    section.Items.forEach(requirement => {
      asvsIndex.set(requirement.Shortcode, requirement);
    });
  });
});

// Test 1: Count HIPAA requirements
let hipaaCount = 0;
for (const category of hipaaData.categories) {
  for (const section of category.sections) {
    hipaaCount += section.requirements.length;
  }
}

console.log('Test 1: HIPAA Data Loaded');
console.log(`  ✓ Total HIPAA requirements: ${hipaaCount}`);
console.log(`  ✓ HIPAA categories: ${hipaaData.categories.length}`);
console.log();

// Test 2: Build bidirectional index (ASVS → HIPAA)
const asvsToHipaa = new Map();
let totalMappings = 0;

for (const category of hipaaData.categories) {
  for (const section of category.sections) {
    for (const hipaaReq of section.requirements) {
      for (const asvsMapping of hipaaReq.owasp_asvs_mapping || []) {
        totalMappings++;
        // Convert "v5.0.0-1.2.3" to "V1.2.3"
        const asvsId = 'V' + asvsMapping.replace('v5.0.0-', '');

        if (!asvsToHipaa.has(asvsId)) {
          asvsToHipaa.set(asvsId, []);
        }
        asvsToHipaa.get(asvsId).push(hipaaReq);
      }
    }
  }
}

console.log('Test 2: Bidirectional Index Built');
console.log(`  ✓ Total HIPAA → ASVS mappings: ${totalMappings}`);
console.log(`  ✓ ASVS requirements with HIPAA mappings: ${asvsToHipaa.size}`);
console.log();

// Test 3: Verify all ASVS mappings are valid
let invalidMappings = 0;
for (const category of hipaaData.categories) {
  for (const section of category.sections) {
    for (const hipaaReq of section.requirements) {
      for (const asvsMapping of hipaaReq.owasp_asvs_mapping || []) {
        const asvsId = 'V' + asvsMapping.replace('v5.0.0-', '');
        if (!asvsIndex.has(asvsId)) {
          console.log(`  ❌ Invalid mapping: ${hipaaReq.id} → ${asvsMapping} (${asvsId})`);
          invalidMappings++;
        }
      }
    }
  }
}

console.log('Test 3: Mapping Validation');
if (invalidMappings === 0) {
  console.log(`  ✓ All ${totalMappings} ASVS mappings are valid`);
} else {
  console.log(`  ❌ Found ${invalidMappings} invalid mappings`);
}
console.log();

// Test 4: Sample ASVS → HIPAA lookups
console.log('Test 4: Sample ASVS → HIPAA Lookups');
const sampleAsvs = ['V6.2.1', 'V15.1.1', 'V8.2.1', 'V7.2.1', 'V11.3.1'];

for (const asvsId of sampleAsvs) {
  const hipaaRefs = asvsToHipaa.get(asvsId);
  if (hipaaRefs && hipaaRefs.length > 0) {
    console.log(`  ${asvsId}:`);
    hipaaRefs.forEach(h => {
      console.log(`    → ${h.id} (${h.hipaa_reference}): ${h.description.substring(0, 50)}...`);
    });
  } else {
    console.log(`  ${asvsId}: No HIPAA mappings`);
  }
}
console.log();

// Test 5: Sample HIPAA → ASVS lookups
console.log('Test 5: Sample HIPAA → ASVS Lookups');
const sampleHipaa = ['H1.1.1', 'H3.1.1', 'H4.1.1'];

for (const hipaaId of sampleHipaa) {
  let found = false;
  for (const category of hipaaData.categories) {
    for (const section of category.sections) {
      const hipaaReq = section.requirements.find(r => r.id === hipaaId);
      if (hipaaReq) {
        found = true;
        console.log(`  ${hipaaId}: ${hipaaReq.description.substring(0, 50)}...`);
        console.log(`    ASVS mappings: ${hipaaReq.owasp_asvs_mapping.join(', ')}`);
        break;
      }
    }
    if (found) break;
  }
  if (!found) {
    console.log(`  ${hipaaId}: Not found`);
  }
}
console.log();

// Test 6: Coverage statistics
console.log('Test 6: HIPAA Coverage Statistics');
let fullCoverage = 0;
let partialCoverage = 0;
let noCoverage = 0;

for (const category of hipaaData.categories) {
  for (const section of category.sections) {
    for (const hipaaReq of section.requirements) {
      const coverage = hipaaReq.asvs_coverage || 'full';
      if (coverage === 'full') fullCoverage++;
      else if (coverage === 'partial') partialCoverage++;
      else if (coverage === 'none') noCoverage++;
    }
  }
}

console.log(`  Full coverage:    ${fullCoverage} (${((fullCoverage/hipaaCount)*100).toFixed(1)}%)`);
console.log(`  Partial coverage: ${partialCoverage} (${((partialCoverage/hipaaCount)*100).toFixed(1)}%)`);
console.log(`  No coverage:      ${noCoverage} (${((noCoverage/hipaaCount)*100).toFixed(1)}%)`);
console.log();

console.log('='.repeat(80));
console.log('✅ HIPAA Integration Test Complete\n');
