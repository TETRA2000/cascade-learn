import { HeartIcon } from './icons';
import styles from './HeartCount.module.css';

/** Heart icon + number. `label` overrides the screen-reader text (e.g. "3 hearts left"). */
export function HeartCount({ count, label }: { count: number; label?: string }) {
  return (
    <p className={styles.hearts}>
      <HeartIcon />
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{label ?? (count === 1 ? '1 heart' : `${count} hearts`)}</span>
    </p>
  );
}
