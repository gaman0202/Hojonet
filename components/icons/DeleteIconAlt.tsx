import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function DeleteIconAlt({ className, size = 16, color = '#FB2C36' }: IconProps) {
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
        d="M2 4H14"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.6673 4V13.3333C12.6673 14 12.0007 14.6667 11.334 14.6667H4.66732C4.00065 14.6667 3.33398 14 3.33398 13.3333V4"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.33398 4.00016V2.66683C5.33398 2.00016 6.00065 1.3335 6.66732 1.3335H9.33398C10.0007 1.3335 10.6673 2.00016 10.6673 2.66683V4.00016"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.66602 7.3335V11.3335"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.33398 7.3335V11.3335"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
