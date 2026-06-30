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

const adminComponents = walk(path.join('/home/srihari/HACKATHON/src/components/admin'));
const adminPage = '/home/srihari/HACKATHON/src/app/(dashboard)/admin/page.tsx';
const files = [...adminComponents, adminPage];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace container classes with clay-card
  // We'll replace the entire class string of these specific large wrappers
  content = content.replace(/rounded-2xl border border-white\/10 bg-black\/40 p-6 backdrop-blur-md shadow-(2xl|xl|lg|md|sm)/g, 'clay-card p-6');
  
  content = content.replace(/rounded-xl border border-white\/5 bg-white\/\[0\.01\]/g, 'clay-card p-5');

  // Now replace generic dark background colors and borders
  content = content.replace(/bg-black\/40/g, 'clay-card');
  content = content.replace(/bg-zinc-950\/20/g, 'clay-card');
  content = content.replace(/bg-zinc-950\/40/g, 'clay-card');
  content = content.replace(/bg-zinc-900\/50/g, 'bg-slate-50');
  content = content.replace(/bg-zinc-950/g, 'bg-slate-50');
  content = content.replace(/bg-zinc-900/g, 'bg-slate-100');
  content = content.replace(/bg-zinc-800/g, 'bg-slate-200');
  content = content.replace(/bg-black\/20/g, 'bg-slate-50 border-slate-200');
  
  content = content.replace(/bg-white\/\[0\.01\]/g, 'bg-slate-50');
  
  // Borders
  content = content.replace(/border-white\/10/g, 'border-slate-200');
  content = content.replace(/border-white\/5/g, 'border-slate-200');
  content = content.replace(/border-white\/15/g, 'border-slate-200');
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

  // Fix potential duplicate clay-cards
  content = content.replace(/clay-card\s+clay-card/g, 'clay-card');
  content = content.replace(/ +/g, ' ');

  fs.writeFileSync(file, content);
  console.log('Cleaned', file);
});
