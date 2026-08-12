export default function DocumentItem({ name, isAvailable, onToggle, onShowGuidance, hasGuidance, t }) {
  return (
    <label 
      className={`flex items-start gap-3 py-3 px-2 border-b border-line last:border-b-0 cursor-pointer transition-colors ${isAvailable ? '' : 'hover:bg-[rgba(27,46,39,0.02)]'}`}
    >
      <input 
        type="checkbox" 
        checked={isAvailable}
        onChange={onToggle}
        className="w-[18px] h-[18px] mt-0.5 accent-sprout cursor-pointer shrink-0"
      />
      <div className="flex flex-col flex-1">
        <span className={`text-[0.95rem] ${isAvailable ? 'text-text line-through opacity-70' : 'text-text font-medium'}`}>
          {name}
        </span>
        <span className={`text-[0.78rem] font-bold mt-1 ${isAvailable ? 'text-sprout' : 'text-text-dim'}`}>
          {isAvailable 
            ? (t('docs.status.available') || 'Available')
            : (t('docs.status.missing') || 'Missing')
          }
        </span>
        
        {!isAvailable && hasGuidance && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault(); // Prevent checkbox toggle when clicking the button
              onShowGuidance();
            }}
            className="self-start mt-2 bg-[rgba(231,167,44,0.15)] text-[0.8rem] text-[rgba(200,140,25,1)] font-semibold border-none px-3 py-1.5 rounded-[6px] cursor-pointer hover:bg-[rgba(231,167,44,0.25)] transition-colors"
          >
            {t('docs.btn.how') || 'How can I get this?'}
          </button>
        )}
      </div>
    </label>
  );
}
