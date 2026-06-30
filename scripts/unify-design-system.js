const fs = require('fs');
const path = require('path');

const walk = (dir, results = []) => {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      walk(file, results);
    } else { 
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
};

// Target specifically the dashboard pages and components
const dirsToClean = [
  path.join('/home/srihari/HACKATHON/src/app/(dashboard)/reports'),
  path.join('/home/srihari/HACKATHON/src/app/(dashboard)/officer/reports'),
  path.join('/home/srihari/HACKATHON/src/app/(dashboard)/admin/reports'),
  path.join('/home/srihari/HACKATHON/src/components/dashboard'),
  path.join('/home/srihari/HACKATHON/src/components/admin') // just in case
];

let files = [];
dirsToClean.forEach(dir => {
  if (fs.existsSync(dir)) {
    files = files.concat(walk(dir));
  }
});

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Remove `dark:` classes
  content = content.replace(/dark:[a-zA-Z0-9\-\/\[\]#:]+/g, '');

  // 2. Convert specific hardcoded dark-mode layout wrappers to clay-card
  // Regex to catch large black/zinc backdrop wrappers
  content = content.replace(/border border-white\/[0-9]+ bg-(black|zinc-[0-9]+)\/[0-9]+ p-[0-9]+ backdrop-blur-(md|sm) shadow-(2xl|xl|lg|md|sm)/g, 'clay-card p-6');
  
  // Specific common structures
  content = content.replace(/bg-zinc-950 text-white/g, 'bg-slate-50 text-slate-800');
  content = content.replace(/bg-zinc-950\/80 backdrop-blur-md/g, 'bg-white/80 backdrop-blur-2xl shadow-sm');
  content = content.replace(/border-white\/10 bg-zinc-950\/80/g, 'border-slate-200 bg-white/80');

  // Background colors
  content = content.replace(/bg-black\/40/g, 'clay-card p-5');
  content = content.replace(/bg-zinc-950\/20/g, 'clay-card p-5');
  content = content.replace(/bg-zinc-950\/40/g, 'clay-card p-5');
  content = content.replace(/bg-zinc-950/g, 'bg-slate-50');
  content = content.replace(/bg-zinc-900\/50/g, 'bg-slate-50');
  content = content.replace(/bg-zinc-900/g, 'bg-slate-100');
  content = content.replace(/bg-zinc-800/g, 'bg-slate-200');
  content = content.replace(/bg-black\/20/g, 'bg-slate-50 border-slate-200');
  content = content.replace(/bg-white\/\[0\.01\]/g, 'bg-slate-50');

  // Borders
  content = content.replace(/border-white\/10/g, 'border-slate-200');
  content = content.replace(/border-white\/5/g, 'border-slate-200');
  content = content.replace(/border-white\/15/g, 'border-slate-200');
  content = content.replace(/border-white\/20/g, 'border-slate-200');
  content = content.replace(/border-zinc-800/g, 'border-slate-200');
  content = content.replace(/border-zinc-700/g, 'border-slate-200');

  // Text colors
  content = content.replace(/text-white/g, 'text-slate-800');
  content = content.replace(/text-zinc-500/g, 'text-slate-500');
  content = content.replace(/text-zinc-400/g, 'text-slate-500');
  content = content.replace(/text-zinc-300/g, 'text-slate-600');
  content = content.replace(/text-zinc-200/g, 'text-slate-700');
  content = content.replace(/text-zinc-800/g, 'text-slate-300');

  // Strokes
  content = content.replace(/stroke-zinc-800/g, 'stroke-slate-200');
  content = content.replace(/stroke-zinc-950/g, 'stroke-slate-100');

  // Cleanups
  content = content.replace(/clay-card\s+clay-card/g, 'clay-card');
  content = content.replace(/clay-card\s+p-5\s+p-6/g, 'clay-card p-6');
  content = content.replace(/clay-card\s+p-6\s+p-5/g, 'clay-card p-6');
  content = content.replace(/ +/g, ' ');
  content = content.replace(/ \)/g, ')');
  content = content.replace(/ \"/g, '"');
  
  fs.writeFileSync(file, content);
  console.log('Unified', file);
});
