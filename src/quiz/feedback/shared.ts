// Feedback copy shared by every course.
export const PRAISE = ['Nice — that’s right!', 'Nailed it!', 'Exactly right!', 'Sharp eye!'];

export interface FeedbackText {
  title: string;
  /** Bold line under the title ("Answer: …"), or null when there is none to show. */
  detail: string | null;
}

export const optionLetter = (i: number) => String.fromCharCode(65 + i);

export function pairsSummary(misses: number): string {
  return misses === 0 ? 'Flawless — no mismatches.' : `${misses} ${misses === 1 ? 'mismatch' : 'mismatches'} along the way.`;
}
