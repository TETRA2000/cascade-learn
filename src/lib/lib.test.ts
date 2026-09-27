import { describe, expect, it } from 'vitest';
import { courseById, type ChoiceDemo, type KnobDemo, type CodeChoiceDemo } from '../content';
import { buildDemo, buildRustDemo, initialSelection } from './demo';
import { highlightLine } from './highlight';
import { splitInlineCode } from './inlineCode';
import { sanitizeCssKeyword } from './sanitize';

const card = (unit: string, index: number) => courseById('css').units.find((u) => u.key === unit)!.cards[index]!;

describe('highlightLine', () => {
  it('colors a one-line rule', () => {
    expect(highlightLine('#intro { color: teal; }')).toEqual([
      { text: '#intro ', kind: 'selector' },
      { text: '{ ', kind: 'punct' },
      { text: 'color', kind: 'property' },
      { text: ': ', kind: 'punct' },
      { text: 'teal', kind: 'value' },
      { text: '; }', kind: 'punct' },
    ]);
  });

  it('colors a selector opener, a declaration and a closer', () => {
    expect(highlightLine('.row {')).toEqual([
      { text: '.row', kind: 'selector' },
      { text: ' {', kind: 'punct' },
    ]);
    expect(highlightLine('  gap: 8px;')).toEqual([
      { text: '  gap', kind: 'property' },
      { text: ': ', kind: 'punct' },
      { text: '8px', kind: 'value' },
      { text: ';', kind: 'punct' },
    ]);
    expect(highlightLine('  border-radius: 12px')).toEqual([
      { text: '  border-radius', kind: 'property' },
      { text: ': ', kind: 'punct' },
      { text: '12px', kind: 'value' },
    ]);
    expect(highlightLine('}')).toEqual([{ text: '}', kind: 'punct' }]);
  });

  it('renders § lines as HTML and strips the marker', () => {
    expect(highlightLine('§<p class="lead">')).toEqual([{ text: '<p class="lead">', kind: 'html' }]);
  });
});

describe('splitInlineCode', () => {
  it('marks backtick segments as code', () => {
    expect(splitInlineCode('Use `gap` not `margin`.')).toEqual([
      { text: 'Use ', code: false },
      { text: 'gap', code: true },
      { text: ' not ', code: false },
      { text: 'margin', code: true },
      { text: '.', code: false },
    ]);
  });

  it('drops empty segments', () => {
    expect(splitInlineCode('`p` matches')).toEqual([
      { text: 'p', code: true },
      { text: ' matches', code: false },
    ]);
  });
});

describe('sanitizeCssKeyword', () => {
  it('keeps only letters and hyphens, lowercased', () => {
    expect(sanitizeCssKeyword(' UpperCase; }')).toBe('uppercase');
    expect(sanitizeCssKeyword('red;background:url(x)')).toBe('redbackgroundurlx');
    expect(sanitizeCssKeyword('space-between')).toBe('space-between');
  });
});

describe('initialSelection', () => {
  it('uses each knob start, defaulting to 0', () => {
    expect(initialSelection(card('basics', 0).demo)).toEqual([1, 1]);
    expect(initialSelection(card('flex', 0).demo)).toEqual([0]);
  });

  it('uses the choice start', () => {
    expect(initialSelection(card('basics', 1).demo)).toEqual([0]);
  });

  it('is empty without a demo', () => {
    expect(initialSelection(undefined)).toEqual([]);
  });
});

