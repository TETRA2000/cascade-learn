// Inline SVG icons from the prototype. All decorative (aria-hidden); pair with text.
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function HeartIcon({ size = 22, ...rest }: IconProps) {
  return (
    <Svg size={size} fill="var(--accent)" stroke="var(--wrong)" strokeWidth={1.5} {...rest}>
      <path d="M12 21s-7.5-4.6-9.5-9.4C1.2 8.4 3.3 5 6.6 5c2 0 3.4 1.1 4.4 2.5C12 6.1 13.4 5 15.4 5c3.3 0 5.4 3.4 4.1 6.6C19.5 16.4 12 21 12 21z" />
    </Svg>
  );
}

export function CloseIcon({ size = 22, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={2.5} {...rest}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function CheckCircleIcon({ size = 22, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={2.5} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <path d="M7.5 12.5l3 3 6-6.5" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 18, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={2.5} {...rest}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function BookIcon({ size = 24, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={2} {...rest}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    </Svg>
  );
}

export function TargetIcon({ size = 24, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={2} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </Svg>
  );
}

export function BulbIcon({ size = 24, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={2} {...rest}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z" />
    </Svg>
  );
}

export function CheckIcon({ size = 16, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={3} {...rest}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function XCircleIcon({ size = 22, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={2.5} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </Svg>
  );
}

export function StarIcon({ size = 96, ...rest }: IconProps) {
  return (
    <Svg size={size} fill="var(--primary-soft)" stroke="var(--primary)" strokeWidth={1.6} strokeLinejoin="round" {...rest}>
      <path d="M12 2.8l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L3 9.4l6.2-.9z" />
    </Svg>
  );
}

export function BrokenHeartIcon({ size = 96, ...rest }: IconProps) {
  return (
    <Svg size={size} fill="none" stroke="var(--wrong)" strokeWidth={1.6} strokeLinejoin="round" {...rest}>
      <path d="M12 21s-7.5-4.6-9.5-9.4C1.2 8.4 3.3 5 6.6 5c2 0 3.4 1.1 4.4 2.5C12 6.1 13.4 5 15.4 5c3.3 0 5.4 3.4 4.1 6.6C19.5 16.4 12 21 12 21z" />
      <path d="M12 7.5l-1.5 3.5 3 2-1.5 3.5" />
    </Svg>
  );
}

export function MinusIcon({ size = 24, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={3} {...rest}>
      <path d="M5 12h14" />
    </Svg>
  );
}

export function PlusIcon({ size = 24, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={3} {...rest}>
      <path d="M5 12h14M12 5v14" />
    </Svg>
  );
}
