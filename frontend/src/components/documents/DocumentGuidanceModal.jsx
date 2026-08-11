export default function DocumentGuidanceModal({ document, onClose, t }) {
  if (!document) return null;

  return (
    <div 
      className="fixed inset-0 z-[110] bg-[rgba(15,42,34,0.88)] backdrop-blur-[4px] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadein"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-paper text-ink w-full sm:max-w-[500px] max-h-[92vh] overflow-y-auto rounded-t-[20px] sm:rounded-card shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        
        <div className="sticky top-0 bg-paper/95 backdrop-blur-[4px] flex items-center justify-between px-6 sm:px-8 py-4 border-b border-line-paper z-10">
          <h2 className="font-display text-[1.2rem] font-semibold m-0">{document.name}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[rgba(27,46,39,0.1)] border-none text-ink font-bold cursor-pointer flex items-center justify-center hover:bg-[rgba(27,46,39,0.2)]"
          >
            ✕
          </button>
        </div>

        <div className="p-6 sm:p-8 flex flex-col gap-5">
          <div>
            <h3 className="text-[0.8rem] uppercase tracking-[0.5px] font-bold text-ink-dim mb-1">
              {t('docs.modal.how') || 'How to obtain this document'}
            </h3>
            <p className="m-0 text-[0.95rem] leading-[1.5]">
              {document.guidance || (t('docs.modal.no_guidance') || 'Guidance is not available in the current verified dataset.')}
            </p>
            {!document.guidance && (
              <p className="m-0 text-[0.95rem] leading-[1.5] mt-2 italic">
                {t('docs.modal.check_official') || 'Check the official government source for the latest process.'}
              </p>
            )}
          </div>

          <div className="bg-[rgba(27,46,39,0.04)] border border-line-paper rounded-[12px] p-4 flex flex-col gap-3">
            <div>
              <span className="text-[0.75rem] uppercase tracking-[0.5px] font-bold text-ink-dim block mb-0.5">
                {t('docs.modal.source') || 'Official Source'}
              </span>
              <span className="text-[0.9rem] font-medium">
                {document.official_source ? (
                  <a href={`https://${document.official_source}`} target="_blank" rel="noopener noreferrer" className="text-sky underline">
                    {document.official_source}
                  </a>
                ) : (
                  t('docs.modal.not_available') || 'Not available in current dataset'
                )}
              </span>
            </div>
            <div>
              <span className="text-[0.75rem] uppercase tracking-[0.5px] font-bold text-ink-dim block mb-0.5">
                {t('docs.modal.verified') || 'Last Verified'}
              </span>
              <span className="text-[0.9rem] font-mono">
                {document.last_verified || (t('docs.modal.not_available') || 'Not available in current dataset')}
              </span>
            </div>
          </div>
          
          <div className="bg-[rgba(224,122,95,0.08)] border border-[rgba(224,122,95,0.3)] rounded-[10px] p-3 text-[0.82rem] text-ink-dim leading-[1.4]">
            <b className="text-danger font-bold">Disclaimer:</b> This information is provided for general guidance. Always verify requirements on official portals before applying.
          </div>
        </div>

      </div>
    </div>
  );
}
