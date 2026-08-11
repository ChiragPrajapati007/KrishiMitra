import { useState, useEffect } from 'react';
import { fetchSchemeById, fetchEligibility } from '../api';
import EligibilityBadge from '../components/dashboard/EligibilityBadge';
import { useDocuments } from '../hooks/useDocuments';
import DocumentItem from '../components/documents/DocumentItem';
import DocumentProgress from '../components/documents/DocumentProgress';
import DocumentGuidanceModal from '../components/documents/DocumentGuidanceModal';
import ScoreBadge from '../components/dashboard/ScoreBadge';
import MatchReasons from '../components/dashboard/MatchReasons';

export default function SchemeDetails({ schemeId, farmerProfile, relevanceContext, onClose, onSave, isSaved, onToggleCompare, isCompared, t }) {
  const [scheme, setScheme]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const [eligibility, setEligibility]       = useState(null);
  const [eligLoading, setEligLoading]       = useState(false);
  const [eligError, setEligError]           = useState(null);

  const { documents, toggleDocument, normalizeDocument } = useDocuments();
  const [guidanceDoc, setGuidanceDoc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchSchemeById(schemeId);
        if (!cancelled) setScheme(data);

        // Fetch eligibility if we have a farmer profile
        if (farmerProfile?.state && farmerProfile?.crop && farmerProfile?.land_size > 0) {
          setEligLoading(true);
          try {
            const elig = await fetchEligibility(schemeId, farmerProfile);
            if (!cancelled) setEligibility(elig);
          } catch (e) {
            if (!cancelled) setEligError(e.message);
          } finally {
            if (!cancelled) setEligLoading(false);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    document.body.style.overflow = 'hidden';
    return () => {
      cancelled = true;
      document.body.style.overflow = 'auto';
    };
  }, [schemeId, farmerProfile]);

  const saved = isSaved?.(schemeId);

  return (
    <div
      className="fixed inset-0 z-[100] bg-[rgba(15,42,34,0.88)] backdrop-blur-[4px] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadein"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-paper text-ink w-full sm:max-w-[840px] max-h-[92vh] overflow-y-auto rounded-t-[20px] sm:rounded-card relative shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="sticky top-0 bg-paper/95 backdrop-blur-[6px] flex items-center justify-between px-6 sm:px-8 py-4 border-b border-line-paper z-10">
          <span className="font-mono text-[0.72rem] text-ink-dim uppercase tracking-[0.8px]">
            {t('details.header')}
          </span>
          <div className="flex items-center gap-2">
            {onSave && (
              <button
                onClick={() => saved ? onSave(scheme, 'remove') : onSave(scheme, 'save')}
                className={`ghost-btn flex items-center gap-1.5 text-[0.8rem] ${saved ? 'border-turmeric text-[#9c7626] bg-[rgba(231,167,44,0.08)]' : ''}`}
                title={saved ? t('card.saved') : t('card.save')}
              >
                {saved ? '🔖' : '🔖'} {saved ? t('card.saved') : t('card.save')}
              </button>
            )}
            {onToggleCompare && scheme && (
              <button
                onClick={() => onToggleCompare(scheme)}
                className={`ghost-btn flex items-center gap-1.5 text-[0.8rem] ${isCompared ? 'border-turmeric text-[#9c7626]' : ''}`}
              >
                {isCompared ? t('card.btn.compare.added') : t('card.btn.compare.add')}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[rgba(27,46,39,0.1)] border-none text-ink font-bold cursor-pointer flex items-center justify-center hover:bg-[rgba(27,46,39,0.2)] text-[1rem]"
            >
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-[50px] text-center text-ink-dim font-bold animate-pulse">{t('details.loading')}</div>
        ) : error ? (
          <div className="p-[50px] text-center">
            <p className="text-danger font-bold m-0">{t('details.error')}</p>
            <p className="text-ink-dim text-[0.9rem] m-0 mt-1">{error}</p>
          </div>
        ) : scheme && (
          <div className="px-6 sm:px-8 py-6">
            {/* 1. Name */}
            <h2 className="font-display text-[1.8rem] font-semibold m-0 mb-3 leading-[1.2]">
              {scheme.scheme_name}
            </h2>

            {/* 2. Verification (Tags) */}
            <div className="flex gap-2 flex-wrap mb-4">
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.5px] px-3 py-1 rounded-full bg-[rgba(27,46,39,0.08)] text-ink-dim">
                {scheme.state === 'All' ? t('details.nationwide') || 'Nationwide' : scheme.state}
              </span>
              {scheme.crop && scheme.crop !== 'All' && (
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.5px] px-3 py-1 rounded-full bg-[#d9ecd1] text-[#356121]">
                  {scheme.crop}
                </span>
              )}
              {scheme.category && scheme.category !== 'All' && (
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.5px] px-3 py-1 rounded-full bg-[rgba(231,167,44,0.15)] text-[#9c7626]">
                  {scheme.category}
                </span>
              )}
              {scheme.source ? (
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.5px] px-3 py-1 rounded-full bg-[rgba(143,191,92,0.15)] text-sprout">
                  {t('details.tag.verified') || '✓ Verified'}
                </span>
              ) : (
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.5px] px-3 py-1 rounded-full bg-[rgba(224,122,95,0.1)] text-danger">
                  {t('details.tag.dev') || '⚠ Development dataset'}
                </span>
              )}
            </div>

            {/* 3. Relevance, Rank, Why relevant */}
            {relevanceContext && Number(relevanceContext.relevance_score) > 0 && (
              <div className="mb-6 bg-[rgba(231,167,44,0.05)] border border-[rgba(231,167,44,0.2)] rounded-lg p-4">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full bg-turmeric text-ink font-mono text-[0.85rem] font-bold">
                      {relevanceContext.rank}
                    </span>
                    <h3 className="font-display font-semibold text-[1.1rem] m-0 text-[#9c7626]">{t('details.match.title') || 'Recommendation Match'}</h3>
                  </div>
                  <ScoreBadge percent={relevanceContext.relevance_percent} t={t} />
                </div>
                {relevanceContext.match_reasons && relevanceContext.match_reasons.length > 0 && (
                  <div className="mt-4">
                    <MatchReasons match_reasons={relevanceContext.match_reasons} isOpen={true} t={t} />
                  </div>
                )}
              </div>
            )}

            {/* 4. Desc */}
            <p className="text-[1rem] leading-[1.6] text-[#3d4c44] m-0 mb-6 pb-6 border-b border-line-paper">
              {scheme.description || t('compare.na.dataset') || 'Not available in current dataset'}
            </p>

            {/* 5. Benefits & 6. Target */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-line-paper">
              <div>
                <h3 className="font-display text-[1.15rem] font-semibold mb-3 mt-0 text-ink">
                  {t('details.benefits.title') || 'Key Benefits'}
                </h3>
                <p className="text-[0.92rem] leading-[1.6] text-[#3d4c44] m-0 whitespace-pre-wrap">
                  {scheme.benefits || t('compare.na.dataset') || 'Not available in current dataset'}
                </p>
              </div>
              <div>
                <h3 className="font-display text-[1.15rem] font-semibold mb-3 mt-0 text-ink">
                  {t('details.target.title') || 'Beneficiary Target'}
                </h3>
                <p className="text-[0.92rem] leading-[1.6] text-[#3d4c44] m-0 whitespace-pre-wrap">
                  {scheme.beneficiary_type || t('compare.na.dataset') || 'Not available in current dataset'}
                </p>
              </div>
            </div>

            {/* 7. Eligibility Breakdown & 8. How to become eligible */}
            {farmerProfile && (
              <div className="mb-6 pb-6 border-b border-line-paper">
                <h3 className="font-display text-[1.15rem] font-semibold mb-1 mt-0 text-ink">
                  {t('eligibility.title')}
                </h3>
                <p className="text-[0.82rem] text-ink-dim m-0 mb-3">
                  {t('eligibility.subtitle')}
                </p>
                <EligibilityBadge
                  assessment={eligibility}
                  loading={eligLoading}
                  error={eligError}
                  t={t}
                />
              </div>
            )}

            {/* 9. Required Docs & 10. Readiness */}
            <div className="mb-6 pb-6 border-b border-line-paper">
              <h3 className="font-display text-[1.15rem] font-semibold mb-3 mt-0 text-ink">
                {t('details.docs.title')}
              </h3>
              
              <div className="bg-[rgba(27,46,39,0.02)] rounded-[12px] p-4 border border-line-paper">
                {Array.isArray(scheme.required_documents) && scheme.required_documents.length > 0 ? (
                  <>
                    {(() => {
                      const normalizedDocs = scheme.required_documents.map(docName => {
                        const normalized = normalizeDocument(docName);
                        return {
                          originalName: docName,
                          normalized
                        };
                      });
                      
                      const requiredCount = normalizedDocs.length;
                      const readyCount = normalizedDocs.filter(d => d.normalized && documents.includes(d.normalized.id)).length;

                      return (
                        <>
                          <DocumentProgress readyCount={readyCount} totalCount={requiredCount} t={t} />
                          <div className="flex flex-col border border-line rounded-[8px] overflow-hidden bg-bg">
                            {normalizedDocs.map((doc, idx) => {
                              const isAvailable = doc.normalized ? documents.includes(doc.normalized.id) : false;
                              return (
                                <DocumentItem
                                  key={idx}
                                  name={doc.normalized ? doc.normalized.name : doc.originalName}
                                  isAvailable={isAvailable}
                                  onToggle={() => {
                                    if (doc.normalized) toggleDocument(doc.normalized.id);
                                  }}
                                  onShowGuidance={() => setGuidanceDoc(doc.normalized)}
                                  hasGuidance={!!doc.normalized}
                                  t={t}
                                />
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <p className="text-ink-dim italic text-[0.88rem] m-0">{t('compare.na.dataset')}</p>
                )}
              </div>
            </div>

            {/* 11. Apply */}
            <div className="mb-6 pb-6 border-b border-line-paper">
              <h3 className="font-display text-[1.15rem] font-semibold mb-3 mt-0 text-ink">
                {t('details.apply.title') || 'How to apply'}
              </h3>
              {scheme.application_link ? (
                <div className="flex flex-col gap-2 items-start">
                  <p className="text-[0.92rem] text-[#3d4c44] m-0">{t('details.apply.desc') || 'You can apply for this scheme through the official portal:'}</p>
                  <a
                    href={scheme.application_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-turmeric text-ink border-none px-5 py-2.5 rounded-lg text-[0.9rem] font-bold cursor-pointer no-underline inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    {t('card.btn.apply')}
                  </a>
                </div>
              ) : (
                <p className="text-ink-dim italic text-[0.88rem] m-0">{t('compare.na.dataset') || 'Not available in current dataset'}</p>
              )}
            </div>

            {/* 12. Source, 13. Verified, 14. Disclaimer */}
            <div className="bg-[rgba(27,46,39,0.04)] rounded-[12px] p-5 flex flex-wrap justify-between items-center gap-4">
              <div className="flex gap-6 flex-wrap">
                <div>
                  <div className="text-[0.72rem] uppercase tracking-[0.6px] text-ink-dim font-bold mb-1">{t('details.source')}</div>
                  <div className="text-[0.85rem] font-semibold text-ink max-w-[300px] leading-[1.4]">{scheme.source || t('compare.na.dataset')}</div>
                </div>
                <div>
                  <div className="text-[0.72rem] uppercase tracking-[0.6px] text-ink-dim font-bold mb-1">{t('details.verified')}</div>
                  <div className="text-[0.85rem] font-semibold text-ink">{scheme.last_verified || t('compare.na.dataset')}</div>
                </div>
              </div>
              <p className="text-[0.74rem] text-ink-dim mt-4 m-0 leading-[1.4] border-t border-[rgba(27,46,39,0.1)] pt-4 w-full">
                {t('details.docs.disclaimer') || 'This information is indicative. Always verify requirements on the official portal.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <DocumentGuidanceModal 
        document={guidanceDoc} 
        onClose={() => setGuidanceDoc(null)} 
        t={t} 
      />
    </div>
  );
}
