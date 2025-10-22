import fs from 'fs';

const data = JSON.parse(fs.readFileSync('data/asvs-5.0.0.json', 'utf8'));

console.log('ASVS 5.0.0 Structure:\n');
console.log('='.repeat(80));

data.Requirements.forEach((chapter, i) => {
  const totalReqs = chapter.Items.reduce((sum, section) => sum + section.Items.length, 0);
  console.log(`\n${i+1}. ${chapter.Shortcode} - ${chapter.Name} (${totalReqs} requirements)`);
  chapter.Items.forEach(section => {
    console.log(`   ${section.Shortcode} - ${section.Name} (${section.Items.length} requirements)`);
  });
});

console.log('\n' + '='.repeat(80));
console.log('\nTotal chapters:', data.Requirements.length);
console.log('Total requirements:', data.Requirements.reduce((sum, ch) =>
  sum + ch.Items.reduce((s, sec) => s + sec.Items.length, 0), 0
));
