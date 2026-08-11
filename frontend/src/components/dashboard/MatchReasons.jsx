export default function MatchReasons({ match_reasons, isOpen, t }) {
  if (!isOpen) return null;
  
  return (
    <div className="mt-5 pt-[18px] border-t border-dashed border-line-paper animate-fadein">
      <h4 className="text-[0.75rem] uppercase tracking-[0.6px] text-ink-dim font-bold m-0 mb-2.5">
        {t('card.why.title')}
      </h4>
      <ul className="list-none m-0 p-0 flex flex-col gap-2">
        {match_reasons && match_reasons.length > 0 ? (
          match_reasons.map((reason, idx) => (
            <li key={idx} className="flex gap-[9px] text-[0.86rem] leading-[1.4] text-ink">
              <span className="shrink-0 font-extrabold text-[#3c8b3c]">✓</span>
              {reason}
            </li>
          ))
        ) : (
          <li className="text-[0.86rem] text-ink-dim italic">
            {t('card.why.fallback')}
          </li>
        )}
      </ul>
    </div>
  );
}
