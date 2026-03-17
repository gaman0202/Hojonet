import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function DocumentIcon({ className, size = 24, color = '#4A5565' }: IconProps) {
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
        d="M12.5002 1.6665H5.00016C4.55814 1.6665 4.13421 1.8421 3.82165 2.15466C3.50909 2.46722 3.3335 2.89114 3.3335 3.33317V16.6665C3.3335 17.1085 3.50909 17.5325 3.82165 17.845C4.13421 18.1576 4.55814 18.3332 5.00016 18.3332H15.0002C15.4422 18.3332 15.8661 18.1576 16.1787 17.845C16.4912 17.5325 16.6668 17.1085 16.6668 16.6665V5.83317L12.5002 1.6665Z"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.6665 1.6665V4.99984C11.6665 5.44186 11.8421 5.86579 12.1547 6.17835C12.4672 6.49091 12.8911 6.6665 13.3332 6.6665H16.6665"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.33317 7.5H6.6665"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.3332 10.8335H6.6665"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.3332 14.1665H6.6665"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
