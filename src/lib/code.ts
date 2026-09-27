// Code-snippet helpers shared by the app and the content checkers (scripts/check-rust.ts and
// scripts/check-ts.ts), for both code languages. Hidden lines follow rustdoc's convention in
// both; the fill-in, build and fix helpers serve the rs- and ts- question types alike.
// Keep this file free of imports: Node runs it directly (type stripping) for the checkers.

/** rustdoc's hidden-line convention: a `# ` prefix or a lone `#`. Compiled, never shown. */
export function isHiddenLine(line: string): boolean {
  return line === '#' || line.startsWith('# ');
}

/** Lines as displayed. Line numbers in content (e.g. rs-error answers) count these. */
export function visibleLines(code: readonly string[]): string[] {
  return code.filter((l) => !isHiddenLine(l));
}

/** The program the compiler (rustc or tsc) sees: hidden lines un-hidden. */
export function programSource(code: readonly string[]): string {
  return code.map((l) => (l === '#' ? '' : isHiddenLine(l) ? l.slice(2) : l)).join('\n') + '\n';
}

/** 1-based program line → 1-based visible line; null for a hidden or missing line. */
export function visibleLineNumber(code: readonly string[], programLine: number): number | null {
  const line = code[programLine - 1];
  if (line === undefined || isHiddenLine(line)) return null;
  return visibleLines(code.slice(0, programLine)).length;
}

/** 1-based visible line → 1-based program line; null when `visible` is out of range. */
export function programLineOfVisible(code: readonly string[], visible: number): number | null {
  let seen = 0;
  for (let i = 0; i < code.length; i++) {
    const line = code[i];
    if (line === undefined || isHiddenLine(line)) continue;
    seen++;
    if (seen === visible) return i + 1;
  }
  return null;
}

/** Insert `line` right after visible line `visible`; null when `visible` is out of range. */
export function insertAfterVisibleLine(code: readonly string[], visible: number, line: string): string[] | null {
  const programLine = programLineOfVisible(code, visible);
  if (programLine === null) return null;
  return [...code.slice(0, programLine), line, ...code.slice(programLine)];
}

/** Index of the first whole-word `name` in `line` (`$` counts as a word character, as in JS
 * identifiers), or -1. ts-infer's validator and CodePanel's `mark` use it. */
export function findWord(line: string, name: string): number {
  if (!name) return -1;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w$])${escaped}(?![\\w$])`).exec(line)?.index ?? -1;
}

/** The rs-type / ts-type blank. */
export const BLANK = '___';

export function fillBlank(code: readonly string[], value: string): string[] {
  return code.map((l) => l.replace(BLANK, () => value));
}

/** rs-type / ts-type input limit, enforced by the input and the session. */
export const TOKEN_MAX_LENGTH = 40;

/** rs-type / ts-type grading: trim and collapse inner whitespace. Case is kept: both languages are case-sensitive. */
export function normalizeToken(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export type BuildSegment = string | { slot: number };
/** A plain line, or text segments with inline slots. */
export type BuildLine = string | BuildSegment[];

/** rs-build / ts-build code with each slot replaced by its word ('' while empty). */
export function fillSlots(code: readonly BuildLine[], words: readonly (string | null)[]): string[] {
  return code.map((line) =>
    typeof line === 'string' ? line : line.map((seg) => (typeof seg === 'string' ? seg : (words[seg.slot] ?? ''))).join(''),
  );
}

/** rs-fix / ts-fix diff lines (`- old` / `+ new`) with their prefixes stripped. */
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
