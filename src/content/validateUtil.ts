// Small type checks shared by the content validators.
export type Err = (where: string, msg: string) => void;

export const isStr = (v: unknown): v is string => typeof v === 'string';
export const isInt = (v: unknown): v is number => Number.isInteger(v);
export const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
export const inRange = (i: unknown, len: number) => isInt(i) && i >= 0 && i < len;
