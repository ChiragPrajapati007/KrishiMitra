import ProfileStrip from '../components/dashboard/ProfileStrip';
import SchemeCard from '../components/dashboard/SchemeCard';
import ComparePanel from '../components/dashboard/ComparePanel';
import ActionPlan from '../components/dashboard/ActionPlan';

export default function Results({ data, onEditProfile, onViewDetails, compareList, onToggleCompare, setCompareList, onSave, isSaved, t }) {
  const profile = data?.submittedProfile || data?.profile || {};
  const allSchemes = data?.results || [];
  
  const topMatches = allSchemes.filter(s => Number(s.relevance_score) > 0).slice(0, 5);
  const otherRelevant = allSchemes.filter(s => Number(s.relevance_score) > 0).slice(5);
  const notRelevant = allSchemes.filter(s => Number(s.relevance_score) === 0);

  return (
    <>
      <section className="animate-fadein pt-9 pb-10">
        <div className="wrap">
          <ProfileStrip profile={profile} onEdit={onEditProfile} t={t} />
          
          <div className="mb-8 p-4 bg-bg2 border border-line rounded-card">
            <details className="group cursor-pointer">
              <summary className="font-semibold text-text text-[0.95rem] flex items-center justify-between outline-none">
                {t('results.explain.title')}
                <span className="text-text-dim transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="mt-3 text-[0.88rem] text-text-dim leading-[1.5]">
                <p className="m-0 mb-2">{t('results.explain.desc')}</p>
                <p className="m-0 italic text-[0.82rem] border-t border-line pt-2">Note: District and Annual Income are collected for your informational profile summary but are not currently used to filter scheme eligibility.</p>
              </div>
            </details>
          </div>

          <div className="flex gap-1.5 border-b border-line mb-7 flex-wrap">
            <button className="bg-transparent border-none text-turmeric px-[18px] py-[12px] text-[0.92rem] font-bold cursor-pointer border-b-2 border-turmeric -mb-[1px]">
              {t('results.tab.recommendations')}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
            <div>
              <h2 className="font-display text-[1.3rem] font-semibold m-0 mt-2 mb-3.5 flex items-center gap-2.5">
                {t('results.title')}
                <span className="font-mono text-[0.75rem] text-ink bg-sprout px-[9px] py-[2px] rounded-full">
                  {topMatches.length}
                </span>
              </h2>
              <p className="text-text-dim text-[0.87rem] mt-[-6px] mb-[18px] max-w-[70ch]">
                {t('results.desc') || 'The most relevant schemes based on your profile keywords.'}
              </p>

              {topMatches.length > 0 ? (
                <div className="flex flex-col">
                  {topMatches.map((scheme, idx) => {
                    const isCompared = compareList.some(s => s.id === scheme.id);
                    return (
                      <SchemeCard
                        key={scheme.id}
                        scheme={scheme}
                        rank={idx + 1}
                        onViewDetails={onViewDetails}
                        onToggleCompare={onToggleCompare}
                        isCompared={isCompared}
                        onSave={onSave}
                        isSaved={isSaved?.(scheme.id)}
                        t={t}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-[70px] px-5 text-text-dim bg-bg2 rounded-card border border-line">
                  <div className="text-[2.4rem] mb-3.5">🌱</div>
                  <p className="m-0 text-[1.1rem] font-semibold text-text">{t('results.empty.title') || 'No strongly relevant schemes were found for this profile.'}</p>
                  <p className="m-0 text-[0.92rem] mt-2">
                    {t('results.empty.desc') || 'Try changing your crop, interests, or profile details, or explore all schemes in Scheme Explorer.'}
                  </p>
                  <button className="mt-4 text-turmeric bg-transparent border border-turmeric rounded-lg px-4 py-2 cursor-pointer font-semibold hover:bg-[rgba(231,167,44,0.1)] transition-colors" onClick={onEditProfile}>
                    {t('results.empty.cta') || 'Adjust Profile'}
                  </button>
                </div>
              )}

              {/* Other Relevant Schemes */}
              {otherRelevant.length > 0 && (
                <div className="mt-10">
                  <h3 className="font-display text-[1.1rem] font-semibold m-0 mb-3.5 flex items-center gap-2.5 text-text-dim">
                    {t('results.other.title') || 'Other Relevant Schemes'}
                    <span className="font-mono text-[0.7rem] text-ink bg-[#e2e8e4] px-[8px] py-[2px] rounded-full">
                      {otherRelevant.length}
                    </span>
                  </h3>
                  <div className="flex flex-col">
                    {otherRelevant.map((scheme, idx) => {
                      const isCompared = compareList.some(s => s.id === scheme.id);
                      return (
                        <SchemeCard
                          key={scheme.id}
                          scheme={scheme}
                          rank={idx + topMatches.length + 1}
                          onViewDetails={onViewDetails}
                          onToggleCompare={onToggleCompare}
                          isCompared={isCompared}
                          onSave={onSave}
                          isSaved={isSaved?.(scheme.id)}
                          t={t}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Not Currently Relevant Schemes */}
              {notRelevant.length > 0 && (
                <div className="mt-10 opacity-70">
                  <details className="group">
                    <summary className="font-display text-[1.05rem] font-semibold m-0 flex items-center justify-between cursor-pointer outline-none text-text-dim p-4 bg-bg2 rounded-lg border border-line">
                      <span className="flex items-center gap-2.5">
                        {t('results.not_relevant.title') || 'Not Currently Relevant'}
                        <span className="font-mono text-[0.7rem] bg-[rgba(27,46,39,0.1)] px-[8px] py-[2px] rounded-full">
                          {notRelevant.length}
                        </span>
                      </span>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="mt-3 flex flex-col gap-2 p-2">
                      <p className="text-[0.82rem] m-0 mb-2 italic">
                        {t('results.not_relevant.desc') || 'These schemes do not match your current profile keywords. You can still explore them.'}
                      </p>
                      {notRelevant.map((scheme, idx) => {
                        const isCompared = compareList.some(s => s.id === scheme.id);
                        return (
                          <SchemeCard
                            key={scheme.id}
                            scheme={scheme}
                            rank={null}
                            onViewDetails={onViewDetails}
                            onToggleCompare={onToggleCompare}
                            isCompared={isCompared}
                            onSave={onSave}
                            isSaved={isSaved?.(scheme.id)}
                            showRelevance={false}
                            t={t}
                          />
                        );
                      })}
                    </div>
                  </details>
                </div>
              )}

            </div>

            {/* Suggested Next Steps Panel -> Action Plan */}
            <div className="hidden lg:block">
              {topMatches.length > 0 && (
                <ActionPlan topScheme={topMatches[0]} onViewDetails={onViewDetails} t={t} />
              )}
            </div>
          </div>

          <div className="lg:hidden mt-[40px] p-4 bg-[rgba(224,122,95,0.08)] border border-[rgba(224,122,95,0.3)] rounded-[10px] text-[0.82rem] text-text-dim leading-[1.5]">
            <b className="text-danger font-bold">Disclaimer:</b> {t('results.disclaimer')}
          </div>
        </div>
      </section>

      <ComparePanel
        compareList={compareList}
        onClear={() => setCompareList([])}
        onRemove={onToggleCompare}
        t={t}
      />
    </>
  );
}
