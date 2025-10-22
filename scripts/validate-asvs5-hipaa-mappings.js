import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const asvs5Data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'asvs-5.0.0.json'), 'utf8'));
const hipaaData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'asvs-5.0.0-hipaa-mapping.json'), 'utf8'));

const asvs5Index = new Map();
asvs5Data.Requirements.forEach(chapter => {
  chapter.Items.forEach(section => {
    section.Items.forEach(requirement => {
      asvs5Index.set(requirement.Shortcode, requirement);
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
const invalidList = [];

console.log('ASVS 5.0.0 HIPAA MAPPING VALIDATION\n');
console.log('Total mappings found:', mappings.length);
console.log('\nChecking validity...\n');

mappings.forEach(m => {
  const shortcode = 'V' + m.asvsMapping.replace('v5.0.0-', '');
  if (!asvs5Index.has(shortcode)) {
    console.log('❌ INVALID:', m.hipaaId, '->', m.asvsMapping, '(' + shortcode + ')');
    console.log('   ', m.hipaaDesc.substring(0, 70) + '...\n');
    invalidList.push({
      hipaaId: m.hipaaId,
      hipaaDesc: m.hipaaDesc,
      asvsMapping: m.asvsMapping,
      shortcode: shortcode
    });
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
  console.log('\n🎉 SUCCESS! All ASVS 5.0.0 mappings are valid!');
  process.exit(0);
} else {
  console.log('\n⚠️  There are', invalid, 'invalid mapping(s) that need correction.');

  // Save invalid mappings to file for review
  fs.writeFileSync(
    path.join(__dirname, 'invalid-asvs5-mappings.json'),
    JSON.stringify(invalidList, null, 2)
  );
  console.log('Invalid mappings saved to: scripts/invalid-asvs5-mappings.json');

  process.exit(1);
}
