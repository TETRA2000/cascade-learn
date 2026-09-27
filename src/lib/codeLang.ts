// One profile per code language: what CodePanel, OutputPanel and feedback need to
// stay language-agnostic. Adding a course with authored code answers means adding
// a highlighter, an entry here, and a `langOfKey`/`courseLang` case.
import type { CourseId } from '../content/typeKeys';
import { highlightRust } from './highlightRust';
import { highlightTs } from './highlightTs';

export type CodeLang = 'rust' | 'ts';

export interface LangProfile {
  name: string;
  codeLabel: string;
  compiler: string;
  errorTitle: string;
  errorPattern: RegExp;
  errorFormat: string;
  highlight(line: string): { text: string; kind: string }[];
}

export const LANG: Record<CodeLang, LangProfile> = {
  rust: {
    name: 'Rust',
    codeLabel: 'Rust code',
    compiler: 'rustc',
    errorTitle: 'Doesn’t compile',
    errorPattern: /^error\[E\d{4}\]: \S/,
    errorFormat: 'error[E0000]: message',
    highlight: highlightRust,
  },
  ts: {
    name: 'TypeScript',
    codeLabel: 'TypeScript code',
    compiler: 'tsc',
    errorTitle: 'Type error',
    errorPattern: /^error TS\d+: \S/,
    errorFormat: 'error TS0000: message',
    highlight: highlightTs,
  },
};

/** The runtime-throw title (TS only): ts-predict's `throws` option text and OutputPanel's heading. */
export const THROWS_TITLE = 'Throws at runtime';

/** A question-type key's language, by its `ts-`/`rs-` prefix. */
export function langOfKey(type: string): CodeLang {
  return type.startsWith('ts-') ? 'ts' : 'rust';
}

/** A course's code language, or null when it has no authored code (CSS). */
export function courseLang(id: CourseId): CodeLang | null {
  switch (id) {
    case 'css':
      return null;
    case 'rust':
      return 'rust';
    case 'ts':
      return 'ts';
  }
}
