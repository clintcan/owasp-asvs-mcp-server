import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const asvsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'asvs-4.0.3.json'), 'utf8'));
const hipaaData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'hipaa_security_privacy_asvs_4.0.3_CORRECTED.json'), 'utf8'));

const asvsIndex = new Map();
asvsData.Requirements.forEach(chapter => {
  chapter.Items.forEach(section => {
    section.Items.forEach(requirement => {
      asvsIndex.set(requirement.Shortcode, requirement);
    });
  });
});

const mappings = [];
hipaaData.categories.forEach(cat => {
  cat.sections.forEach(sec => {
    sec.requirements.forEach(req => {
      if (req.owasp_asvs_mapping && req.owasp_asvs_mapping.length > 0) {
        req.owasp_asvs_mapping.forEach(m => {
          mappings.push({
            hipaaId: req.id,
            hipaaDesc: req.description,
            asvsMapping: m
          });
        });
      }
    });
  });
});

let invalid = 0;
let valid = 0;

console.log('CORRECTED FILE VALIDATION\n');
console.log('Total mappings found:', mappings.length);
console.log('\nChecking validity...\n');

mappings.forEach(m => {
  const shortcode = 'V' + m.asvsMapping.replace('v4.0.3-', '');
  if (!asvsIndex.has(shortcode)) {
    console.log('❌ INVALID:', m.hipaaId, '->', m.asvsMapping, '(' + shortcode + ')');
    console.log('   ', m.hipaaDesc.substring(0, 70) + '...\n');
    invalid++;
  } else {
    valid++;
  }
});

console.log('='.repeat(80));
console.log('RESULTS');
console.log('='.repeat(80));
console.log('✅ Valid mappings:   ', valid, '(' + ((valid/mappings.length)*100).toFixed(1) + '%)');
console.log('❌ Invalid mappings: ', invalid, '(' + ((invalid/mappings.length)*100).toFixed(1) + '%)');
console.log('📊 Total:            ', mappings.length);

if (invalid === 0) {
  console.log('\n🎉 SUCCESS! All mappings are now valid!');
  process.exit(0);
} else {
  console.log('\n⚠️  There are still', invalid, 'invalid mapping(s) that need correction.');
  process.exit(1);
}
