// jest.mock must be at the top before any imports so Jest hoists it
jest.mock('fs');

import * as fs from 'fs';

import {
  _resetCacheForTesting,
  getStoryExample,
} from '@/agent1/step2-author/few-shot-retriever';

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

describe('getStoryExample — retrieval and caching', () => {
  beforeEach(() => {
    _resetCacheForTesting();
  });

  it('test 1: age range with 1 story JSON file → returns that example, no cross-bucket', () => {
    mockFsForAge('5-7', ['story-1.json']);

    const result = getStoryExample('5-7');
    expect(result.example).not.toBeNull();
    expect(result.example?.filename).toBe('story-1.json');
    expect(result.crossBucket).toBe(false);
    expect(result.sourceAgeRange).toBe('5-7');
  });

  it('test 2: age range with 2 story files → returns only 1 (capped at 1)', () => {
    mockFsForAge('7-9', ['story-1.json', 'story-2.json']);

    const result = getStoryExample('7-9');
    expect(result.example).not.toBeNull();
    // Only 1 example is returned
    expect(result.example?.filename).toBe('story-1.json');
    expect(result.crossBucket).toBe(false);
  });

  it('test 3: age range with 0 files + fallback age has files → cross-bucket retrieval', () => {
    // 9-12 is empty; 7-9 (first fallback for 9-12) has files
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockImplementation((p: unknown) => {
      const dir = String(p);
      if (dir.includes('/7-9') || dir.includes('\\7-9')) {
        return ['story-1.json'];
      }
      return [];
    });
    mockReadFileSync.mockReturnValue('{"id": "fallback"}');

    const result = getStoryExample('9-12');
    expect(result.crossBucket).toBe(true);
    expect(result.sourceAgeRange).toBe('7-9');
    expect(result.example).not.toBeNull();
    expect(result.example?.filename).toBe('story-1.json');
  });

  it('test 4: all age ranges empty → cold-start, example null, crossBucket false', () => {
    mockAllEmpty();

    const result = getStoryExample('5-7');
    expect(result.example).toBeNull();
    expect(result.crossBucket).toBe(false);
    expect(result.sourceAgeRange).toBe('5-7');
  });

  it('test 5: "9-12" empty, "7-9" has files → cross-bucket from 7-9', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockImplementation((p: unknown) => {
      const dir = String(p);
      if (dir.includes('/7-9') || dir.includes('\\7-9')) {
        return ['story-a.json', 'story-b.json'];
      }
      return [];
    });
    mockReadFileSync.mockReturnValue('{"story": "example"}');

    const result = getStoryExample('9-12');
    expect(result.crossBucket).toBe(true);
    expect(result.sourceAgeRange).toBe('7-9');
    expect(result.example).not.toBeNull();
  });

  it('test 6: malformed JSON file → skipped, valid files still returned, no throw', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockImplementation((p: unknown) => {
      const dir = String(p);
      if (dir.includes('/5-7') || dir.includes('\\5-7')) {
        return ['story-bad.json', 'story-good.json'];
      }
      return [];
    });
    mockReadFileSync.mockImplementation((p: unknown) => {
      const filePath = String(p);
      if (filePath.includes('story-bad.json')) {
        return 'NOT VALID JSON {{{';
      }
      return '{"id": "good"}';
    });

    expect(() => getStoryExample('5-7')).not.toThrow();
    const result = getStoryExample('5-7');
    // Cache already loaded on first call; only good file is in bucket
    expect(result.example).not.toBeNull();
    expect(result.example?.filename).toBe('story-good.json');
  });

  it('test 7: _resetCacheForTesting clears cache — second load picks up new data', () => {
    mockFsForAge('3-5', ['story-original.json'], '{"version": 1}');
    const result1 = getStoryExample('3-5');
    expect(result1.example?.filename).toBe('story-original.json');

    _resetCacheForTesting();
    mockFsForAge('3-5', ['story-updated.json'], '{"version": 2}');

    const result2 = getStoryExample('3-5');
    expect(result2.example?.filename).toBe('story-updated.json');
    expect((result2.example?.content as { version: number }).version).toBe(2);
  });
});
