// jest.mock must be at the top before any imports so Jest hoists it
jest.mock('fs');

import * as fs from 'fs';

import {
  _resetCacheForTesting,
  getBlueprintExamples,
} from '@/agent1/step1-architect/few-shot-retriever';

// Typed aliases — with jest.mock('fs'), all functions become jest.Mock
const mockExistsSync = fs.existsSync as jest.Mock;
const mockReaddirSync = fs.readdirSync as jest.Mock;
const mockReadFileSync = fs.readFileSync as jest.Mock;

/** Set up fs mocks so that one age directory has the given files and all others are empty. */
function mockFsForAge(
  targetAge: string,
  files: string[],
  jsonContent = '{"id": "test"}',
): void {
  mockExistsSync.mockReturnValue(true);
  mockReaddirSync.mockImplementation((p: unknown) => {
    const dir = String(p);
    return dir.includes(`/${targetAge}`) || dir.includes(`\\${targetAge}`)
      ? files
      : [];
  });
  mockReadFileSync.mockReturnValue(jsonContent);
}

/** All age directories exist but are empty. */
function mockAllEmpty(): void {
  mockExistsSync.mockReturnValue(true);
  mockReaddirSync.mockReturnValue([]);
}

describe('getBlueprintExamples — retrieval and caching', () => {
  beforeEach(() => {
    _resetCacheForTesting();
  });

  it('test 1: age range with 2 blueprint JSON files → returns 2 examples, no cross-bucket', () => {
    mockFsForAge('5-7', ['blueprint-1.json', 'blueprint-2.json']);

    const result = getBlueprintExamples('5-7');
    expect(result.examples).toHaveLength(2);
    expect(result.crossBucket).toBe(false);
    expect(result.sourceAgeRange).toBe('5-7');
  });

  it('test 2: age range with 3 blueprint files → returns only 2 (capped at 2)', () => {
    mockFsForAge('7-9', [
      'blueprint-1.json',
      'blueprint-2.json',
      'blueprint-3.json',
    ]);

    const result = getBlueprintExamples('7-9');
    expect(result.examples).toHaveLength(2);
  });

  it('test 3: age range with 0 files + fallback age has files → cross-bucket retrieval', () => {
    // 9-12 is empty; 7-9 (first fallback for 9-12) has files
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockImplementation((p: unknown) => {
      const dir = String(p);
      if (dir.includes('/7-9') || dir.includes('\\7-9')) {
        return ['blueprint-1.json'];
      }
      return [];
    });
    mockReadFileSync.mockReturnValue('{"id": "fallback"}');

    const result = getBlueprintExamples('9-12');
    expect(result.crossBucket).toBe(true);
    expect(result.sourceAgeRange).toBe('7-9');
    expect(result.examples).toHaveLength(1);
  });

  it('test 4: all age ranges empty → cold-start, empty array, crossBucket false', () => {
    mockAllEmpty();

    const result = getBlueprintExamples('5-7');
    expect(result.examples).toHaveLength(0);
    expect(result.crossBucket).toBe(false);
    expect(result.sourceAgeRange).toBe('5-7');
  });

  it('test 5: "9-12" empty, "7-9" has files → cross-bucket uses 7-9 (primary v3.2 §13 case)', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockImplementation((p: unknown) => {
      const dir = String(p);
      if (dir.includes('/7-9') || dir.includes('\\7-9')) {
        return ['blueprint-a.json', 'blueprint-b.json'];
      }
      return [];
    });
    mockReadFileSync.mockReturnValue('{"story": "example"}');

    const result = getBlueprintExamples('9-12');
    expect(result.crossBucket).toBe(true);
    expect(result.sourceAgeRange).toBe('7-9');
    expect(result.examples).toHaveLength(2);
  });

  it('test 6: malformed JSON file → skipped, valid files still returned, no throw', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockImplementation((p: unknown) => {
      const dir = String(p);
      if (dir.includes('/5-7') || dir.includes('\\5-7')) {
        return ['blueprint-bad.json', 'blueprint-good.json'];
      }
      return [];
    });
    mockReadFileSync.mockImplementation((p: unknown) => {
      const filePath = String(p);
      if (filePath.includes('blueprint-bad.json')) {
        return 'NOT VALID JSON {{{';
      }
      return '{"id": "good"}';
    });

    expect(() => getBlueprintExamples('5-7')).not.toThrow();
    const result = getBlueprintExamples('5-7');
    // Only the good file should be present (bad one skipped); but cache already loaded on first
    // call so there's only one valid example in the bucket
    expect(result.examples).toHaveLength(1);
    expect(result.examples[0]?.filename).toBe('blueprint-good.json');
  });

  it('test 7: cache persists across calls — second call skips fs even if mock would throw', () => {
    mockFsForAge('3-5', ['blueprint-1.json']);

    const result1 = getBlueprintExamples('3-5');
    expect(result1.examples).toHaveLength(1);

    // Replace mock so any fs call would throw — cache must prevent this
    mockReaddirSync.mockImplementation(() => {
      throw new Error('cache should prevent this call');
    });

    const result2 = getBlueprintExamples('3-5');
    expect(result2.examples).toHaveLength(1);
    expect(result2.examples[0]?.filename).toBe('blueprint-1.json');
  });

  it('test 8: _resetCacheForTesting clears cache — second load picks up new data', () => {
    mockFsForAge('5-7', ['blueprint-original.json'], '{"version": 1}');
    const result1 = getBlueprintExamples('5-7');
    expect(result1.examples[0]?.filename).toBe('blueprint-original.json');

    // Reset cache then change mock data
    _resetCacheForTesting();
    mockFsForAge('5-7', ['blueprint-updated.json'], '{"version": 2}');

    const result2 = getBlueprintExamples('5-7');
    expect(result2.examples[0]?.filename).toBe('blueprint-updated.json');
    expect((result2.examples[0]?.content as { version: number }).version).toBe(2);
  });
});
