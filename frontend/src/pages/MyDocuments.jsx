import { useDocuments } from '../hooks/useDocuments';

export default function MyDocuments({ t }) {
  const { documents, toggleDocument, allNormalizedDocs } = useDocuments();

  const availableCount = allNormalizedDocs.filter(doc => documents.includes(doc.id)).length;
  const totalCount = allNormalizedDocs.length;
  const progressPercent = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;

  return (
    <section className="animate-fadein pt-9 pb-20">
      <div className="wrap max-w-[800px]">
        <h2 className="font-display font-semibold text-[1.6rem] m-0 mb-2">
          {t('documents.my_documents.title') || 'My Documents'}
        </h2>
        <p className="text-text-dim text-[0.95rem] m-0 mb-8 max-w-[60ch]">
          {t('documents.my_documents.desc') || 'Keep track of documents you already have. Your document status is stored locally on this device.'}
        </p>

        <div className="bg-bg2 border border-line rounded-card p-6 mb-8">
          <div className="flex justify-between items-end mb-3">
            <h3 className="m-0 font-semibold text-[1.1rem]">
              {t('documents.readiness') || 'Document Readiness'}
            </h3>
            <span className="font-mono text-[0.85rem] font-bold text-turmeric">
              {availableCount} / {totalCount} {t('documents.available') || 'available'}
            </span>
          </div>
          
          <div className="h-2.5 bg-[rgba(27,46,39,0.1)] rounded-full overflow-hidden w-full relative">
            <div 
              className="absolute top-0 left-0 bottom-0 bg-turmeric transition-all duration-500 ease-out" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {allNormalizedDocs.map(doc => {
            const isAvailable = documents.includes(doc.id);
            return (
              <label 
                key={doc.id} 
                className={`flex items-center gap-4 p-4 rounded-[12px] border cursor-pointer transition-colors ${
                  isAvailable 
                    ? 'bg-[rgba(102,161,130,0.08)] border-[rgba(102,161,130,0.3)]' 
                    : 'bg-bg2 border-line hover:border-text-dim'
                }`}
              >
                <input 
                  type="checkbox" 
                  checked={isAvailable}
                  onChange={() => toggleDocument(doc.id)}
                  className="w-5 h-5 accent-sprout cursor-pointer shrink-0"
                />
                <div className="flex flex-col flex-1">
                  <span className="font-semibold text-[1.05rem] text-text">
                    {doc.name}
                  </span>
                  <span className={`text-[0.82rem] font-bold mt-1 ${isAvailable ? 'text-sprout' : 'text-text-dim'}`}>
                    {isAvailable 
                      ? (t('documents.status.available') || 'Available')
                      : (t('documents.status.missing') || 'Missing')
                    }
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
