import SchemeCard from '../components/dashboard/SchemeCard';

export default function Saved({ savedSchemes, onViewDetails, onToggleCompare, compareList, onSave, isSaved, t }) {
  return (
    <section className="animate-fadein pt-9 pb-24">
      <div className="wrap">
        <div className="mb-8">
          <h1 className="font-display text-[2rem] font-semibold m-0 mb-2">
            {t('saved.title')}
          </h1>
          <p className="text-text-dim text-[1rem] m-0 max-w-[70ch]">
            {t('saved.desc')}
          </p>
        </div>

        {savedSchemes.length === 0 ? (
          <div className="text-center py-20 px-5 text-text-dim bg-bg2 rounded-card border border-line">
            <div className="text-[2.4rem] mb-3">🔖</div>
            <p className="m-0 text-[1.1rem] font-semibold">{t('saved.empty.title')}</p>
            <p className="m-0 text-[0.88rem] mt-1">{t('saved.empty.desc')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <span className="text-text-dim text-[0.85rem]">
                {savedSchemes.length} {savedSchemes.length === 1 ? t('saved.count.one') : t('saved.count.many')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {savedSchemes.map(scheme => (
                <SchemeCard
                  key={scheme.id}
                  scheme={scheme}
                  onViewDetails={onViewDetails}
                  onToggleCompare={onToggleCompare}
                  isCompared={compareList?.some(s => s.id === scheme.id)}
                  onSave={onSave}
                  isSaved={isSaved?.(scheme.id)}
                  showRelevance={scheme.relevance_percent != null}
                  t={t}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
