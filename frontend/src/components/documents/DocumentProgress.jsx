export default function DocumentProgress({ readyCount, totalCount, t }) {
  const percent = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;
  
  return (
    <div className="bg-[rgba(231,167,44,0.08)] border border-[rgba(231,167,44,0.3)] rounded-card p-4 mb-4">
      <div className="flex justify-between items-end mb-2">
        <span className="font-semibold text-text text-[0.95rem]">
          {t('docs.readiness') || 'Document Readiness'}
        </span>
        <span className="font-mono font-bold text-[0.85rem] text-turmeric">
          {readyCount} / {totalCount} {t('docs.ready') || 'ready'}
        </span>
      </div>
      <div className="h-2 bg-[rgba(27,46,39,0.1)] rounded-full overflow-hidden w-full relative">
        <div 
          className="absolute top-0 left-0 bottom-0 bg-turmeric transition-all duration-500 ease-out" 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
