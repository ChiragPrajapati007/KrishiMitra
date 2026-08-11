import { useState, useEffect, useMemo } from 'react';
import { fetchSchemes } from '../api';
import SchemeCard from '../components/dashboard/SchemeCard';

export default function Explorer({ onViewDetails, onToggleCompare, compareList, onSave, isSaved, t }) {
  const [allSchemes, setAllSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCrop, setFilterCrop] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('');

  // Load all schemes once — filtering/search done client-side from this list
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSchemes();
        // fetchSchemes returns { count, schemes } — use data.schemes
        setAllSchemes(data.schemes || []);
      } catch (err) {
        setError(err.message || 'Failed to load schemes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Derive unique states and crops from loaded data (not hardcoded)
  const availableStates = useMemo(() => {
    const states = new Set(allSchemes.map(s => s.state).filter(Boolean));
    return ['', ...Array.from(states).sort()];
  }, [allSchemes]);

  const availableCrops = useMemo(() => {
    const crops = new Set();
    allSchemes.forEach(s => {
      if (s.crop && s.crop !== 'All') {
        // crop can be CSV, e.g. "Cotton, Wheat, Rice..."
        s.crop.split(',').forEach(c => {
          const trimmed = c.trim();
          if (trimmed) crops.add(trimmed);
        });
      }
    });
    return ['', ...Array.from(crops).sort()];
  }, [allSchemes]);

  const availableCategories = useMemo(() => {
    const cats = new Set();
    allSchemes.forEach(s => {
      if (s.category && s.category !== 'All') {
        s.category.split(',').forEach(c => {
          const trimmed = c.trim();
          if (trimmed) cats.add(trimmed);
        });
      }
    });
    return ['', ...Array.from(cats).sort()];
  }, [allSchemes]);

  // Client-side search + filter — no hardcoded lists, uses real API data
  const displayedSchemes = useMemo(() => {
    let schemes = allSchemes;

    if (filterState) {
      schemes = schemes.filter(s =>
        s.state === 'All' || (s.state || '').toLowerCase() === filterState.toLowerCase()
      );
    }

    if (filterCrop) {
      schemes = schemes.filter(s => {
        if (!s.crop || s.crop === 'All') return true;
        return s.crop.toLowerCase().includes(filterCrop.toLowerCase());
      });
    }

    if (filterCategory) {
      schemes = schemes.filter(s => {
        if (!s.category || s.category.toLowerCase() === 'all') return true;
        return s.category.toLowerCase().includes(filterCategory.toLowerCase());
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      schemes = schemes.filter(s =>
        (s.scheme_name || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.benefits || '').toLowerCase().includes(q) ||
        (s.state || '').toLowerCase().includes(q) ||
        (s.crop || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'az') {
      schemes = [...schemes].sort((a, b) => a.scheme_name.localeCompare(b.scheme_name));
    } else if (sortBy === 'za') {
      schemes = [...schemes].sort((a, b) => b.scheme_name.localeCompare(a.scheme_name));
    } else if (sortBy === 'recent') {
      schemes = [...schemes].sort((a, b) => {
        if (!a.last_verified) return 1;
        if (!b.last_verified) return -1;
        return new Date(b.last_verified) - new Date(a.last_verified);
      });
    }

    return schemes;
  }, [allSchemes, filterState, filterCrop, filterCategory, searchQuery, sortBy]);

  const handleReset = () => {
    setSearchQuery('');
    setFilterState('');
    setFilterCrop('');
    setFilterCategory('');
    setSortBy('');
  };

  const selectClass = "bg-bg3 border border-line text-text p-[10px_14px] rounded-[9px] text-[0.92rem] font-body focus:border-sprout focus:outline-none appearance-none w-full";

  return (
    <section className="animate-fadein pt-9 pb-24">
      <div className="wrap">
        <div className="mb-8">
          <h1 className="font-display text-[2rem] font-semibold m-0 mb-2">
            {t('explorer.title')}
          </h1>
          <p className="text-text-dim text-[1rem] m-0 max-w-[70ch]">
            {t('explorer.desc')}
          </p>
          {!loading && !error && (
            <p className="text-[0.74rem] font-mono text-turmeric mt-1.5 m-0">
              ● {t('explorer.dev.notice')} · {allSchemes.length} {t('explorer.dev.count')}
            </p>
          )}
        </div>

        {/* Search + Filters */}
        <div className="bg-bg2 border border-line p-5 rounded-card mb-8 flex flex-col gap-4">
          {/* Search bar */}
          <div className="flex flex-col gap-2">
            <label className="text-[0.75rem] uppercase font-semibold text-text-dim tracking-[0.5px]">
              {t('explorer.search.label')}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim text-[0.9rem]">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('explorer.search.placeholder')}
                className="bg-bg3 border border-line text-text pl-9 pr-4 py-[10px] rounded-[9px] text-[0.92rem] font-body focus:border-sprout focus:outline-none w-full"
              />
            </div>
          </div>

          {/* State + Crop + Category + Sort filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[0.75rem] uppercase font-semibold text-text-dim tracking-[0.5px]">
                {t('explorer.filter.state')}
              </label>
              <select
                value={filterState}
                onChange={e => setFilterState(e.target.value)}
                className={selectClass}
              >
                <option value="">{t('explorer.filter.any.state') || 'Any State'}</option>
                {availableStates.filter(s => s).map(st => (
                  <option key={st} value={st}>{st === 'All' ? t('details.nationwide') : st}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.75rem] uppercase font-semibold text-text-dim tracking-[0.5px]">
                {t('explorer.filter.crop')}
              </label>
              <select
                value={filterCrop}
                onChange={e => setFilterCrop(e.target.value)}
                className={selectClass}
              >
                <option value="">{t('explorer.filter.any.crop') || 'Any Crop'}</option>
                {availableCrops.filter(c => c).map(cr => (
                  <option key={cr} value={cr}>{cr}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.75rem] uppercase font-semibold text-text-dim tracking-[0.5px]">
                {t('explorer.filter.category')}
              </label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className={selectClass}
              >
                <option value="">Any</option>
                {availableCategories.filter(c => c).map(cr => (
                  <option key={cr} value={cr}>{cr}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.75rem] uppercase font-semibold text-text-dim tracking-[0.5px]">
                {t('explorer.sort.label')}
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className={selectClass}
              >
                <option value="">{t('explorer.sort.default')}</option>
                <option value="az">{t('explorer.sort.az')}</option>
                <option value="za">{t('explorer.sort.za')}</option>
                <option value="recent">{t('explorer.sort.recent')}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-text-dim text-[0.83rem]">
              {!loading && !error && (
                <>{t('explorer.count')?.replace('{{count}}', displayedSchemes.length).replace('{{total}}', allSchemes.length) || `Showing ${displayedSchemes.length} of ${allSchemes.length} schemes`}</>
              )}
            </span>
            <button
              onClick={handleReset}
              className="bg-transparent border border-line text-text-dim px-4 py-2 rounded-lg text-[0.85rem] font-semibold cursor-pointer hover:border-text-dim hover:text-text transition-colors"
            >
              {t('explorer.btn.reset')}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-24 text-text-dim">
            <div className="text-[2rem] mb-3 animate-pulse">🌾</div>
            <p className="m-0">{t('explorer.loading')}</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-16 px-5 bg-[rgba(224,122,95,0.08)] border border-[rgba(224,122,95,0.3)] rounded-card">
            <p className="text-danger font-bold m-0 mb-2">{t('explorer.error.title')}</p>
            <p className="text-text-dim text-[0.9rem] m-0">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-turmeric underline bg-transparent border-none cursor-pointer text-[0.88rem]"
            >
              {t('explorer.error.retry')}
            </button>
          </div>
        )}

        {/* Results grid */}
        {!loading && !error && (
          <>
            {displayedSchemes.length === 0 ? (
              <div className="text-center py-16 px-5 text-text-dim bg-bg2 rounded-card border border-line">
                <div className="text-[2.4rem] mb-3">🌱</div>
                <p className="m-0 text-[1.1rem] font-semibold text-text">{t('explorer.empty') || 'No schemes match your filters.'}</p>
                <button
                  onClick={handleReset}
                  className="mt-4 text-turmeric bg-transparent border border-turmeric rounded-lg px-4 py-2 cursor-pointer font-semibold hover:bg-[rgba(231,167,44,0.1)] transition-colors"
                >
                  {t('explorer.btn.reset')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {displayedSchemes.map(scheme => (
                  <SchemeCard
                    key={scheme.id}
                    scheme={scheme}
                    onViewDetails={onViewDetails}
                    onToggleCompare={onToggleCompare}
                    isCompared={compareList?.some(s => s.id === scheme.id)}
                    onSave={onSave}
                    isSaved={isSaved?.(scheme.id)}
                    showRelevance={false}
                    t={t}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
