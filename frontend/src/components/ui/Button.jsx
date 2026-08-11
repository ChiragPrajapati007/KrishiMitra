export default function Button({ children, onClick, type = "button", variant = "primary", disabled = false, className = "" }) {
  const baseStyle = variant === 'primary' 
    ? 'bg-turmeric text-ink border-none px-7 py-[15px] rounded-[10px] font-bold text-[0.98rem] cursor-pointer shadow-glow transition-all hover:-translate-y-[2px] hover:shadow-glow-hover'
    : 'bg-transparent text-text border border-line px-6 py-[14px] rounded-[10px] font-semibold text-[0.95rem] cursor-pointer hover:border-text-dim';
  
  const disabledStyle = disabled ? 'opacity-50 cursor-not-allowed hover:-translate-y-0 hover:shadow-none' : '';

  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${disabledStyle} ${className}`}
    >
      {children}
    </button>
  );
}
