// The Learn playground engine — a port of demoVm() in
// reference/design-canvas/Prototype.dc.html. Pure: content + selection in,
// CSS strings and code lines out.
import type { Demo, LegendItem } from '../content/types';

export interface DemoChild {
  /** Wrapper CSS (`display:contents` unless the content sets `w`). */
  wrap: string;
  css: string;
  text: string;
}

export interface DemoControl {
  label: string;
  options: { label: string; active: boolean }[];
}

export interface DemoView {
  /** Stage CSS; applied on top of the stage frame. */
  stage: string;
  children: DemoChild[];
  /** CSS code lines for the code panel (may include `§` HTML lines). */
  code: string[];
  /** One control per knob; a choice demo has a single control. Index = selection index. */
  controls: DemoControl[];
  caption: string | null;
  legend: LegendItem[];
}

/** Selected option index per control, i.e. each knob's `start` (default 0). */
export function initialSelection(demo: Demo | undefined): number[] {
  if (!demo) return [];
  if (demo.kind === 'choice') return [demo.start ?? 0];
  return demo.knobs.map((k) => k.start ?? 0);
}

export function buildDemo(demo: Demo, selection: readonly number[]): DemoView {
  const wrapChild = (k: { s: string; t: string; w?: string }, extra = ''): DemoChild => ({
    wrap: k.w ?? 'display:contents',
    css: k.s + ';' + extra,
    text: k.t,
  });

  if (demo.kind === 'choice') {
    const active = selection[0] ?? 0;
    const opt = demo.opts[active] ?? demo.opts[0]!;
    return {
      stage: demo.base,
      children: opt.kids.map((k) => wrapChild(k)),
      code: opt.code,
      controls: [{ label: demo.label, options: demo.opts.map((o, i) => ({ label: o.label, active: i === active })) }],
      caption: opt.note ?? null,
      legend: [],
    };
  }

  const chosen = demo.knobs.map((k, i) => selection[i] ?? k.start ?? 0);
  const values = demo.knobs.map((k, i) => k.opts[chosen[i]!]!);

  let stage = demo.base + ';';
  const childCss = demo.kids.map(() => '');

  // Code panel: fixed `show` lines first, then knob lines, grouped by selector
  // in first-seen order.
  const groups = new Map<string, string[]>();
  const addLine = (sel: string, line: string) => {
    const lines = groups.get(sel) ?? [];
    lines.push(line);
    groups.set(sel, lines);
  };
  Object.entries(demo.show ?? {}).forEach(([sel, lines]) => lines.forEach((l) => addLine(sel, l)));

  demo.knobs.forEach((k, i) => {
    const decl = `${k.prop}:${values[i]};`;
    addLine(k.sel, `${k.prop}: ${values[i]}`);
    if (k.target === 'parent') stage += decl;
    else demo.kids.forEach((_, j) => {
      if (k.target === 'kids' || k.target === j) childCss[j] += decl;
    });
  });

  const code: string[] = [];
  groups.forEach((lines, sel) => {
    code.push(`${sel} {`, ...lines.map((l) => `  ${l};`), '}');
  });

  return {
    stage,
    children: demo.kids.map((k, j) => wrapChild(k, childCss[j])),
    code,
    controls: demo.knobs.map((k, i) => ({
      label: k.prop,
      options: k.opts.map((v, oi) => ({ label: v, active: chosen[i] === oi })),
    })),
    caption: null,
    legend: demo.legend ?? [],
  };
}
