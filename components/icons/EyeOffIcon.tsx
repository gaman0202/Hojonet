import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function EyeOffIcon({ className, size = 24, color = '#4A5565' }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path
        d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9.88 5.1A10.3 10.3 0 0 1 12 5c6.5 0 10 7 10 7a18.6 18.6 0 0 1-3.26 4.22"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6.11 6.11C3.7 8.06 2 12 2 12s3.5 7 10 7c1.04 0 2.03-.17 2.95-.47"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
