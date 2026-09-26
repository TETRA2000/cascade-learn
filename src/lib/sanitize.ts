/**
 * Reduce user-typed text to a bare CSS keyword before it touches a style:
 * keeps only `[a-zA-Z-]`, lowercased. Nothing else may reach CSS from input.
 */
export function sanitizeCssKeyword(value: string): string {
  return value.replace(/[^a-zA-Z-]/g, '').toLowerCase();
}
