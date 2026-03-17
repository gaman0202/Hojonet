interface CopyIconProps {
  size?: number;
  color?: string;
}

export default function CopyIcon({ size = 24, color = '#000000' }: CopyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.33334 3.33333H12.6667C13.403 3.33333 14 3.93029 14 4.66667V12"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6667 1.33333H3.33334C2.59696 1.33333 2 1.93029 2 2.66667V10C2 10.7364 2.59696 11.3333 3.33334 11.3333H10.6667C11.403 11.3333 12 10.7364 12 10V2.66667C12 1.93029 11.403 1.33333 10.6667 1.33333Z"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
