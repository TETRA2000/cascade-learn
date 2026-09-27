// Rust syntax colors for short teaching snippets. One line at a time with no
// state between lines, so a block comment spanning lines renders as plain text.
export type RustTokenKind = 'keyword' | 'type' | 'string' | 'number' | 'comment' | 'lifetime' | 'macro' | 'punct' | 'plain';

export interface RustToken {
  text: string;
  kind: RustTokenKind;
}

const KEYWORDS = new Set([
  'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else', 'enum', 'extern', 'false', 'fn', 'for',
  'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static',
  'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while',
]);

const PRIMITIVES = new Set([
  'i8', 'i16', 'i32', 'i64', 'i128', 'isize', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize', 'f32', 'f64', 'bool', 'char', 'str',
]);

// First match wins at each position.
const RULES: [RegExp, RustTokenKind | 'ident'][] = [
  [/^\/\/.*/, 'comment'],
  [/^"(?:\\.|[^"\\])*"?/, 'string'],
  [/^'(?:\\.|[^'\\])'/, 'string'], // char literal
  [/^'[A-Za-z_]\w*/, 'lifetime'],
  [/^\d[\d_]*(?:\.\d[\d_]*)?(?:[iuf](?:8|16|32|64|128|size))?/, 'number'],
  [/^[A-Za-z_]\w*(?:!(?!=))?/, 'ident'],
  [/^\s+/, 'plain'],
  [/^[\s\S]/, 'punct'],
];

function identKind(word: string): RustTokenKind {
  if (word.endsWith('!')) return 'macro';
  if (KEYWORDS.has(word)) return 'keyword';
  if (PRIMITIVES.has(word) || /^[A-Z]/.test(word)) return 'type';
  return 'plain';
}

export function highlightRust(line: string): RustToken[] {
  const tokens: RustToken[] = [];
  let rest = line;
  while (rest) {
    for (const [re, rule] of RULES) {
      const m = re.exec(rest);
      if (!m) continue;
      const text = m[0];
      const kind = rule === 'ident' ? identKind(text) : rule;
      const last = tokens[tokens.length - 1];
      if (last && last.kind === kind) last.text += text;
      else tokens.push({ text, kind });
      rest = rest.slice(text.length);
      break;
    }
  }
  return tokens;
}
