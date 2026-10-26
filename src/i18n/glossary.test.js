import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const root = process.cwd();
const bannedTerm = ['Isi', 'baya'].join('');
const roots = ['src', 'server', 'shared', 'prisma'];
const allowedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.prisma']);

function sourceFiles(directory) {
  const absolute = resolve(root, directory);
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = resolve(absolute, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(entry.name)) return [];
      return sourceFiles(fullPath);
    }
    return allowedExtensions.has(extname(entry.name)) ? [fullPath] : [];
  });
}

describe('Xhosa terminology guard', () => {
  it('does not allow the banned non-Xhosa term in application source', () => {
    const offenders = roots.flatMap((directory) => sourceFiles(directory)).filter((file) => {
      return new RegExp(bannedTerm, 'i').test(readFileSync(file, 'utf8'));
    });
    expect(offenders.map((file) => file.replace(root + '/', ''))).toEqual([]);
  });
});
