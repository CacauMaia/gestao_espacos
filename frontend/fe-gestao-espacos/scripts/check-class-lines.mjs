import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../src/app', import.meta.url);
const MAX_LINES = 500;

function collectTypescriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectTypescriptFiles(path);
    }

    return entry.isFile() && path.endsWith('.ts') ? [path] : [];
  });
}

const violations = collectTypescriptFiles(ROOT.pathname)
  .filter((path) => /\b(?:export\s+)?class\s+\w+/.test(readFileSync(path, 'utf8')))
  .map((path) => {
    const content = readFileSync(path, 'utf8');
    const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
    return { path, lines };
  })
  .filter(({ lines }) => lines > MAX_LINES);

if (violations.length) {
  console.error(`Class files must have ${MAX_LINES} lines or fewer. Refactor into helpers before continuing.`);

  for (const violation of violations) {
    console.error(`- ${violation.path}: ${violation.lines} lines`);
  }

  process.exit(1);
}

console.log(`Class file line check passed. No class file exceeds ${MAX_LINES} lines.`);
