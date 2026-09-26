export interface TextPart {
  text: string;
  code: boolean;
}

/** Split prose on backticks: odd segments are inline code. Empty segments are dropped. */
export function splitInlineCode(text: string): TextPart[] {
  return text
    .split('`')
    .map((t, i) => ({ text: t, code: i % 2 === 1 }))
    .filter((p) => p.text);
}
