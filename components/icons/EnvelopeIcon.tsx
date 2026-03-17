import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function EnvelopeIcon({ className, size = 24, color = '#4A5565' }: IconProps) {
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
        d="M16.6675 3.33312H3.33415C2.59777 3.33312 2.00081 3.93008 2.00081 4.66646V14.9998C2.00081 15.7362 2.59777 16.3331 3.33415 16.3331H16.6675C17.4039 16.3331 18.0008 15.7362 18.0008 14.9998V4.66646C18.0008 3.93008 17.4039 3.33312 16.6675 3.33312Z"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.0008 5.83312L10.8591 10.5831C10.6019 10.7443 10.3044 10.8298 10.0008 10.8298C9.69721 10.8298 9.39973 10.7443 9.14248 10.5831L2.00081 5.83312"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
