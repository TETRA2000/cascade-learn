/** Visual state of a selectable answer tile. */
export type Tone = 'idle' | 'selected' | 'correct' | 'wrong';

export function tone(picked: boolean, isAnswer: boolean, checked: boolean): Tone {
  if (checked && isAnswer) return 'correct';
  if (checked && picked) return 'wrong';
  if (picked) return 'selected';
  return 'idle';
}

/** Appended to a tile's accessible name so correctness is never conveyed by color alone. */
export function toneLabel(t: Tone): string {
  if (t === 'correct') return ', correct answer';
  if (t === 'wrong') return ', your answer, incorrect';
  return '';
}
