import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

function findTypeScriptFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTypeScriptFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(fullPath);
    }
  }

  return results;
}

describe('Clean Architecture Boundary Enforcer', () => {
  const coreDir = path.resolve(__dirname, '../../../core');
  const applicationDir = path.join(coreDir, 'application');
  const domainDir = path.join(coreDir, 'domain');

  it('verifies that no file in src/core/application imports from infrastructure', () => {
    const files = findTypeScriptFiles(applicationDir);
    expect(files.length).toBeGreaterThan(0);

    const violations: { file: string; line: string; lineNum: number }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (
          (trimmed.startsWith('import ') || trimmed.startsWith('export ') || trimmed.includes('require(')) &&
          (trimmed.includes('infrastructure') || trimmed.includes('@/infrastructure'))
        ) {
          violations.push({
            file: path.relative(coreDir, file),
            line: trimmed,
            lineNum: index + 1,
          });
        }
      });
    }

    expect(
      violations,
      `Found ${violations.length} Clean Architecture violations in application layer:\n` +
        violations.map((v) => `  - ${v.file}:${v.lineNum} -> ${v.line}`).join('\n')
    ).toEqual([]);
  });

  it('verifies that no file in src/core/domain imports from infrastructure or application', () => {
    const files = findTypeScriptFiles(domainDir);
    expect(files.length).toBeGreaterThan(0);

    const violations: { file: string; line: string; lineNum: number }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (
          (trimmed.startsWith('import ') || trimmed.startsWith('export ') || trimmed.includes('require(')) &&
          (trimmed.includes('infrastructure') ||
            trimmed.includes('@/infrastructure') ||
            trimmed.includes('application') ||
            trimmed.includes('@/core/application'))
        ) {
          violations.push({
            file: path.relative(coreDir, file),
            line: trimmed,
            lineNum: index + 1,
          });
        }
      });
    }

    expect(
      violations,
      `Found ${violations.length} Clean Architecture violations in domain layer:\n` +
        violations.map((v) => `  - ${v.file}:${v.lineNum} -> ${v.line}`).join('\n')
    ).toEqual([]);
  });
});
