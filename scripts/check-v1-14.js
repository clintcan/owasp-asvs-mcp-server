import fs from 'fs';

const data = JSON.parse(fs.readFileSync('data/asvs-4.0.3.json', 'utf8'));
const v1 = data.Requirements.find(r => r.Shortcode === 'V1');
const v1_1 = v1.Items.find(s => s.Shortcode === 'V1.1');
const v1_14 = v1.Items.find(s => s.Shortcode === 'V1.14');
const v14 = data.Requirements.find(r => r.Shortcode === 'V14');

console.log('V1.1 Secure Software Development Lifecycle:');
v1_1.Items.forEach(i => console.log(`  ${i.Shortcode}: ${i.Description.substring(0, 80)}`));

console.log('\nV1.14 Configuration Architecture:');
v1_14.Items.forEach(i => console.log(`  ${i.Shortcode}: ${i.Description.substring(0, 80)}`));

console.log('\nV14 (if exists):');
if (v14) {
  v14.Items.forEach(s => {
    console.log(`  ${s.Shortcode} ${s.Name}:`);
    s.Items.forEach(i => console.log(`    ${i.Shortcode}: ${i.Description.substring(0, 70)}`));
  });
} else {
  console.log('  V14 chapter does not exist in ASVS 4.0.3');
}
