import * as fs from 'fs';
import * as path from 'path';

import { AGE_RANGES, type AgeRange } from '@/models/storyBrief.model';

export interface BlueprintExample {
  /** The raw JSON content of the example file, parsed. */
  content: Record<string, unknown>;
  /** The filename it came from (for debugging/logging). */
  filename: string;
}

export interface FewShotResult {
  examples: BlueprintExample[];
  /** Which age range the examples were retrieved from. */
  sourceAgeRange: AgeRange;
  /** Whether cross-bucket retrieval was used. */
  crossBucket: boolean;
}

const FALLBACK_ORDER: Record<AgeRange, readonly AgeRange[]> = {
  "3-5": ["5-7", "7-9", "9-12"],
  "5-7": ["3-5", "7-9", "9-12"],
  "7-9": ["5-7", "9-12", "3-5"],
  "9-12": ["7-9", "5-7", "3-5"],
};

const cache = new Map<AgeRange, BlueprintExample[]>();
let cacheLoaded = false;

function loadExampleCache(): void {
  const baseDir = path.resolve(__dirname, '../examples');

  for (const age of AGE_RANGES) {
    const ageDir = path.join(baseDir, age);

    if (!fs.existsSync(ageDir)) {
      cache.set(age, []);
      continue;
    }

    const files = (fs.readdirSync(ageDir) as string[]).filter(
      (f) => f.startsWith('blueprint-') && f.endsWith('.json'),
    );

    const examples: BlueprintExample[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(ageDir, file), 'utf8') as string;
        const content = JSON.parse(raw) as Record<string, unknown>;
        examples.push({ content, filename: file });
      } catch {
        console.error(`Failed to load example: ${ageDir}/${file}`);
      }
    }
    cache.set(age, examples);
  }
}

export function getBlueprintExamples(ageRange: AgeRange): FewShotResult {
  if (!cacheLoaded) {
    loadExampleCache();
    cacheLoaded = true;
  }

  const examples = cache.get(ageRange) ?? [];

  if (examples.length > 0) {
    return {
      examples: examples.slice(0, 2),
      sourceAgeRange: ageRange,
      crossBucket: false,
    };
  }

  // Cross-bucket retrieval: walk fallback order to find closest age with examples
  const fallbacks = FALLBACK_ORDER[ageRange];
  for (const fallbackAge of fallbacks) {
    const fallbackExamples = cache.get(fallbackAge) ?? [];
    if (fallbackExamples.length > 0) {
      return {
        examples: fallbackExamples.slice(0, 2),
        sourceAgeRange: fallbackAge,
        crossBucket: true,
      };
    }
  }

  // True cold start — all buckets empty
  return {
    examples: [],
    sourceAgeRange: ageRange,
    crossBucket: false,
  };
}

/** Clears the cache. For testing only. */
export function _resetCacheForTesting(): void {
  cache.clear();
  cacheLoaded = false;
}
