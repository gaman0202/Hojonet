interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  bgColor?: string;
  className?: string;
}

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-20 h-20 text-2xl',
};

export function Avatar({ 
  name, 
  size = 'md', 
  color = '#9810FA', 
  bgColor = '#F3E8FF',
  className = ''
}: AvatarProps) {
  const initial = name.charAt(0);

  return (
    <div 
      className={`flex items-center justify-center rounded-full flex-shrink-0 font-normal ${sizeStyles[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <span style={{ color }}>{initial}</span>
    </div>
  );
}
