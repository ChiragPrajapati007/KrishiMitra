import { useState, useEffect } from 'react';
import { useDocuments } from '../../hooks/useDocuments';

export default function ActionPlan({ topScheme, onViewDetails, t }) {
  if (!topScheme) return null;

  // Local storage persistence per scheme
  const storageKey = `krishimitra_action_plan_${topScheme.id}`;
  
  const [checkedSteps, setCheckedSteps] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checkedSteps));
    } catch (e) {
      // Ignore
    }
  }, [checkedSteps, storageKey]);

  const toggleStep = (stepId) => {
    setCheckedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const reasons = topScheme.match_reasons || [];
  const docs = topScheme.required_documents || [];
  
  const { documents, normalizeDocument } = useDocuments();
  let docSummary = null;

  if (docs.length > 0) {
    const normalizedDocs = docs.map(d => normalizeDocument(d));
    const readyCount = normalizedDocs.filter(d => d && documents.includes(d.id)).length;
    docSummary = { readyCount, totalCount: docs.length };
  }

  return (
    <div className="sticky top-[100px] bg-bg2 border border-line rounded-card p-6">
      <h3 className="font-display text-[1.15rem] font-semibold text-text mb-4 m-0">
        {t('actionplan.title')}
      </h3>
      <div className="flex flex-col gap-5">
        
        {/* Step 1: Review */}
        <div className="flex gap-3">
           <input type="checkbox" checked={!!checkedSteps.step1} onChange={() => toggleStep('step1')} className="mt-1 w-4 h-4 cursor-pointer accent-turmeric" />
           <div>
             <h4 className="text-[0.92rem] font-bold m-0 text-text">1. {t('actionplan.step1.title')}</h4>
             <p className="text-[0.82rem] text-text-dim m-0 mt-1 leading-[1.4]">
               {t('actionplan.step1.desc').replace('{{name}}', topScheme.scheme_name)}
             </p>
           </div>
        </div>

        {/* Step 2: Why recommended */}
        <div className="flex gap-3">
           <input type="checkbox" checked={!!checkedSteps.step2} onChange={() => toggleStep('step2')} className="mt-1 w-4 h-4 cursor-pointer accent-turmeric" />
           <div>
             <h4 className="text-[0.92rem] font-bold m-0 text-text">2. {t('actionplan.step2.title')}</h4>
             <div className="text-[0.82rem] text-text-dim m-0 mt-1 leading-[1.4]">
               {reasons.length > 0 ? (
                 <ul className="m-0 pl-4 list-disc text-ink-dim">
                   {reasons.map((r, i) => <li key={i}>{r}</li>)}
                 </ul>
               ) : (
                 <p className="m-0">{t('actionplan.step2.noreasons')}</p>
               )}
             </div>
           </div>
        </div>

        {/* Step 3: Check requirements */}
        <div className="flex gap-3">
           <input type="checkbox" checked={!!checkedSteps.step3} onChange={() => toggleStep('step3')} className="mt-1 w-4 h-4 cursor-pointer accent-turmeric" />
           <div>
             <h4 className="text-[0.92rem] font-bold m-0 text-text">3. {t('actionplan.step3.title')}</h4>
             <p className="text-[0.82rem] text-text-dim m-0 mt-1 leading-[1.4]">
               {t('actionplan.step3.desc')}
             </p>
             {onViewDetails && (
               <button onClick={() => onViewDetails(topScheme.id)} className="mt-2 text-[0.75rem] font-bold uppercase tracking-wider text-turmeric bg-transparent border border-turmeric rounded px-3 py-1 cursor-pointer hover:bg-[rgba(224,122,95,0.1)]">
                 {t('actionplan.step3.btn')}
               </button>
             )}
           </div>
        </div>

        {/* Step 4: Documents */}
        <div className="flex gap-3">
           <input type="checkbox" checked={!!checkedSteps.step4} onChange={() => toggleStep('step4')} className="mt-1 w-4 h-4 cursor-pointer accent-turmeric" />
           <div>
             <h4 className="text-[0.92rem] font-bold m-0 text-text">4. {t('actionplan.step4.title')}</h4>
             <div className="text-[0.82rem] text-text-dim m-0 mt-1 leading-[1.4]">
               {docs.length > 0 ? (
                 <>
                   <p className="m-0 mb-1">{docSummary?.readyCount} / {docSummary?.totalCount} documents available.</p>
                   <ul className="m-0 pl-4 list-disc text-ink-dim">
                     {docs.map((d, i) => {
                        const nDoc = normalizeDocument(d);
                        const isReady = nDoc && documents.includes(nDoc.id);
                        return (
                          <li key={i} className={isReady ? 'line-through opacity-60 text-sprout' : ''}>
                            {d}
                          </li>
                        );
                     })}
                   </ul>
                 </>
               ) : (
                 <p className="m-0 italic">{t('actionplan.step4.nodocs')}</p>
               )}
             </div>
           </div>
        </div>

        {/* Step 5: Apply/Verify */}
        <div className="flex gap-3">
           <input type="checkbox" checked={!!checkedSteps.step5} onChange={() => toggleStep('step5')} className="mt-1 w-4 h-4 cursor-pointer accent-turmeric" />
           <div>
             <h4 className="text-[0.92rem] font-bold m-0 text-text">5. {t('actionplan.step5.title')}</h4>
             <div className="text-[0.82rem] text-text-dim m-0 mt-1 leading-[1.4]">
               {topScheme.application_link ? (
                 <a href={topScheme.application_link} target="_blank" rel="noreferrer" className="inline-block mt-1 text-[0.75rem] font-bold uppercase tracking-wider bg-sprout text-ink rounded px-3 py-1.5 no-underline hover:opacity-90">
                   {t('actionplan.step5.btn')}
                 </a>
               ) : (
                 <p className="m-0 italic">
                   {t('actionplan.step5.nolink')}
                 </p>
               )}
             </div>
           </div>
        </div>

      </div>

      <div className="mt-6 pt-5 border-t border-dashed border-line-paper text-[0.75rem] text-danger font-semibold leading-[1.4]">
        {t('results.disclaimer')}
      </div>
    </div>
  );
}
