export default function Topbar({ currentScreen, onNavigate, lang, setLang, savedCount, hasProfile, t }) {
  const navBtn = (screen) =>
    `pill-btn ${currentScreen === screen ? 'active' : ''}`;

  return (
    <header className="sticky top-0 z-50 bg-[rgba(15,42,34,0.88)] backdrop-blur-[10px] border-b border-line">
      <div className="flex items-center justify-between py-[14px] px-6 max-w-[1180px] mx-auto flex-wrap gap-4">

        {/* Logo */}
        <div
          className="flex items-center gap-2.5 font-display font-semibold text-xl tracking-[0.2px] cursor-pointer"
          onClick={() => onNavigate(hasProfile ? 'results' : 'landing')}
        >
          <span className="text-[1.4rem]">🌾</span>
          <div>
            {t('app.title')} <em className="text-turmeric not-italic">AI</em>
            <small className="block font-body font-medium text-[0.62rem] tracking-[1.5px] uppercase text-sprout -mt-0.5">
              {t('app.subtitle')}
            </small>
          </div>
        </div>

        {/* Nav */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language toggle */}
          <div className="flex border border-line rounded-full overflow-hidden mr-1">
            <button
              onClick={() => setLang('en')}
              className={`${lang === 'en' ? 'bg-turmeric text-ink font-bold' : 'bg-transparent text-text-dim'} border-none py-1.5 px-3 text-[0.78rem] cursor-pointer transition-colors`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('hi')}
              className={`${lang === 'hi' ? 'bg-turmeric text-ink font-bold' : 'bg-transparent text-text-dim'} border-none py-1.5 px-3 text-[0.78rem] cursor-pointer transition-colors`}
            >
              हिं
            </button>
          </div>

          {hasProfile && (
            <>
              {currentScreen === 'results' && (
                <button className="pill-btn active" onClick={() => onNavigate('results')}>
                  {t('nav.dashboard')}
                </button>
              )}

              <button className={navBtn('explorer')} onClick={() => onNavigate('explorer')}>
                {t('nav.explorer')}
              </button>

              <button className={navBtn('mydocuments')} onClick={() => onNavigate('mydocuments')}>
                {t('nav.mydocuments') || 'My Documents'}
              </button>

              <button className={navBtn('saved')} onClick={() => onNavigate('saved')}>
                {t('nav.saved')}
                {savedCount > 0 && (
                  <span className="ml-1.5 bg-turmeric text-ink font-mono font-bold text-[0.65rem] px-[6px] py-[1px] rounded-full">
                    {savedCount}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
