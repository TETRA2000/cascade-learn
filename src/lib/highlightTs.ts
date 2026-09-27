// TypeScript syntax colors for short teaching snippets. One line at a time with no
// state between lines, so a block comment or multi-line template literal renders as plain text.
export type TsTokenKind = 'keyword' | 'type' | 'string' | 'number' | 'comment' | 'punct' | 'plain';

export interface TsToken {
  text: string;
  kind: TsTokenKind;
}

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'switch', 'case', 'default', 'break', 'for', 'while',
  'of', 'in', 'type', 'interface', 'as', 'typeof', 'keyof', 'readonly', 'new', 'true', 'false',
]);

const TYPES = new Set(['string', 'number', 'boolean', 'null', 'undefined', 'unknown', 'never', 'any', 'void', 'object']);

// First match wins at each position.
const RULES: [RegExp, TsTokenKind | 'ident'][] = [
  [/^\/\/.*/, 'comment'],
  [/^"(?:\\.|[^"\\])*"?/, 'string'],
  [/^'(?:\\.|[^'\\])*'?/, 'string'],
  [/^`(?:\\.|[^`\\])*`?/, 'string'],
  [/^\d[\d_]*(?:\.\d+)?/, 'number'],
  [/^[A-Za-z_]\w*/, 'ident'],
  [/^\s+/, 'plain'],
  [/^[\s\S]/, 'punct'],
];

function identKind(word: string): TsTokenKind {
  if (KEYWORDS.has(word)) return 'keyword';
  if (TYPES.has(word) || /^[A-Z]/.test(word)) return 'type';
  return 'plain';
}

export function highlightTs(line: string): TsToken[] {
  const tokens: TsToken[] = [];
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
