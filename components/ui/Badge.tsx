interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'blue' | 'purple' | 'green' | 'red' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles = {
  default: 'bg-[#F3F4F6] border-[#E5E7EB] text-[#364153]',
  blue: 'bg-[#DBEAFE] border-[#BBD8FF] text-[#1447E6]',
  purple: 'bg-[#F3E8FF] border-[#E9D4FF] text-[#8200DB]',
  green: 'bg-[#DCFCE7] border-[#BBF7D0] text-[#008236]',
  red: 'bg-[#FFE2E2] border-[#FFC9C9] text-[#C10007]',
  gray: 'bg-[#F3F4F6] border-[#E5E7EB] text-[#364153]',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs leading-4',
  md: 'px-3 py-1 text-xs leading-4',
};

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = ''
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-normal whitespace-nowrap ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}
