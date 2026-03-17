'use client';

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function CopyIconAlt({ className, size = 16, color = '#1447E6' }: IconProps) {
  const clipId = React.useId().replace(/:/g, '');
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
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M13.334 5.3335H6.66732C5.93094 5.3335 5.33398 5.93045 5.33398 6.66683V13.3335C5.33398 14.0699 5.93094 14.6668 6.66732 14.6668H13.334C14.0704 14.6668 14.6673 14.0699 14.6673 13.3335V6.66683C14.6673 5.93045 14.0704 5.3335 13.334 5.3335Z"
          stroke={color}
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2.66732 10.6668C1.93398 10.6668 1.33398 10.0668 1.33398 9.3335V2.66683C1.33398 1.9335 1.93398 1.3335 2.66732 1.3335H9.33398C10.0673 1.3335 10.6673 1.9335 10.6673 2.66683"
          stroke={color}
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
