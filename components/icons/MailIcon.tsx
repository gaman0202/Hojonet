import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function MailIcon({ className, size = 24, color = '#99A1AF' }: IconProps) {
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
      <rect x="4" y="6" width="16" height="12" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M5 8l7 5 7-5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