describe('buildDemo — knobs', () => {
  it('applies parent knobs to the stage and groups code by selector (show lines first)', () => {
    const demo = card('flex', 3).demo as KnobDemo; // Direction swaps the axes
    const view = buildDemo(demo, [1, 2]);
    expect(view.stage).toBe('display:flex;gap:8px;height:200px;;flex-direction:column;justify-content:space-between;');
    expect(view.code).toEqual([
      '.row {',
      '  display: flex;',
      '  flex-direction: column;',
      '  justify-content: space-between;',
      '}',
    ]);
    expect(view.children.every((c) => c.wrap === 'display:contents')).toBe(true);
    expect(view.controls.map((c) => c.label)).toEqual(['flex-direction', 'justify-content']);
    expect(view.controls[1]!.options.map((o) => o.active)).toEqual([false, false, true]);
  });

  it('applies a numeric target to one child only', () => {
    const demo = card('flex', 4).demo as KnobDemo; // flex-grow on item 2
    const view = buildDemo(demo, [0, 2]);
    expect(view.stage.endsWith('gap:0;')).toBe(true);
    expect(view.children[0]!.css).not.toContain('flex-grow');
    expect(view.children[1]!.css.endsWith(';flex-grow:2;')).toBe(true);
    expect(view.children[2]!.css).not.toContain('flex-grow');
    expect(view.code).toEqual(['.row {', '  display: flex;', '  gap: 0;', '}', '.item:nth-child(2) {', '  flex-grow: 2;', '}']);
  });

  it('keeps the wrapper CSS when a kid defines one', () => {
    const demo = card('box', 0).demo as KnobDemo;
    const view = buildDemo(demo, [2, 0, 1]);
    expect(view.children[0]!.wrap).toBe('display:flex;background:#FCD9C8;border-radius:4px');
    expect(view.children[0]!.css).toContain(';padding:24px;border:none;margin:12px;');
    expect(view.legend.map((l) => l.l)).toEqual(['margin', 'border', 'padding', 'content']);
  });

  it('falls back to start for missing selections', () => {
    const demo = card('basics', 0).demo as KnobDemo;
    expect(buildDemo(demo, []).children[0]!.css).toContain('color:indigo;font-size:24px;');
  });
});

describe('buildDemo — choice', () => {
  it('shows the selected option’s kids, code and note', () => {
    const demo = card('basics', 2).demo as ChoiceDemo; // The cascade
    const view = buildDemo(demo, [2]);
    expect(view.stage).toBe('display:grid;place-items:center;');
    expect(view.code).toEqual(['§<p id="intro" class="lead">', '.lead { color: tomato; }', '#intro { color: teal; }']);
    expect(view.caption).toBe('#intro (1·0·0) beats .lead → teal');
    expect(view.children[0]!.css).toContain('color:teal');
    expect(view.controls).toHaveLength(1);
    expect(view.controls[0]!.label).toBe('second rule’s selector');
    expect(view.controls[0]!.options.map((o) => o.active)).toEqual([false, false, true]);
  });
});

describe('buildRustDemo', () => {
  const choice: CodeChoiceDemo = {
    kind: 'code-choice',
    label: 'let t = …',
    opts: [
      { label: 's', code: ['let t = s;'], error: 'error[E0382]: borrow of moved value: `s`', note: 'Moved.' },
      { label: 's.clone()', code: ['let t = s.clone();'], output: ['hi hi'] },
    ],
  };

  it('starts code-choice at its start option and code demos with no controls', () => {
    expect(initialSelection(choice)).toEqual([0]);
    expect(initialSelection({ ...choice, start: 1 })).toEqual([1]);
    expect(initialSelection({ kind: 'code', code: ['fn main() {}'] })).toEqual([]);
  });

  it('shows the picked option’s code, result and note', () => {
    expect(buildRustDemo(choice, [0])).toEqual({
      code: ['let t = s;'],
      error: 'error[E0382]: borrow of moved value: `s`',
      output: undefined,
      controls: [{ label: 'let t = …', options: [{ label: 's', active: true }, { label: 's.clone()', active: false }] }],
      caption: 'Moved.',
    });
    expect(buildRustDemo(choice, [1])).toMatchObject({ output: ['hi hi'], error: undefined, caption: null });
  });

  it('passes a code demo through', () => {
    expect(buildRustDemo({ kind: 'code', code: ['fn main() {}'], output: [''] }, [])).toEqual({
      code: ['fn main() {}'],
      output: [''],
      error: undefined,
      controls: [],
      caption: null,
    });
  });
});
