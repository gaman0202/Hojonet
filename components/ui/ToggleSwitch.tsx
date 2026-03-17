interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
  activeColor?: string;
}

export function ToggleSwitch({ 
  checked, 
  onChange, 
  size = 'md',
  activeColor = '#155DFC'
}: ToggleSwitchProps) {
  const dimensions = size === 'sm' 
    ? { width: 'w-9', height: 'h-5', knob: 'w-[18px] h-[18px]', translate: 'translate-x-[-15px]' }
    : { width: 'w-11', height: 'h-6', knob: 'w-[22px] h-[22px]', translate: 'translate-x-[-19px]' };

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative ${dimensions.width} ${dimensions.height} rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#9810FA] focus:ring-offset-2`}
      style={{ backgroundColor: checked ? activeColor : '#D1D5DC' }}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`absolute top-[1px] right-[1px] ${dimensions.knob} bg-white rounded-full transition-transform duration-200 ${
          checked ? `transform ${dimensions.translate}` : 'transform translate-x-0'
        }`}
      />
    </button>
  );
}
