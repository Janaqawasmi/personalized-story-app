import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

describe('must-never-source enforcement', () => {
  const sectionHPath = resolve(
    __dirname,
    '../../step2-author/prompt-sections/section-h-hard-constraints.ts',
  );
  const sourceCode = readFileSync(sectionHPath, 'utf8');

  test('section-h reads mustNeverList from brief.therapeuticArchitecture', () => {
    expect(sourceCode).toContain('mustNeverList');
  });

  test('section-h does NOT import STORY_TYPE_ROUTING', () => {
    expect(sourceCode).not.toContain('STORY_TYPE_ROUTING');
  });

  test('section-h does NOT reference mustNeverDefaults', () => {
    expect(sourceCode).not.toContain('mustNeverDefaults');
  });

  test('section-h contains the CRITICAL source comment', () => {
    expect(sourceCode).toContain('NEVER read from');
    expect(sourceCode).toContain('reverses clinical judgment');
  });

  test('no file in step2-author/ references mustNeverDefaults', () => {
    const step2Root = resolve(__dirname, '../../step2-author');

    function walkTsFiles(dir: string): string[] {
      const out: string[] = [];
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return out;
      }
      for (const ent of entries) {
        const full = join(dir, ent.name);
        if (ent.isDirectory()) {
          if (ent.name === '__tests__') continue;
          out.push(...walkTsFiles(full));
        } else if (ent.isFile() && ent.name.endsWith('.ts')) {
          out.push(full);
        }
      }
      return out;
    }

    const files = walkTsFiles(step2Root);
    for (const file of files) {
      const contents = readFileSync(file, 'utf8');
      expect(contents).not.toContain('mustNeverDefaults');
    }
  });
});
