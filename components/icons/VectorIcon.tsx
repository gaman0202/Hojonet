import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function VectorIcon({ className, size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <path
        d="M18.3337 5.8335L11.2503 12.9168L7.08366 8.75016L1.66699 14.1668"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.333 5.8335H18.333V10.8335"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
