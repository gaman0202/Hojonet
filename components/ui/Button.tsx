import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles = {
  primary: 'bg-[#9810FA] text-white hover:bg-[#8200DB] disabled:bg-[#D1D5DC] disabled:cursor-not-allowed',
  secondary: 'bg-white border border-[#D1D5DC] text-[#364153] hover:bg-gray-50',
  ghost: 'bg-transparent text-[#364153] hover:bg-gray-50',
  danger: 'bg-[#FB2C36] text-white hover:bg-[#E7000B]',
};

const sizeStyles = {
  sm: 'px-3 h-9 text-sm gap-1.5',
  md: 'px-4 h-10 text-base gap-2',
  lg: 'px-6 h-11 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false,
    className = '',
    children,
    ...props 
  }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center rounded-[10px] font-normal transition-colors
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
