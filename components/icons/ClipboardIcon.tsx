import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function ClipboardIcon({ className, size = 24, color = '#4A5565' }: IconProps) {
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
        d="M12.5003 1.6665H7.50033C7.04009 1.6665 6.66699 2.0396 6.66699 2.49984V4.1665C6.66699 4.62674 7.04009 4.99984 7.50033 4.99984H12.5003C12.9606 4.99984 13.3337 4.62674 13.3337 4.1665V2.49984C13.3337 2.0396 12.9606 1.6665 12.5003 1.6665Z"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.333 3.3335H14.9997C15.4417 3.3335 15.8656 3.50909 16.1782 3.82165C16.4907 4.13421 16.6663 4.55814 16.6663 5.00016V16.6668C16.6663 17.1089 16.4907 17.5328 16.1782 17.8453C15.8656 18.1579 15.4417 18.3335 14.9997 18.3335H4.99967C4.55765 18.3335 4.13372 18.1579 3.82116 17.8453C3.5086 17.5328 3.33301 17.1089 3.33301 16.6668V5.00016C3.33301 4.55814 3.5086 4.13421 3.82116 3.82165C4.13372 3.50909 4.55765 3.3335 4.99967 3.3335H6.66634"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 9.1665H13.3333"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 13.3335H13.3333"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.66699 9.1665H6.67533"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.66699 13.3335H6.67533"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
