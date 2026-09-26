import { useEffect, useState } from 'react';

/**
 * False until `ms` have passed since mount or since `key` last changed.
 * Check and Continue replace each other in the same spot, so without this the
 * second half of a double tap (or a repeated Enter) lands on the new button.
 */
export function useArmed(key: unknown, ms: number): boolean {
  const [armed, setArmed] = useState<{ key: unknown } | null>(null);
  useEffect(() => {
    if (ms <= 0) return;
    const timer = setTimeout(() => setArmed({ key }), ms);
    return () => clearTimeout(timer);
  }, [key, ms]);
  return ms <= 0 || armed?.key === key;
}
