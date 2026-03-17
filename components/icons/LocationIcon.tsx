import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function LocationIcon({ className, size = 24, color = '#4A5565' }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M13.3337 6.66683C13.3337 9.9955 9.64099 13.4622 8.40099 14.5328C8.28548 14.6197 8.14486 14.6667 8.00033 14.6667C7.85579 14.6667 7.71518 14.6197 7.59966 14.5328C6.35966 13.4622 2.66699 9.9955 2.66699 6.66683C2.66699 5.25234 3.2289 3.89579 4.22909 2.89559C5.22928 1.8954 6.58584 1.3335 8.00033 1.3335C9.41481 1.3335 10.7714 1.8954 11.7716 2.89559C12.7718 3.89579 13.3337 5.25234 13.3337 6.66683Z"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8.6665C9.10457 8.6665 10 7.77107 10 6.6665C10 5.56193 9.10457 4.6665 8 4.6665C6.89543 4.6665 6 5.56193 6 6.6665C6 7.77107 6.89543 8.6665 8 8.6665Z"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
