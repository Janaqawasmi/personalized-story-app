import { conditionalBlock, joinList, numberedList } from '@/agent1/shared/prompt-utils';

describe('conditionalBlock', () => {
  it('returns the text when condition is true', () => {
    expect(conditionalBlock(true, 'hello')).toBe('hello');
  });

  it('returns empty string when condition is false', () => {
    expect(conditionalBlock(false, 'hello')).toBe('');
  });

  it('returns empty string when text is non-empty but condition is false (no leak)', () => {
    const text = 'SHOULD_NOT_APPEAR';
    expect(conditionalBlock(false, text)).toBe('');
  });

  it('returns empty string when text is empty and condition is true (idempotent on empty)', () => {
    expect(conditionalBlock(true, '')).toBe('');
  });

  it('does not mutate the input string', () => {
    const text = 'same';
    const result = conditionalBlock(true, text);
    expect(result).toBe(text);
    expect(text).toBe('same');
  });
});

describe('numberedList', () => {
  it('empty array returns ""', () => {
    expect(numberedList([])).toBe('');
  });

  it('single item returns "1. item"', () => {
    expect(numberedList(['item'])).toBe('1. item');
  });

  it('three items returns the documented shape with \\n separators', () => {
    expect(numberedList(['First point', 'Second point', 'Third point'])).toBe(
      '1. First point\n2. Second point\n3. Third point',
    );
  });

  it('has no trailing newline', () => {
    const result = numberedList(['a', 'b', 'c']);
    expect(result.endsWith('\n')).toBe(false);
  });

  it('numbering starts at 1, not 0', () => {
    expect(numberedList(['x'])).toMatch(/^1\. /);
    expect(numberedList(['x'])).not.toMatch(/^0\. /);
  });

  it('items containing embedded \\n are preserved as-is', () => {
    expect(numberedList(['line1\nline2'])).toBe('1. line1\nline2');
  });

  it('ten items number correctly', () => {
    const items = Array.from({ length: 10 }, (_, i) => `item${i + 1}`);
    const result = numberedList(items);
    const lines = result.split('\n');
    expect(lines).toHaveLength(10);
    expect(lines[0]).toBe('1. item1');
    expect(lines[8]).toBe('9. item9');
    expect(lines[9]).toBe('10. item10');
  });
});

describe('joinList', () => {
  it('empty array returns ""', () => {
    expect(joinList([], 'and')).toBe('');
  });

  it('single item returns the item unchanged', () => {
    expect(joinList(['apples'], 'and')).toBe('apples');
  });

  it('two items use conjunction without Oxford comma', () => {
    expect(joinList(['a', 'b'], 'and')).toBe('a and b');
  });

  it('three items use Oxford comma', () => {
    expect(joinList(['a', 'b', 'c'], 'or')).toBe('a, b, or c');
  });

  it('four items use Oxford comma before conjunction', () => {
    expect(joinList(['a', 'b', 'c', 'd'], 'and')).toBe('a, b, c, and d');
  });

  it('uses "or" as conjunction correctly', () => {
    expect(joinList(['apples', 'oranges'], 'or')).toBe('apples or oranges');
  });
});

