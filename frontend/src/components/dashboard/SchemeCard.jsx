import { useState } from 'react';
import ScoreBadge from './ScoreBadge';
import MatchReasons from './MatchReasons';

export default function SchemeCard({
  scheme,
  rank,
  onViewDetails,
  onToggleCompare,
  isCompared,
  onSave,
  isSaved,
  showRelevance = true,
  t
}) {
  const [explainOpen, setExplainOpen] = useState(false);
  const isTopMatch = rank === 1 && showRelevance;
  const saved = isSaved;

  return (
    <div className={`scheme-card transition-shadow ${isTopMatch ? 'border-sprout ring-1 ring-sprout/30' : ''} ${isCompared ? 'ring-2 ring-turmeric ring-inset' : ''}`}>
      {/* Top match banner */}
      {isTopMatch && (
        <div className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.8px] text-sprout mb-3">
          <span>🌾</span> {t('card.top.match')}
        </div>
      )}

      <div className="flex justify-between gap-5 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          {rank && !isTopMatch && (
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-[rgba(27,46,39,0.12)] text-ink-dim font-mono text-[0.68rem] font-bold mr-2 shrink-0">
              {rank}
            </span>
          )}

          <h3 className="font-display text-[1.2rem] font-semibold m-0 inline leading-[1.3]">
            {scheme.scheme_name}
          </h3>

          <div className="flex gap-1.5 flex-wrap mt-2 mb-2">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.5px] px-2.5 py-[3px] rounded-full bg-[rgba(27,46,39,0.08)] text-ink-dim">
              {scheme.state === 'All' ? t('details.nationwide') : scheme.state}
            </span>
            {scheme.crop && scheme.crop !== 'All' && (
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.5px] px-2.5 py-[3px] rounded-full bg-[#d9ecd1] text-[#356121]">
                {scheme.crop.length > 40 ? scheme.crop.slice(0, 40) + '…' : scheme.crop}
              </span>
            )}
          </div>

          <p className="text-[0.88rem] leading-[1.5] text-[#3d4c44] m-0 line-clamp-2 max-w-[60ch]">
            {scheme.benefits}
          </p>
        </div>

        {showRelevance && (
          <ScoreBadge percent={scheme.relevance_percent} t={t} />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 items-center mt-4 flex-wrap">
        <button className="link-btn" onClick={() => onViewDetails(scheme.id)}>
          {t('card.btn.details')}
        </button>

        {scheme.application_link && (
          <a
            href={scheme.application_link}
            target="_blank"
            rel="noopener noreferrer"
            className="ghost-btn no-underline inline-flex items-center"
          >
            {t('card.btn.apply')}
          </a>
        )}

        {onToggleCompare && (
          <button
            className={`ghost-btn text-[0.78rem] ${isCompared ? 'bg-[rgba(231,167,44,0.1)] border-turmeric text-turmeric' : ''}`}
            onClick={() => onToggleCompare({ ...scheme, rank })}
          >
            {isCompared ? t('card.btn.compare.added') : t('card.btn.compare.add')}
          </button>
        )}

        {onSave && (
          <button
            className={`ghost-btn text-[0.78rem] ml-auto ${saved ? 'border-turmeric text-turmeric bg-[rgba(231,167,44,0.06)]' : ''}`}
            onClick={() => onSave(scheme, saved ? 'remove' : 'save')}
            title={saved ? t('card.saved') : t('card.save')}
          >
            {saved ? '🔖 ' + t('card.saved') : '🔖 ' + t('card.save')}
          </button>
        )}

        {showRelevance && scheme.match_reasons && (
          <button
            className="flex items-center gap-1 text-[0.78rem] text-ink-dim bg-transparent border-none cursor-pointer hover:text-ink font-semibold p-0"
            onClick={() => setExplainOpen(!explainOpen)}
          >
            {explainOpen ? t('card.why.hide') : t('card.why.show')}
          </button>
        )}
      </div>

      {/* Match reasons */}
      {showRelevance && scheme.match_reasons && (
        <MatchReasons match_reasons={scheme.match_reasons} isOpen={explainOpen} t={t} />
      )}
    </div>
  );
}
