interface FormFieldProps {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}

export function FormField({ 
  label, 
  required, 
  className = '', 
  children,
  error,
  hint
}: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-normal leading-5 tracking-[-0.150391px] text-[#364153]">
        {label} {required && <span className="text-[#FB2C36]">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-[#FB2C36] leading-4">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-[#6A7282] leading-4">{hint}</p>
      )}
    </div>
  );
}
