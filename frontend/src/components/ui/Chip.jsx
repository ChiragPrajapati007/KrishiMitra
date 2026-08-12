export default function Chip({ children, selected, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`border bg-bg3 px-[15px] py-[9px] rounded-full text-[0.85rem] cursor-pointer transition-all select-none flex items-center gap-2
        ${selected 
          ? 'bg-sprout text-ink border-sprout font-semibold' 
          : 'border-line text-text-dim hover:border-sprout'
        }`}
    >
      {children}
    </div>
  );
}
