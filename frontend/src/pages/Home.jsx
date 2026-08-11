import { useState, useRef } from 'react';
import Stepper from '../components/wizard/Stepper';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import { recommendSchemes } from '../api';

const SUPPORT_INTERESTS = [
  { id: 'irrigation',        label: 'Irrigation Support' },
  { id: 'insurance',         label: 'Crop Insurance' },
  { id: 'credit',            label: 'Credit & Loans' },
  { id: 'equipment',         label: 'Farm Equipment' },
  { id: 'seeds',             label: 'Seeds & Fertilizers' },
  { id: 'marketing',         label: 'Market Access' },
  { id: 'food_processing',   label: 'Food Processing' },
  { id: 'women_empowerment', label: 'Women Farmer Support' },
];

import locations from '../data/locations.json';
import cropsData from '../data/crops.json';

const AVAILABLE_STATES = Object.keys(locations).sort((a, b) => a.localeCompare(b));
const AVAILABLE_CROPS = cropsData.sort((a, b) => a.localeCompare(b));

const inputClass = "bg-bg3 border border-line text-text p-[12px_14px] rounded-[9px] text-[0.95rem] font-body focus:border-sprout focus:outline-none w-full";
const selectClass = inputClass + " appearance-none";

export default function Home({ onRecommendSuccess, t }) {
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState({
    state: '',
    district: '',
    crop: '',
    land_size: '',
    annual_income: '',
    interests: []
  });

  const wizardRef = useRef(null);

  const startWizard = () => {
    setShowWizard(true);
    setTimeout(() => {
      wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'state') {
      setProfile(prev => ({ ...prev, [name]: value, district: '' })); // Reset district on state change
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  const getAvailableDistricts = () => {
    if (!profile.state || !locations[profile.state]) return [];
    return [...locations[profile.state]].sort((a, b) => a.localeCompare(b));
  };

  const toggleInterest = (id) => {
    setProfile(prev => {
      const exists = prev.interests.includes(id);
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter(i => i !== id)
          : [...prev.interests, id]
      };
    });
  };

  const validateStep = () => {
    if (step === 1) {
      if (!profile.state) return 'Please select a state.';
      if (!profile.crop)  return 'Please select a crop.';
    }
    if (step === 2) {
      const val = parseFloat(profile.land_size);
      if (profile.land_size === '' || profile.land_size === null)
        return 'Land size is required.';
      if (isNaN(val) || val <= 0)
        return 'Land size must be a number greater than 0 acres. If you have any land, enter the actual size. If you have no land, this tool covers schemes for landholding farmers.';
      
      if (profile.annual_income !== '' && profile.annual_income !== null) {
        const income = parseFloat(profile.annual_income);
        if (isNaN(income) || income < 0) {
          return 'Annual Family Income must be a valid non-negative number.';
        }
      }
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    
    // Normalize empty strings to null for optional fields before proceeding
    if (step === 2 && profile.annual_income === '') {
      setProfile(p => ({ ...p, annual_income: null }));
    }
    
    setError(null);
    setStep(s => Math.min(s + 1, 3));
  };

  const prevStep = () => {
    setError(null);
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...profile,
        land_size: parseFloat(profile.land_size)
      };
      const data = await recommendSchemes(payload);
      onRecommendSuccess({ ...data, submittedProfile: payload });
    } catch (err) {
      setError(err.message || 'Failed to fetch recommendations. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

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
          <Button onClick={startWizard}>{t('landing.cta.start')}</Button>
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

      {/* Wizard */}
      {showWizard && (
        <section className="bg-bg2/30 border-t border-line mt-10 pb-20" ref={wizardRef}>
          <div className="max-w-[760px] mx-auto px-6 pt-[50px]">
            <Stepper currentStep={step} totalSteps={3} t={t} />

            <div className="card">

              {/* Step 1 — Location & Crop */}
              {step === 1 && (
                <div className="animate-fadein">
                  <h2 className="font-display font-semibold text-[1.55rem] m-0 mb-1">{t('wizard.title.1')}</h2>
                  <p className="text-text-dim m-0 mb-7 text-[0.95rem]">{t('wizard.desc.1')}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* State */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[0.8rem] font-semibold text-text-dim flex items-center gap-1.5">
                        {t('wizard.label.state')} <span className="text-turmeric">*</span>
                      </label>
                      <select name="state" value={profile.state} onChange={handleChange} className={selectClass}>
                        <option value="">{t('wizard.placeholder.state')}</option>
                        {AVAILABLE_STATES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* District — text input, not a dependent select (no authoritative dataset) */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[0.8rem] font-semibold text-text-dim">
                        {t('wizard.label.district')}
                        <span className="text-[0.72rem] text-text-dim ml-1 font-normal">({t('wizard.district.note')})</span>
                      </label>
                      <select name="district" value={profile.district} onChange={handleChange} className={selectClass} disabled={!profile.state}>
                        <option value="">{t('wizard.placeholder.district')}</option>
                        {getAvailableDistricts().map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Crop */}
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <label className="text-[0.8rem] font-semibold text-text-dim flex items-center gap-1.5">
                        {t('wizard.label.crop')} <span className="text-turmeric">*</span>
                      </label>
                      <select name="crop" value={profile.crop} onChange={handleChange} className={selectClass}>
                        <option value="">{t('wizard.placeholder.crop')}</option>
                        {AVAILABLE_CROPS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 — Land Size */}
              {step === 2 && (
                <div className="animate-fadein">
                  <h2 className="font-display font-semibold text-[1.55rem] m-0 mb-1">{t('wizard.title.2')}</h2>
                  <p className="text-text-dim m-0 mb-7 text-[0.95rem]">{t('wizard.desc.2')}</p>

                  <div className="flex flex-col sm:flex-row gap-6 max-w-2xl">
                    <div className="flex-1">
                      <label className="text-[0.8rem] font-semibold text-text-dim block mb-2">
                        {t('wizard.label.land')} <span className="text-turmeric">*</span>
                      </label>
                      <input
                        type="number"
                        name="land_size"
                        value={profile.land_size}
                        onChange={handleChange}
                        placeholder="e.g. 1.8"
                        min="0.01"
                        step="0.01"
                        className={inputClass}
                      />
                      <p className="text-[0.78rem] text-text-dim mt-2 m-0">
                        {t('wizard.land.hint')}
                      </p>
                    </div>

                    <div className="flex-1">
                      <label className="text-[0.8rem] font-semibold text-text-dim block mb-2">
                        {t('wizard.label.income')} <span className="font-normal opacity-70">(Optional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim font-bold">₹</span>
                        <input
                          type="number"
                          name="annual_income"
                          value={profile.annual_income ?? ''}
                          onChange={handleChange}
                          placeholder={t('wizard.placeholder.income') || 'e.g. 240000'}
                          min="0"
                          step="1000"
                          className={`${inputClass} pl-8`}
                        />
                      </div>
                      <p className="text-[0.78rem] text-text-dim mt-2 m-0">
                        {t('wizard.income.hint') || 'Stored securely on your device.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 — Interests */}
              {step === 3 && (
                <div className="animate-fadein">
                  <h2 className="font-display font-semibold text-[1.55rem] m-0 mb-1">{t('wizard.title.3')}</h2>
                  <p className="text-text-dim m-0 mb-7 text-[0.95rem]">{t('wizard.desc.3')}</p>

                  <div className="flex flex-wrap gap-[9px]">
                    {SUPPORT_INTERESTS.map(interest => (
                      <Chip
                        key={interest.id}
                        label={interest.label}
                        selected={profile.interests.includes(interest.id)}
                        onClick={() => toggleInterest(interest.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-6 p-4 bg-[rgba(224,122,95,0.08)] border border-[rgba(224,122,95,0.3)] rounded-[10px] text-[0.85rem] text-text-dim leading-[1.5]">
                  <b className="text-danger block mb-0.5">{t('wizard.error.label')}</b>
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-[30px] pt-[20px] border-t border-line">
                {step > 1
                  ? <Button variant="secondary" onClick={prevStep}>{t('wizard.btn.back')}</Button>
                  : <div />
                }
                {step < 3
                  ? <Button onClick={nextStep}>{t('wizard.btn.next')}</Button>
                  : <Button onClick={handleSubmit} disabled={loading}>
                      {loading ? t('wizard.btn.loading') : t('wizard.btn.submit')}
                    </Button>
                }
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
