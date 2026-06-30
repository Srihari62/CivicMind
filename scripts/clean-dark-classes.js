const fs = require('fs');
const path = require('path');

const files = [
  'src/app/(dashboard)/admin/page.tsx',
  'src/app/(dashboard)/admin/reports/page.tsx',
  'src/app/(dashboard)/admin/officers/page.tsx',
  'src/app/(dashboard)/admin/profile/page.tsx'
];

files.forEach(file => {
  const filePath = path.join('/home/srihari/HACKATHON', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Remove dark:something classes. Regex matches 'dark:' followed by word chars, dashes, slashes, brackets etc
    const regex = /dark:[a-zA-Z0-9\-\/\[\]#:]+/g;
    content = content.replace(regex, '');
    
    // Clean up double spaces that might be left over from removing classes
    content = content.replace(/ +/g, ' ');
    // Clean up spaces before closing quotes in className string
    content = content.replace(/ \)/g, ')');
    content = content.replace(/ \"/g, '"');
    
    fs.writeFileSync(filePath, content);
    console.log(`Cleaned ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
