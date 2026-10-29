export interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 28, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="WriteWise logo"
    >
      <rect width="48" height="48" rx="16" fill="url(#ww-logo-gradient)" />
      <path
        d="M12 16 L18 32 L24 20 L30 32 L36 16"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <defs>
        <linearGradient id="ww-logo-gradient" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#B7ABF0" />
          <stop offset="100%" stopColor="#F6A8C4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
