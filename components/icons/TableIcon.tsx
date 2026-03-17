import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function TableIcon({
  className,
  size = 16,
  color = '#4A5565',
}: IconProps) {
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
        d="M12.6667 2H3.33333
           C2.59695 2 2 2.59695 2 3.33333
           V12.6667
           C2 13.403 2.59695 14 3.33333 14
           H12.6667
           C13.403 14 14 13.403 14 12.6667
           V3.33333
           C14 2.59695 13.403 2 12.6667 2Z"
        stroke={color}
        strokeWidth={1.33333}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 6H14"
        stroke={color}
        strokeWidth={1.33333}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 10H14"
        stroke={color}
        strokeWidth={1.33333}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 2V14"
        stroke={color}
        strokeWidth={1.33333}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 2V14"
        stroke={color}
        strokeWidth={1.33333}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
