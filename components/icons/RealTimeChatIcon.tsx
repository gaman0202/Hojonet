import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function RealTimeChatIcon({ className, size = 32, color = '#00A63E' }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10.6667 16H10.68M16 16H16.0133M21.3333 16H21.3467M28 16C28 21.8907 22.6267 26.6667 16 26.6667C14.0382 26.6734 12.0997 26.2411 10.3267 25.4014L4 26.6667L5.86 21.7067C4.68267 20.056 4 18.0987 4 16C4 10.1094 9.37333 5.33337 16 5.33337C22.6267 5.33337 28 10.1094 28 16Z"
        stroke={color}
        strokeWidth="2.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

