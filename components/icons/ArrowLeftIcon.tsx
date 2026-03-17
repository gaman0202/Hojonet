interface ArrowLeftIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function ArrowLeftIcon({ size = 24, color = '#364153', className }: ArrowLeftIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10.0003 15.8332L4.16699 9.99984L10.0003 4.1665"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.8337 10H4.16699"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
