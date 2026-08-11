import { useState } from 'react';
import { fetchSchemeById } from '../../api';
import { useDocuments } from '../../hooks/useDocuments';

export default function ComparePanel({ compareList, onClear, onRemove, t }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullDetails, setFullDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const { documents, normalizeDocument } = useDocuments();

  if (compareList.length === 0) return null;

  const openModal = async () => {
    setIsModalOpen(true);
    setLoadingDetails(true);
    // Fetch full details for schemes that don't already have required_documents
    const detailsMap = { ...fullDetails };
    await Promise.all(
      compareList
        .filter(s => !detailsMap[s.id])
        .map(async (s) => {
          try {
            const detail = await fetchSchemeById(s.id);
            detailsMap[s.id] = { ...s, ...detail }; // Preserve relevance, rank, match_reasons
          } catch {
            detailsMap[s.id] = s; // fallback to partial data
          }
        })
    );
    setFullDetails(detailsMap);
    setLoadingDetails(false);
  };

  // Merge compare list with full details
  const enrichedSchemes = compareList.map(s => fullDetails[s.id] || s);

  const na = t('compare.na.dataset');
  const getVal = (scheme, key) => {
    const v = scheme[key];
    if (v === null || v === undefined || v === '') return na;
    return v;
  };

  return (
    <>
      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-ink text-paper shadow-compare-bar z-[90] animate-fadein">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <span className="font-semibold text-[0.88rem] shrink-0">
              {t('compare.bar.title')} ({compareList.length}/3)
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {compareList.map(scheme => (
                <div key={scheme.id} className="bg-bg3 text-text text-[0.76rem] px-2.5 py-1 rounded-full flex items-center gap-1.5 max-w-[160px]">
                  <span className="truncate">{scheme.scheme_name}</span>
                  <button
                    onClick={() => onRemove(scheme)}
                    className="bg-transparent border-none text-text-dim cursor-pointer hover:text-danger p-0 leading-none font-bold shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={onClear}
              className="bg-transparent border border-line-paper text-paper px-3 py-2 rounded-lg text-[0.82rem] cursor-pointer hover:border-text-dim"
            >
              {t('compare.btn.clear')}
            </button>
            <button
              onClick={openModal}
              disabled={compareList.length < 2}
              className="bg-turmeric text-ink border-none px-4 py-2 rounded-lg text-[0.85rem] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {t('compare.btn.compare')}
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[101] bg-[rgba(15,42,34,0.88)] backdrop-blur-[4px] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadein"
          onClick={e => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="bg-paper text-ink w-full sm:max-w-[1000px] max-h-[92vh] overflow-y-auto rounded-t-[20px] sm:rounded-card relative shadow-[0_20px_60px_rgba(0,0,0,0.5)]">

            {/* Modal header */}
            <div className="sticky top-0 bg-paper/95 backdrop-blur-[4px] flex items-center justify-between px-6 sm:px-8 py-4 border-b border-line-paper z-10">
              <h2 className="font-display text-[1.4rem] font-semibold m-0">{t('compare.modal.title')}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[rgba(27,46,39,0.1)] border-none text-ink font-bold cursor-pointer flex items-center justify-center hover:bg-[rgba(27,46,39,0.2)]"
              >
                ✕
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {loadingDetails ? (
                <div className="text-center py-12 text-ink-dim animate-pulse">Loading details…</div>
              ) : (
                /* Desktop table / Mobile stacked */
                <>
                  {/* Desktop: table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr>
                          <th className="p-3 border-b-2 border-line-paper w-[140px] text-[0.78rem] uppercase text-ink-dim font-semibold tracking-[0.5px]" />
                          {enrichedSchemes.map(scheme => (
                            <th key={scheme.id} className="p-3 border-b-2 border-line-paper font-display text-[1.05rem] leading-[1.3] align-top">
                              {scheme.scheme_name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'Rank', render: s => s.rank ? <span className="font-mono font-bold text-ink">{s.rank}</span> : <span className="text-ink-dim text-[0.82rem]">{t('compare.na.explorer') || '-'}</span> },
                          { label: t('compare.row.relevance'), render: s => s.relevance_percent != null ? <span className="font-mono font-bold text-clay">{s.relevance_percent}%</span> : <span className="text-ink-dim text-[0.82rem]">{t('compare.na.explorer') || 'Not calculated for Explorer'}</span> },
                          { label: t('compare.row.reasons') || 'Match Reasons', render: s => s.match_reasons?.length ? <ul className="pl-4 m-0 text-[0.82rem] text-ink-dim">{s.match_reasons.map((r, i) => <li key={i}>{r}</li>)}</ul> : na },
                          { label: t('compare.row.state'), render: s => <span>{getVal(s, 'state') === 'All' ? t('details.nationwide') : getVal(s, 'state')}</span> },
                          { label: t('compare.row.crop'), render: s => getVal(s, 'crop') },
                          { label: t('compare.row.category') || 'Farmer Category', render: s => getVal(s, 'category') },
                          { label: 'Beneficiary Type', render: s => getVal(s, 'beneficiary_type') },
                          { label: 'Income Req', render: s => getVal(s, 'income_requirement') },
                          { label: t('compare.row.land') || 'Land Req', render: s => {
                            if (s.min_land_acres && s.max_land_acres) return `${s.min_land_acres} - ${s.max_land_acres} ac`;
                            if (s.min_land_acres) return `Min ${s.min_land_acres} ac`;
                            if (s.max_land_acres) return `Max ${s.max_land_acres} ac`;
                            return na;
                          }},
                          { label: t('compare.row.desc'), render: s => <span className="text-[0.85rem] leading-[1.5] line-clamp-4">{getVal(s, 'description')}</span> },
                          { label: t('compare.row.benefits'), render: s => <span className="text-[0.85rem] leading-[1.5] line-clamp-4">{getVal(s, 'benefits')}</span> },
                          { label: t('compare.row.docs'), render: s => {
                            if (!Array.isArray(s.required_documents) || s.required_documents.length === 0) return na;
                            const req = s.required_documents;
                            const norm = req.map(d => normalizeDocument(d));
                            const ready = norm.filter(d => d && documents.includes(d.id)).length;
                            return (
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[0.8rem] font-bold text-turmeric">{ready}/{req.length} {t('docs.ready') || 'ready'}</span>
                                <ul className="m-0 pl-4 text-[0.85rem] text-ink-dim">
                                  {req.map((d, i) => {
                                    const isReady = norm[i] && documents.includes(norm[i].id);
                                    return <li key={i} className={isReady ? 'line-through opacity-60 text-sprout' : ''}>{d}</li>;
                                  })}
                                </ul>
                              </div>
                            );
                          }},
                          { label: t('compare.row.source'), render: s => <span className="text-[0.82rem] leading-[1.3]">{getVal(s, 'source')}</span> },
                          { label: t('compare.row.verified'), render: s => getVal(s, 'last_verified') },
                          { label: t('compare.row.link'), render: s => s.application_link ? <a href={s.application_link} target="_blank" rel="noopener noreferrer" className="text-sky underline font-semibold text-[0.85rem] break-all">{t('card.btn.apply')}</a> : na },
                        ].map(row => (
                          <tr key={row.label}>
                            <td className="p-3 border-b border-line-paper text-[0.78rem] uppercase text-ink-dim font-semibold tracking-[0.4px] align-top">{row.label}</td>
                            {enrichedSchemes.map(s => (
                              <td key={s.id} className="p-3 border-b border-line-paper text-[0.9rem] text-ink align-top">{row.render(s)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: stacked cards */}
                  <div className="sm:hidden flex flex-col gap-6">
                    {enrichedSchemes.map(scheme => (
                      <div key={scheme.id} className="border border-line-paper rounded-[12px] overflow-hidden">
                        <div className="bg-[rgba(27,46,39,0.06)] px-4 py-3 font-display font-semibold text-[1.05rem] text-ink">
                          {scheme.scheme_name}
                        </div>
                        <div className="divide-y divide-[rgba(27,46,39,0.08)]">
                          {scheme.relevance_percent != null ? (
                            <div className="flex px-4 py-2.5 gap-3">
                              <span className="text-[0.78rem] text-ink-dim font-semibold w-28 shrink-0">{t('compare.row.relevance')}</span>
                              <span className="font-mono font-bold text-clay">{scheme.relevance_percent}%</span>
                            </div>
                          ) : (
                            <div className="flex px-4 py-2.5 gap-3">
                              <span className="text-[0.78rem] text-ink-dim font-semibold w-28 shrink-0">{t('compare.row.relevance')}</span>
                              <span className="text-[0.82rem] text-ink-dim leading-[1.4]">{t('compare.na.explorer') || 'Not calculated for Explorer'}</span>
                            </div>
                          )}
                          {scheme.match_reasons?.length > 0 && (
                            <div className="flex px-4 py-2.5 gap-3">
                              <span className="text-[0.78rem] text-ink-dim font-semibold w-28 shrink-0">{t('compare.row.reasons') || 'Match Reasons'}</span>
                              <ul className="pl-4 m-0 text-[0.82rem] text-ink-dim w-full break-words">
                                {scheme.match_reasons.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          )}
                          {[
                            ['Rank', scheme.rank ? <span className="font-mono font-bold text-ink">{scheme.rank}</span> : <span className="text-[0.82rem] text-ink-dim">{t('compare.na.explorer') || '-'}</span>],
                            [t('compare.row.state'), scheme.state === 'All' ? t('details.nationwide') : getVal(scheme, 'state')],
                            [t('compare.row.crop'), getVal(scheme, 'crop')],
                            [t('compare.row.category') || 'Farmer Category', getVal(scheme, 'category')],
                            ['Beneficiary Type', getVal(scheme, 'beneficiary_type')],
                            ['Income Req', getVal(scheme, 'income_requirement')],
                            [t('compare.row.land') || 'Land Req', (() => {
                              if (scheme.min_land_acres && scheme.max_land_acres) return `${scheme.min_land_acres} - ${scheme.max_land_acres} ac`;
                              if (scheme.min_land_acres) return `Min ${scheme.min_land_acres} ac`;
                              if (scheme.max_land_acres) return `Max ${scheme.max_land_acres} ac`;
                              return na;
                            })()],
                            [t('compare.row.desc'), getVal(scheme, 'description')],
                            [t('compare.row.benefits'), getVal(scheme, 'benefits')],
                            [t('compare.row.docs'), (() => {
                              if (!Array.isArray(scheme.required_documents) || scheme.required_documents.length === 0) return na;
                              const req = scheme.required_documents;
                              const norm = req.map(d => normalizeDocument(d));
                              const ready = norm.filter(d => d && documents.includes(d.id)).length;
                              return (
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[0.8rem] font-bold text-turmeric">{ready}/{req.length} {t('docs.ready') || 'ready'}</span>
                                  <ul className="m-0 pl-4 text-[0.85rem] text-ink-dim">
                                    {req.map((d, i) => {
                                      const isReady = norm[i] && documents.includes(norm[i].id);
                                      return <li key={i} className={isReady ? 'line-through opacity-60 text-sprout' : ''}>{d}</li>;
                                    })}
                                  </ul>
                                </div>
                              );
                            })()],
                            [t('compare.row.verified'), getVal(scheme, 'last_verified')],
                          ].map(([label, val]) => (
                            <div key={label} className="flex px-4 py-2.5 gap-3">
                              <span className="text-[0.78rem] text-ink-dim font-semibold w-28 shrink-0">{label}</span>
                              <span className="text-[0.85rem] text-ink flex-1">{val}</span>
                            </div>
                          ))}
                          {scheme.application_link && (
                            <div className="px-4 py-3">
                              <a href={scheme.application_link} target="_blank" rel="noopener noreferrer"
                                className="text-sky underline font-semibold text-[0.88rem]">{t('card.btn.apply')}</a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
