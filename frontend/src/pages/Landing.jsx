import Button from '../components/ui/Button';

export default function Landing({ onStartWizard, t }) {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden pt-[76px] pb-[60px] max-w-[1180px] mx-auto px-6 max-sm:pt-[56px] max-sm:pb-[40px]">
        <div className="inline-flex items-center gap-2 font-mono text-[0.72rem] tracking-[1.5px] uppercase text-turmeric border border-[rgba(231,167,44,0.35)] py-1.5 px-3 rounded-full bg-[rgba(231,167,44,0.06)] mb-[26px]">
          ● {t('landing.tag')}
        </div>

        <h1 className="font-display font-semibold text-[clamp(2.4rem,5.2vw,4.1rem)] leading-[1.04] max-w-[15ch] tracking-[-0.01em] m-0 mb-[22px]">
          {t('landing.headline')}
        </h1>

        <p className="text-[1.14rem] leading-[1.6] text-text-dim max-w-[52ch] m-0 mb-[34px]">
          {t('landing.sub')}
        </p>

        <div className="flex gap-[14px] flex-wrap items-center">
          <Button onClick={onStartWizard}>{t('landing.cta.start')}</Button>
          <Button variant="secondary" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
            {t('landing.cta.how')}
          </Button>
        </div>

        <div className="flex gap-[38px] mt-[56px] flex-wrap">
          {[1, 2, 3].map(n => (
            <div key={n}>
              <b className="block font-display text-[1.9rem] font-semibold text-turmeric">{t(`landing.stats.${n}.num`)}</b>
              <span className="text-[0.78rem] text-text-dim uppercase tracking-[0.8px]">{t(`landing.stats.${n}.label`)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <div id="how-it-works" className="max-w-[1180px] mx-auto px-6 py-5 pb-[90px]">
        <h2 className="font-display text-[1.8rem] mb-2 font-semibold">{t('how.title')}</h2>
        <p className="text-text-dim max-w-[70ch] mb-[34px]">{t('how.sub')}</p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5">
          {[
            { tag: t('how.1.tag'), color: 'text-sprout', title: t('how.1.title'), desc: t('how.1.desc') },
            { tag: t('how.2.tag'), color: 'text-turmeric', title: t('how.2.title'), desc: t('how.2.desc') },
            { tag: t('how.3.tag'), color: 'text-sky', title: t('how.3.title'), desc: t('how.3.desc') },
          ].map((card, i) => (
            <div key={i} className="card !p-6">
              <div className={`font-mono text-[0.78rem] mb-2.5 ${card.color}`}>{card.tag}</div>
              <h3 className="font-display m-0 mb-2 text-[1.15rem]">{card.title}</h3>
              <p className="text-text-dim text-[0.88rem] m-0">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
