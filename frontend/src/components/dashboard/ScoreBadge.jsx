export default function ScoreBadge({ percent, t }) {
  return (
    <div className="text-center">
      <div className="font-mono font-bold text-[1.05rem] text-clay">
        {percent}%
      </div>
      <div className="text-[0.66rem] uppercase tracking-[0.6px] text-ink-dim mt-0.5 font-bold">
        {t('card.relevance')}
      </div>
    </div>
  );
}
