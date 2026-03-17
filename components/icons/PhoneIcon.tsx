import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function PhoneIcon({ className, size = 24, color = '#4A5565' }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6.95 1.66667C6.33333 1.66667 5.83333 2.16667 5.83333 2.78333V17.2167C5.83333 17.8333 6.33333 18.3333 6.95 18.3333H13.05C13.6667 18.3333 14.1667 17.8333 14.1667 17.2167V2.78333C14.1667 2.16667 13.6667 1.66667 13.05 1.66667H6.95Z"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 15H10.00833"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
