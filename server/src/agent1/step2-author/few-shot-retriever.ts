import * as fs from 'fs';
import * as path from 'path';

import { AGE_RANGES, type AgeRange } from '@/models/storyBrief.model';
import type {
  StoryExample,
  StoryFewShotResult,
} from './prompt-sections/section-i-few-shot';

const FALLBACK_ORDER: Record<AgeRange, readonly AgeRange[]> = {
  '3-5': ['5-7', '7-9', '9-12'],
  '5-7': ['3-5', '7-9', '9-12'],
  '7-9': ['5-7', '9-12', '3-5'],
  '9-12': ['7-9', '5-7', '3-5'],
};

const cache = new Map<AgeRange, StoryExample[]>();
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
      (f) => f.startsWith('story-') && f.endsWith('.json'),
    );

    const examples: StoryExample[] = [];
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

export function getStoryExample(ageRange: AgeRange): StoryFewShotResult {
  if (!cacheLoaded) {
    loadExampleCache();
    cacheLoaded = true;
  }

  const examples = cache.get(ageRange) ?? [];

  if (examples.length > 0) {
    return {
      example: examples[0]!,
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
        example: fallbackExamples[0]!,
        sourceAgeRange: fallbackAge,
        crossBucket: true,
      };
    }
  }

  // True cold start — all buckets empty
  return {
    example: null,
    sourceAgeRange: ageRange,
    crossBucket: false,
  };
}

/** Clears the cache. For testing only. */
export function _resetCacheForTesting(): void {
  cache.clear();
  cacheLoaded = false;
}
