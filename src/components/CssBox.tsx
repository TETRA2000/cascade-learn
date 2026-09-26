import { useLayoutEffect, useRef, type HTMLAttributes, type Ref } from 'react';

type Props = HTMLAttributes<HTMLElement> & {
  /**
   * Inline CSS declarations, applied verbatim as real CSS (`style.cssText`),
   * so the browser — not us — parses, cascades and drops invalid declarations.
   * Only pass content-authored CSS or input run through sanitizeCssKeyword().
   */
  css: string;
  as?: 'div' | 'span';
};

/** An element styled by a raw CSS declaration string from content. */
export function CssBox({ css, as: Tag = 'div', ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.style.cssText = css;
  }, [css]);
  return <Tag ref={ref as Ref<HTMLDivElement>} {...rest} />;
}
