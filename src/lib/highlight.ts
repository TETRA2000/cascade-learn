export type TokenKind = 'selector' | 'property' | 'value' | 'punct' | 'html';

export interface Token {
  text: string;
  kind: TokenKind;
}

/**
 * Split one line of CSS into syntax-colored tokens.
 * A line starting with `§` is HTML: rendered grey with the `§` dropped.
 * Handles `sel { prop: value; }`, `sel {`, `  prop: value;` and falls back to punctuation.
 */
export function highlightLine(line: string): Token[] {
  const tok = (text: string, kind: TokenKind): Token => ({ text, kind });
  if (line.startsWith('§')) return [tok(line.slice(1), 'html')];

  let m = line.match(/^(.*?)\{\s*([\w-]+)(\s*:\s*)(.*?);\s*\}\s*$/);
  if (m) {
    return [
      tok(m[1]!, 'selector'),
      tok('{ ', 'punct'),
      tok(m[2]!, 'property'),
      tok(m[3]!, 'punct'),
      tok(m[4]!, 'value'),
      tok('; }', 'punct'),
    ];
  }
  if (/\{\s*$/.test(line)) return [tok(line.replace(/\s*\{\s*$/, ''), 'selector'), tok(' {', 'punct')];

  m = line.match(/^(\s*)([\w-]+)(\s*:\s*)(.*?)(;?)\s*$/);
  if (m) {
    return [tok(m[1]! + m[2]!, 'property'), tok(m[3]!, 'punct'), tok(m[4]!, 'value'), tok(m[5]!, 'punct')].filter(
      (t) => t.text,
    );
  }
  return [tok(line, 'punct')];
}
