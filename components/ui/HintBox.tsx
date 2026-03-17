interface HintBoxProps {
  children: React.ReactNode;
  variant?: 'info' | 'warning' | 'error' | 'success';
  className?: string;
}

const variantStyles = {
  info: 'bg-[#EFF6FF] border-[#BEDBFF] text-[#193CB8]',
  warning: 'bg-[#FFF7ED] border-[#FDBA74] text-[#C2410C]',
  error: 'bg-[#FFE2E2] border-[#FFC9C9] text-[#C10007]',
  success: 'bg-[#DCFCE7] border-[#BBF7D0] text-[#008236]',
};

export function HintBox({ children, variant = 'info', className = '' }: HintBoxProps) {
  return (
    <div className={`flex flex-col gap-1 p-3 sm:p-[13px] w-full border rounded-[10px] ${variantStyles[variant]} ${className}`}>
      <div className="text-sm font-normal leading-5 tracking-[-0.150391px]">
        {children}
      </div>
    </div>
  );
}
