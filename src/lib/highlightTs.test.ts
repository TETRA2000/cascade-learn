import { expect, it } from 'vitest';
import { highlightTs } from './highlightTs';

it('colors keywords, primitives and numbers, merging adjacent tokens of one kind', () => {
  expect(highlightTs('const n: number = 5;')).toEqual([
    { text: 'const', kind: 'keyword' }, { text: ' n', kind: 'plain' }, { text: ':', kind: 'punct' },
    { text: ' ', kind: 'plain' }, { text: 'number', kind: 'type' }, { text: ' ', kind: 'plain' },
    { text: '=', kind: 'punct' }, { text: ' ', kind: 'plain' }, { text: '5', kind: 'number' }, { text: ';', kind: 'punct' },
  ]);
});
it('keeps strings, template literals and comments whole', () => {
  expect(highlightTs('const s = `hi ${name}`; // done').filter((t) => t.kind !== 'plain' && t.kind !== 'punct')).toEqual([
    { text: 'const', kind: 'keyword' }, { text: '`hi ${name}`', kind: 'string' }, { text: '// done', kind: 'comment' },
  ]);
  expect(highlightTs(`log('it\\'s', "a")`).filter((t) => t.kind === 'string').map((t) => t.text)).toEqual([`'it\\'s'`, '"a"']);
});
it('treats User and null as types, 0.5 as a number', () => {
  expect(highlightTs('let u: User | null = 0.5;').filter((t) => t.kind === 'type' || t.kind === 'number')).toEqual([
    { text: 'User', kind: 'type' }, { text: 'null', kind: 'type' }, { text: '0.5', kind: 'number' },
  ]);
});
