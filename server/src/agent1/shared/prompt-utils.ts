/**
 * conditionalBlock(false, "Hello")
 * // returns: ""
 */
export function conditionalBlock(condition: boolean, text: string): string {
  return condition ? text : '';
}

/**
 * numberedList(["First point", "Second point", "Third point"])
 * // returns:
 * // "1. First point\n2. Second point\n3. Third point"
 */
export function numberedList(items: readonly string[]): string {
  if (items.length === 0) return '';
  return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
}

/**
 * joinList(["apples"], "and")                     // "apples"
 * joinList(["apples", "oranges"], "and")          // "apples and oranges"
 * joinList(["apples", "oranges", "pears"], "or")  // "apples, oranges, or pears"
 */
export function joinList(
  items: readonly string[],
  conjunction: 'and' | 'or',
): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]!} ${conjunction} ${items[1]!}`;

  const head = items.slice(0, -1).join(', ');
  const last = items[items.length - 1]!;
  return `${head}, ${conjunction} ${last}`;
}

