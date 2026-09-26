import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary = filled indigo; secondary = white with indigo text; inverse = white on an indigo card. */
  variant?: 'primary' | 'secondary' | 'inverse';
};

/** Chunky 3D button (thicker bottom edge), 52px tall. */
export function Button({ variant = 'primary', className, type = 'button', ...rest }: Props) {
  return <button type={type} className={[styles.button, styles[variant], className].filter(Boolean).join(' ')} {...rest} />;
}
