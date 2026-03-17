import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function LockIcon({ className, size = 24, color = '#99A1AF' }: IconProps) {
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
      <rect x="6" y="11" width="12" height="9" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M8 11V9a4 4 0 0 1 8 0v2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
