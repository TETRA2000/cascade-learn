// Rust snippet helpers shared by the app and scripts/check-rust.ts.
// Keep this file free of imports: Node runs it directly (type stripping) for the checker.

/** rustdoc's hidden-line convention: a `# ` prefix or a lone `#`. Compiled, never shown. */
export function isHiddenLine(line: string): boolean {
  return line === '#' || line.startsWith('# ');
}

/** Lines as displayed. Line numbers in content (e.g. rs-error answers) count these. */
export function visibleLines(code: readonly string[]): string[] {
  return code.filter((l) => !isHiddenLine(l));
}

/** The program rustc compiles: hidden lines un-hidden. */
export function programSource(code: readonly string[]): string {
  return code.map((l) => (l === '#' ? '' : isHiddenLine(l) ? l.slice(2) : l)).join('\n') + '\n';
}

/** 1-based program line → 1-based visible line; null for a hidden or missing line. */
export function visibleLineNumber(code: readonly string[], programLine: number): number | null {
  const line = code[programLine - 1];
  if (line === undefined || isHiddenLine(line)) return null;
  return visibleLines(code.slice(0, programLine)).length;
}

/** The rs-type blank. */
export const BLANK = '___';

export function fillBlank(code: readonly string[], value: string): string[] {
  return code.map((l) => l.replace(BLANK, () => value));
}

/** rs-type input limit, enforced by the input and the session. */
export const TOKEN_MAX_LENGTH = 40;

/** rs-type grading: trim and collapse inner whitespace. Case is kept: Rust is case-sensitive. */
export function normalizeToken(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export type BuildSegment = string | { slot: number };
/** A plain line, or text segments with inline slots. */
export type BuildLine = string | BuildSegment[];

/** rs-build code with each slot replaced by its word ('' while empty). */
export function fillSlots(code: readonly BuildLine[], words: readonly (string | null)[]): string[] {
  return code.map((line) =>
    typeof line === 'string' ? line : line.map((seg) => (typeof seg === 'string' ? seg : (words[seg.slot] ?? ''))).join(''),
  );
}

/** rs-fix diff lines (`- old` / `+ new`) with their prefixes stripped. */
export function parseDiff(diff: readonly string[]): { remove: string[]; add: string[] } {
  return {
    remove: diff.filter((l) => l.startsWith('- ')).map((l) => l.slice(2)),
    add: diff.filter((l) => l.startsWith('+ ')).map((l) => l.slice(2)),
  };
}

/** The `[start, end)` run in `code` that a diff's removed lines match, or null if there's no match. */
export function findDiffRange(code: readonly string[], diff: readonly string[]): [number, number] | null {
  const { remove } = parseDiff(diff);
  if (!remove.length) return null;
  for (let i = 0; i + remove.length <= code.length; i++) {
    if (remove.every((line, j) => code[i + j] === line)) return [i, i + remove.length];
  }
  return null;
}

/** Replace the run of removed lines with the added ones. Null if nothing is removed or the run isn't in `code`. */
export function applyDiff(code: readonly string[], diff: readonly string[]): string[] | null {
  const range = findDiffRange(code, diff);
  if (!range) return null;
  const [start, end] = range;
  return [...code.slice(0, start), ...parseDiff(diff).add, ...code.slice(end)];
}
