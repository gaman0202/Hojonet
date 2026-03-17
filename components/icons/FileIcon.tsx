import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function FileIcon({ className, size = 24, color = '#4A5565' }: IconProps) {
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
        d="M13.3341 16.6669V3.33356C13.3341 2.89154 13.1585 2.46761 12.846 2.15505C12.5334 1.84249 12.1095 1.66689 11.6675 1.66689H8.33415C7.89213 1.66689 7.4682 1.84249 7.15564 2.15505C6.84308 2.46761 6.66748 2.89154 6.66748 3.33356V16.6669"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.6675 5H3.33415C2.59777 5 2.00081 5.59695 2.00081 6.33333V15C2.00081 15.7364 2.59777 16.3333 3.33415 16.3333H16.6675C17.4039 16.3333 18.0008 15.7364 18.0008 15V6.33333C18.0008 5.59695 17.4039 5 16.6675 5Z"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
