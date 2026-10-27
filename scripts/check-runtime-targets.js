import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = [
  'src',
  'server',
  'shared',
  'public',
  '.github/workflows',
  'vite.config.js',
  'index.html',
  'package.json',
  'env.example',
];
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.yml', '.yaml', '.sh', '.env']);
const forbidden = /stackblitz(?:\\.(?:io|com|dev))?|bolt\\.new|webcontainer\\.io/i;
const violations = [];

function scan(target) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) return;
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    inspectFile(absolute);
    return;
  }
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const full = path.join(absolute, entry.name);
    if (entry.isDirectory()) scan(path.relative(root, full));
    else if (entry.isFile()) inspectFile(full);
  }
}

function inspectFile(file) {
  if (!extensions.has(path.extname(file)) && !['env.example'].includes(path.basename(file))) return;
  const content = fs.readFileSync(file, 'utf8');
  content.split(/\\r?\\n/).forEach((line, index) => {
    if (forbidden.test(line)) {
      violations.push(`${path.relative(root, file)}:${index + 1}: ${line.trim()}`);
    }
    forbidden.lastIndex = 0;
  });
}

for (const target of targets) scan(target);

if (violations.length) {
  console.error('Forbidden hosted-editor/runtime target found. Use relative /api requests and deploy only through Render:');
  console.error(violations.join('\\n'));
  process.exit(1);
}

console.log('Runtime target check passed: no StackBlitz, Bolt.new or WebContainer references in runtime/config files.');
