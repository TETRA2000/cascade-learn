import { describe, expect, it } from 'vitest';
import { highlightRust } from './highlightRust';

const kinds = (line: string) => highlightRust(line).map((t) => `${t.kind}:${t.text}`);

describe('highlightRust', () => {
  it('colors a let binding', () => {
    expect(kinds('let s = String::from("hi");')).toEqual([
      'keyword:let',
      'plain: s ',
      'punct:=',
      'plain: ',
      'type:String',
      'punct:::',
      'plain:from',
      'punct:(',
      'string:"hi"',
      'punct:);',
    ]);
  });

  it('tells lifetimes, primitives, keywords and comments apart', () => {
    expect(kinds("fn f<'a>(x: &'a mut Vec<i32>) -> usize { // note")).toEqual([
      'keyword:fn',
      'plain: f',
      'punct:<',
      "lifetime:'a",
      'punct:>(',
      'plain:x',
      'punct::',
      'plain: ',
      'punct:&',
      "lifetime:'a",
      'plain: ',
      'keyword:mut',
      'plain: ',
      'type:Vec',
      'punct:<',
      'type:i32',
      'punct:>)',
      'plain: ',
      'punct:->',
      'plain: ',
      'type:usize',
      'plain: ',
      'punct:{',
      'plain: ',
      'comment:// note',
    ]);
  });

  it('colors macros, numbers and chars, but not `!=`', () => {
    expect(kinds("println!(\"{}\", 1_000u32 + 'x' as u32);")).toEqual([
      'macro:println!',
      'punct:(',
      'string:"{}"',
      'punct:,',
      'plain: ',
      'number:1_000u32',
      'plain: ',
      'punct:+',
      'plain: ',
      "string:'x'",
      'plain: ',
      'keyword:as',
      'plain: ',
      'type:u32',
      'punct:);',
    ]);
    expect(kinds('x!=y')).toEqual(['plain:x', 'punct:!=', 'plain:y']);
  });

  it('keeps an unterminated string on one token', () => {
    expect(kinds('"abc')).toEqual(['string:"abc']);
  });
});
