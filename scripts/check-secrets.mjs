import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const ignoredDirectories = new Set([
  '.git',
  '.next',
  'coverage',
  'dist',
  'node_modules',
  'test-results',
]);
const exposedEnvNames = new Set([
  '.env',
  '.env.local',
  '.env.development',
  '.env.test',
  '.env.production',
]);
const privateKeyPattern = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
const violations = [];

function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(path);
      continue;
    }

    if (exposedEnvNames.has(entry.name)) {
      violations.push(`${relative(root, path)} must not be committed`);
      continue;
    }

    if (statSync(path).size > 2_000_000) continue;
    const contents = readFileSync(path, 'utf8');
    if (privateKeyPattern.test(contents))
      violations.push(`${relative(root, path)} contains a private key`);
  }
}

if (existsSync(root)) visit(root);

if (violations.length > 0) {
  console.error('Secret check failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Secret check passed: no non-template environment files or private keys found.');
