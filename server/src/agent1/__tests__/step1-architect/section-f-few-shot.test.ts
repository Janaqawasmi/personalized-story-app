import { buildSectionF } from '@/agent1/step1-architect/prompt-sections/section-f-few-shot';
import {
  AGE_RANGE_LABELS,
  STORY_TYPE_LABELS,
} from '@/models/storyBrief.model';
import type { FewShotResult } from '@/agent1/step1-architect/few-shot-retriever';

function makeExample(
  id: number,
): import('@/agent1/step1-architect/few-shot-retriever').BlueprintExample {
  return {
    content: { id, title: `Example ${id}` },
    filename: `blueprint-${id}.json`,
  };
}

const singleExampleResult: FewShotResult = {
  examples: [makeExample(1)],
  sourceAgeRange: '5-7',
  crossBucket: false,
};

const twoExamplesResult: FewShotResult = {
  examples: [makeExample(1), makeExample(2)],
  sourceAgeRange: '5-7',
  crossBucket: false,
};

const crossBucketResult: FewShotResult = {
  examples: [makeExample(1)],
  sourceAgeRange: '7-9',
  crossBucket: true,
};

const coldStartResult: FewShotResult = {
  examples: [],
  sourceAgeRange: '9-12',
  crossBucket: false,
};

describe('buildSectionF — examples present', () => {
  it('test 1: examples present, not cross-bucket → contains "approved blueprints", story type and age range labels', () => {
    const output = buildSectionF(singleExampleResult, 'fear_anxiety', '5-7');
    expect(output).toContain('approved blueprints');
    expect(output).toContain(STORY_TYPE_LABELS.fear_anxiety);
    expect(output).toContain(AGE_RANGE_LABELS['5-7']);
    expect(output).not.toContain('No approved examples');
  });

  it('test 2: examples present → output contains "EXAMPLE 1:" and the JSON-stringified content', () => {
    const output = buildSectionF(singleExampleResult, 'fear_anxiety', '5-7');
    expect(output).toContain('EXAMPLE 1:');
    const expectedJson = JSON.stringify(makeExample(1).content, null, 2);
    expect(output).toContain(expectedJson);
  });

  it('test 3: two examples → output contains both "EXAMPLE 1:" and "EXAMPLE 2:"', () => {
    const output = buildSectionF(twoExamplesResult, 'fear_anxiety', '5-7');
    expect(output).toContain('EXAMPLE 1:');
    expect(output).toContain('EXAMPLE 2:');
  });

  it('test 4: cross-bucket → output contains cross-bucket note with target and source age ranges', () => {
    const output = buildSectionF(crossBucketResult, 'fear_anxiety', '9-12');
    expect(output).toContain('No approved examples exist yet for');
    expect(output).toContain(AGE_RANGE_LABELS['9-12']);
    expect(output).toContain('examples below are from');
    expect(output).toContain(AGE_RANGE_LABELS['7-9']);
  });

  it('test 5: not cross-bucket → output does NOT contain "No approved examples exist yet"', () => {
    const output = buildSectionF(singleExampleResult, 'fear_anxiety', '5-7');
    expect(output).not.toContain('No approved examples exist yet');
  });
});

describe('buildSectionF — cold start (no examples)', () => {
  it('test 6: empty examples → output contains "No approved examples yet. Standards:" and the four bullets', () => {
    const output = buildSectionF(coldStartResult, 'fear_anxiety', '9-12');
    expect(output).toContain('No approved examples yet. Standards:');
    expect(output).toContain('specific enough to visualize');
    expect(output).toContain('felt experience, not clinical summary');
    expect(output).toContain('structural surprise');
    expect(output).toContain('clear, concrete moment');
  });

  it('test 7: cold start → output does NOT contain "approved blueprints"', () => {
    const output = buildSectionF(coldStartResult, 'fear_anxiety', '9-12');
    expect(output).not.toContain('approved blueprints');
  });
});

describe('buildSectionF — no undefined leaks', () => {
  it('test 8: no "undefined" in output for any case', () => {
    const outputs = [
      buildSectionF(singleExampleResult, 'fear_anxiety', '5-7'),
      buildSectionF(twoExamplesResult, 'fear_anxiety', '5-7'),
      buildSectionF(crossBucketResult, 'fear_anxiety', '9-12'),
      buildSectionF(coldStartResult, 'fear_anxiety', '9-12'),
    ];
    for (const output of outputs) {
      expect(output).not.toContain('undefined');
    }
  });
});
