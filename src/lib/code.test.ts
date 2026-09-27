import { describe, expect, it } from 'vitest';
import {
  applyDiff,
  fillBlank,
  fillSlots,
  findWord,
  insertAfterVisibleLine,
  normalizeToken,
  parseDiff,
  programLineOfVisible,
  programSource,
  visibleLineNumber,
  visibleLines,
} from './code';

const code = ['# fn main() {', 'let a = 1;', '#', 'let b = a;', '# }'];

describe('hidden lines', () => {
  it('hides `# ` lines and a lone `#` from display', () => {
    expect(visibleLines(code)).toEqual(['let a = 1;', 'let b = a;']);
  });

  it('un-hides them for the compiler', () => {
    expect(programSource(code)).toBe('fn main() {\nlet a = 1;\n\nlet b = a;\n}\n');
  });

  it('maps program lines to visible line numbers', () => {
    expect(visibleLineNumber(code, 2)).toBe(1);
    expect(visibleLineNumber(code, 4)).toBe(2);
    expect(visibleLineNumber(code, 1)).toBeNull();
    expect(visibleLineNumber(code, 3)).toBeNull();
    expect(visibleLineNumber(code, 9)).toBeNull();
  });

  it('does not treat attributes as hidden', () => {
    expect(visibleLines(['#[derive(Debug)]', 'struct P;'])).toEqual(['#[derive(Debug)]', 'struct P;']);
  });
});

describe('blanks and slots', () => {
  it('fills the ___ blank', () => {
    expect(fillBlank(['fn f(v: ___ Vec<i32>) {}', 'x'], '&mut')).toEqual(['fn f(v: &mut Vec<i32>) {}', 'x']);
  });

  it('fills the blank literally, without expanding $& or $1 in the value', () => {
    expect(fillBlank(['a ___ b'], 'x$&y')).toEqual(['a x$&y b']);
    expect(fillBlank(['a ___ b'], 'x$1y')).toEqual(['a x$1y b']);
  });

  it('normalizes typed tokens without changing case', () => {
    expect(normalizeToken('  & \t mut ')).toBe('& mut');
    expect(normalizeToken('&MUT')).toBe('&MUT');
  });

  it('fills inline slots, leaving empty ones blank', () => {
    const lines = [['fn f(s: ', { slot: 0 }, ') {}'], 'x', ['g(', { slot: 1 }, ');']];
    expect(fillSlots(lines, ['&str', null])).toEqual(['fn f(s: &str) {}', 'x', 'g();']);
  });
});

describe('diffs', () => {
  it('splits removed and added lines, keeping indentation', () => {
    expect(parseDiff(['-     let t = s;', '+     let t = s.clone();'])).toEqual({
      remove: ['    let t = s;'],
      add: ['    let t = s.clone();'],
    });
  });

  it('replaces a contiguous run of removed lines', () => {
    expect(applyDiff(['a', 'b', 'c'], ['- b', '+ x', '+ y'])).toEqual(['a', 'x', 'y', 'c']);
    expect(applyDiff(['a', 'b', 'c'], ['- b', '- c'])).toEqual(['a']);
  });

  it('returns null when the diff does not apply', () => {
    expect(applyDiff(['a', 'b', 'c'], ['- a', '- c'])).toBeNull();
    expect(applyDiff(['a'], ['- z', '+ y'])).toBeNull();
    expect(applyDiff(['a'], ['+ z'])).toBeNull();
  });
});

describe('visible ↔ program lines', () => {
  const code = ['# fn main() {', 'let a = 1;', '#', 'let b = a;', '# }'];
  it('maps a visible line to its program line', () => {
    expect(programLineOfVisible(code, 1)).toBe(2);
    expect(programLineOfVisible(code, 2)).toBe(4);
    expect(programLineOfVisible(code, 3)).toBeNull();
    expect(programLineOfVisible(code, 0)).toBeNull();
  });
  it('inserts a line right after a visible line', () => {
    expect(insertAfterVisibleLine(code, 1, '# X')).toEqual(['# fn main() {', 'let a = 1;', '# X', '#', 'let b = a;', '# }']);
    expect(insertAfterVisibleLine(code, 9, '# X')).toBeNull();
  });
});

describe('findWord', () => {
  it('finds the first whole-word occurrence, treating $ as part of a name', () => {
    expect(findWord('console.log(max, x.length);', 'x')).toBe(17);
    expect(findWord('const max = 1;', 'x')).toBe(-1);
    expect(findWord('const a$ = $a + a;', 'a')).toBe(16);
    expect(findWord('const $el = el$;', '$el')).toBe(6);
    expect(findWord('x', '')).toBe(-1);
  });
});
