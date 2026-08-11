/**
 * EligibilityBadge — displays the eligibility assessment from eligibility_service.py.
 *
 * IMPORTANT: TF-IDF relevance ≠ eligibility assessment.
 * This component only renders the result of the separate eligibility endpoint.
 * It never shows a numeric percentage or converts relevance into eligibility.
 */

const STATUS_CONFIG = {
  likely_eligible: {
    icon: '✓',
    key: 'eligibility.status.likely',
    bgClass: 'bg-[rgba(143,191,92,0.12)] border-[rgba(143,191,92,0.35)]',
    textClass: 'text-sprout',
    iconClass: 'text-sprout',
  },
  not_currently_eligible: {
    icon: '✕',
    key: 'eligibility.status.not',
    bgClass: 'bg-[rgba(224,122,95,0.1)] border-[rgba(224,122,95,0.35)]',
    textClass: 'text-danger',
    iconClass: 'text-danger',
  },
  cannot_determine: {
    icon: '?',
    key: 'eligibility.status.unknown',
    bgClass: 'bg-[rgba(95,168,199,0.1)] border-[rgba(95,168,199,0.3)]',
    textClass: 'text-sky',
    iconClass: 'text-sky',
  },
};

const REQ_STATUS_CONFIG = {
  met:            { icon: '✓', cls: 'text-sprout' },
  not_met:        { icon: '✕', cls: 'text-danger' },
  unknown:        { icon: '?', cls: 'text-sky' },
  not_applicable: { icon: '–', cls: 'text-text-dim' },
};

export default function EligibilityBadge({ assessment, loading, error, t }) {
  if (loading) {
    return (
      <div className="mt-6 p-4 rounded-[10px] border border-line text-text-dim text-[0.85rem] animate-pulse">
        {t('eligibility.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 p-4 rounded-[10px] border border-[rgba(224,122,95,0.3)] bg-[rgba(224,122,95,0.06)] text-[0.85rem] text-text-dim">
        <b className="text-danger">{t('eligibility.error.title')}: </b>{error}
      </div>
    );
  }

  if (!assessment) return null;

  const config = STATUS_CONFIG[assessment.status] || STATUS_CONFIG.cannot_determine;

  return (
    <div className="mt-6">
      {/* Overall status badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border font-bold text-[0.85rem] mb-4 ${config.bgClass}`}>
        <span className={`text-[1rem] ${config.iconClass}`}>{config.icon}</span>
        <span className={config.textClass}>{t(config.key)}</span>
      </div>

      {/* Per-requirement checks */}
      <div className="flex flex-col gap-2.5">
        {assessment.checks.map((check, idx) => {
          const req = REQ_STATUS_CONFIG[check.status] || REQ_STATUS_CONFIG.unknown;
          return (
            <div key={idx} className="bg-[rgba(27,46,39,0.04)] rounded-[10px] p-3.5">
              <div className="flex items-start gap-2.5">
                <span className={`shrink-0 font-bold text-[1rem] mt-0.5 ${req.cls}`}>{req.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[0.88rem] text-ink">{check.requirement}</span>
                    <span className={`text-[0.7rem] font-mono uppercase tracking-wide ${req.cls}`}>
                      {t(`eligibility.req.${check.status}`)}
                    </span>
                  </div>
                  <p className="text-[0.82rem] text-ink-dim m-0 mt-0.5 leading-[1.4]">{check.detail}</p>
                  {check.what_you_can_do && (
                    <p className="text-[0.78rem] text-ink-dim m-0 mt-1.5 leading-[1.4] italic border-l-2 border-line-paper pl-2">
                      {t('eligibility.next')}: {check.what_you_can_do}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer — always shown */}
      <p className="text-[0.72rem] text-ink-dim mt-4 m-0 leading-[1.5] italic">
        ⚠ {assessment.disclaimer || t('eligibility.disclaimer')}
      </p>
    </div>
  );
}
