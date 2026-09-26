import { HeartIcon } from './icons';
import styles from './HeartCount.module.css';

export function HeartCount({ count }: { count: number }) {
  return (
    <p className={styles.hearts}>
      <HeartIcon />
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{count === 1 ? '1 heart' : `${count} hearts`}</span>
    </p>
  );
}
