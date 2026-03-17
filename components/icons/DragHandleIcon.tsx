interface DragHandleIconProps {
  className?: string;
  size?: number;
  color?: string;
}

export function DragHandleIcon({ className, size = 20, color = '#99A1AF' }: DragHandleIconProps) {
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
        d="M7.50033 10.8337C7.96056 10.8337 8.33366 10.4606 8.33366 10.0003C8.33366 9.54009 7.96056 9.16699 7.50033 9.16699C7.04009 9.16699 6.66699 9.54009 6.66699 10.0003C6.66699 10.4606 7.04009 10.8337 7.50033 10.8337Z"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.50033 4.99967C7.96056 4.99967 8.33366 4.62658 8.33366 4.16634C8.33366 3.7061 7.96056 3.33301 7.50033 3.33301C7.04009 3.33301 6.66699 3.7061 6.66699 4.16634C6.66699 4.62658 7.04009 4.99967 7.50033 4.99967Z"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.50033 16.6667C7.96056 16.6667 8.33366 16.2936 8.33366 15.8333C8.33366 15.3731 7.96056 15 7.50033 15C7.04009 15 6.66699 15.3731 6.66699 15.8333C6.66699 16.2936 7.04009 16.6667 7.50033 16.6667Z"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5003 10.8337C12.9606 10.8337 13.3337 10.4606 13.3337 10.0003C13.3337 9.54009 12.9606 9.16699 12.5003 9.16699C12.0401 9.16699 11.667 9.54009 11.667 10.0003C11.667 10.4606 12.0401 10.8337 12.5003 10.8337Z"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5003 4.99967C12.9606 4.99967 13.3337 4.62658 13.3337 4.16634C13.3337 3.7061 12.9606 3.33301 12.5003 3.33301C12.0401 3.33301 11.667 3.7061 11.667 4.16634C11.667 4.62658 12.0401 4.99967 12.5003 4.99967Z"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5003 16.6667C12.9606 16.6667 13.3337 16.2936 13.3337 15.8333C13.3337 15.3731 12.9606 15 12.5003 15C12.0401 15 11.667 15.3731 11.667 15.8333C11.667 16.2936 12.0401 16.6667 12.5003 16.6667Z"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
