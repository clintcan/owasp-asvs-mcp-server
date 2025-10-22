import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load both HIPAA mapping files
const hipaa4Data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'asvs-4.0.3-hipaa-mapping.json'), 'utf8'));
const hipaa5Data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'asvs-5.0.0-hipaa-mapping.json'), 'utf8'));

console.log('HIPAA ASVS Version Comparison\n');
console.log('='.repeat(80));

// Compare metadata
console.log('\nMetadata Comparison:');
console.log('  ASVS 4.0.3 - Total ASVS mappings:', hipaa4Data.metadata.total_asvs_mappings || 'N/A');
console.log('  ASVS 5.0.0 - Total ASVS mappings:', hipaa5Data.metadata.total_asvs_mappings || 'N/A');

// Count requirements by coverage type
function countByCoverage(data) {
  const counts = { full: 0, partial: 0, none: 0, unmapped: 0, total: 0 };
  data.categories.forEach(cat => {
    cat.sections.forEach(sec => {
      sec.requirements.forEach(req => {
        counts.total++;
        const coverage = req.asvs_coverage || 'full';
        counts[coverage] = (counts[coverage] || 0) + 1;
      });
    });
  });
  return counts;
}

const coverage4 = countByCoverage(hipaa4Data);
const coverage5 = countByCoverage(hipaa5Data);

console.log('\nCoverage Statistics:');
console.log('  ASVS 4.0.3:');
console.log('    Total requirements:', coverage4.total);
console.log('    Full coverage:     ', coverage4.full, '(' + ((coverage4.full/coverage4.total)*100).toFixed(1) + '%)');
console.log('    Partial coverage:  ', coverage4.partial, '(' + ((coverage4.partial/coverage4.total)*100).toFixed(1) + '%)');
console.log('    No coverage:       ', coverage4.none, '(' + ((coverage4.none/coverage4.total)*100).toFixed(1) + '%)');
console.log('    Unmapped:          ', coverage4.unmapped, '(' + ((coverage4.unmapped/coverage4.total)*100).toFixed(1) + '%)');

console.log('  ASVS 5.0.0:');
console.log('    Total requirements:', coverage5.total);
console.log('    Full coverage:     ', coverage5.full, '(' + ((coverage5.full/coverage5.total)*100).toFixed(1) + '%)');
console.log('    Partial coverage:  ', coverage5.partial, '(' + ((coverage5.partial/coverage5.total)*100).toFixed(1) + '%)');
console.log('    No coverage:       ', coverage5.none, '(' + ((coverage5.none/coverage5.total)*100).toFixed(1) + '%)');
console.log('    Unmapped:          ', coverage5.unmapped, '(' + ((coverage5.unmapped/coverage5.total)*100).toFixed(1) + '%)');

// Show some examples of converted mappings
console.log('\n' + '='.repeat(80));
console.log('Sample Mapping Conversions (first 10):');
console.log('='.repeat(80));

let sampleCount = 0;
hipaa4Data.categories.forEach(cat => {
  cat.sections.forEach(sec => {
    sec.requirements.forEach(req => {
      if (sampleCount < 10 && req.owasp_asvs_mapping && req.owasp_asvs_mapping.length > 0) {
        // Find corresponding requirement in 5.0.0 data
        const req5 = hipaa5Data.categories
          .flatMap(c => c.sections)
          .flatMap(s => s.requirements)
          .find(r => r.id === req.id);

        if (req5) {
          console.log(`\n${req.id} - ${req.description.substring(0, 50)}...`);
          console.log(`  4.0.3: ${req.owasp_asvs_mapping.join(', ')}`);
          console.log(`  5.0.0: ${req5.owasp_asvs_mapping.join(', ')}`);
          sampleCount++;
        }
      }
    });
  });
});

console.log('\n' + '='.repeat(80));
console.log('\n✅ Comparison complete!\n');
