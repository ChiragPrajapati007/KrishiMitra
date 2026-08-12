import { useState } from 'react';
import Chip from '../components/ui/Chip';
import Button from '../components/ui/Button';

import locations from '../data/locations.json';
import cropsData from '../data/crops.json';
import documentsData from '../data/documents.json';
import { computeFarmerCategory } from '../utils/farmerCategory';

const AVAILABLE_STATES = Object.keys(locations).sort((a, b) => a.localeCompare(b));
const AVAILABLE_CROPS = cropsData.sort((a, b) => a.localeCompare(b));

const SUPPORT_INTERESTS = [
  { id: 'irrigation',        icon: '💧', label: 'Irrigation Support' },
  { id: 'insurance',         icon: '🛡️', label: 'Crop Insurance' },
  { id: 'credit',            icon: '💰', label: 'Credit & Loans' },
  { id: 'equipment',         icon: '🚜', label: 'Farm Equipment' },
  { id: 'seeds',             icon: '🌱', label: 'Seeds & Fertilizers' },
  { id: 'marketing',         icon: '📈', label: 'Market Access' },
  { id: 'food_processing',   icon: '🏭', label: 'Food Processing' },
  { id: 'women_empowerment', icon: '👩🏽‍🌾', label: 'Women Farmer Support' },
];

const inputClass = "bg-bg3 border border-line text-text p-[12px_14px] rounded-[9px] text-[0.95rem] font-body focus:border-sprout focus:outline-none w-full";
const selectClass = inputClass + " appearance-none";

export default function ProfileSettings({ initialProfile, onSave, onCancel, t }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState({
    state: initialProfile?.state || '',
    district: initialProfile?.district || '',
    crop: initialProfile?.crop || '',
    current_season: initialProfile?.current_season || '',
    land_size: initialProfile?.land_size !== null && initialProfile?.land_size !== undefined ? initialProfile.land_size : '',
    annual_income: initialProfile?.annual_income !== null && initialProfile?.annual_income !== undefined ? initialProfile.annual_income : '',
    gender: initialProfile?.gender || 'Male',
    age: initialProfile?.age || '',
    disability_status: initialProfile?.disability_status || 'no',
    interests: initialProfile?.interests || [],
    documents_on_hand: initialProfile?.documents_on_hand || []
  });

  const farmerCategory = computeFarmerCategory(profile.land_size);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'state') {
      setProfile(prev => ({ ...prev, [name]: value, district: '' }));
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

  const toggleDocument = (id) => {
    setProfile(prev => {
      const exists = prev.documents_on_hand.includes(id);
      return {
        ...prev,
        documents_on_hand: exists
          ? prev.documents_on_hand.filter(d => d !== id)
          : [...prev.documents_on_hand, id]
      };
    });
  };

  const validate = () => {
    if (!profile.state) return 'Please select a state.';
    if (!profile.crop)  return 'Please select a crop.';
    if (!profile.current_season) return 'Please select the current season.';
    
    const val = parseFloat(profile.land_size);
    if (profile.land_size === '' || profile.land_size === null)
      return 'Land size is required. Enter 0 if you do not own agricultural land.';
    if (isNaN(val) || val < 0)
      return 'Land size must be 0 or a positive number. Enter 0 if you do not own agricultural land.';
    
    if (profile.annual_income !== '' && profile.annual_income !== null) {
      const income = parseFloat(profile.annual_income);
      if (isNaN(income) || income < 0) {
        return 'Annual Family Income must be a valid non-negative number.';
      }
    }
    
    if (profile.age !== '') {
      const age = parseInt(profile.age, 10);
      if (isNaN(age) || age < 16 || age > 100) {
        return 'Age must be between 16 and 100.';
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...profile,
        land_size: parseFloat(profile.land_size),
        annual_income: profile.annual_income !== '' && profile.annual_income !== null ? parseFloat(profile.annual_income) : null,
        farmer_category: farmerCategory
      };
      
      // Update local storage documents_on_hand directly so it stays in sync across app
      if (payload.documents_on_hand.length > 0) {
        localStorage.setItem('krishimitra_docs', JSON.stringify(payload.documents_on_hand));
      } else {
        localStorage.removeItem('krishimitra_docs');
      }
      
      await onSave(payload);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pt-8 pb-20">
      <div className="max-w-[760px] mx-auto px-6">
        <h1 className="font-display font-semibold text-[2rem] mb-6">{t('profile.title') || 'Edit Farmer Profile'}</h1>
        
        <div className="card">
          <div className="flex flex-col gap-10">
            
            {/* Step 1: Location & Crop */}
            <div>
              <h3 className="font-display font-semibold text-[1.2rem] mb-4 text-text">{t('wizard.title.1') || 'Location & crop'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

                <div className="flex flex-col gap-2">
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
                
                <div className="flex flex-col gap-2">
                  <label className="text-[0.8rem] font-semibold text-text-dim flex items-center gap-1.5">
                    {t('wizard.label.season') || 'Current season'} <span className="text-turmeric">*</span>
                  </label>
                  <select name="current_season" value={profile.current_season} onChange={handleChange} className={selectClass}>
                    <option value="">{t('wizard.placeholder.season') || 'Select season'}</option>
                    <option value="Kharif">{t('wizard.season.kharif') || 'Kharif (Jun–Oct)'}</option>
                    <option value="Rabi">{t('wizard.season.rabi') || 'Rabi (Oct–Mar)'}</option>
                    <option value="Zaid">{t('wizard.season.zaid') || 'Zaid (Mar–Jun)'}</option>
                    <option value="All">{t('wizard.season.all') || 'Not sure / year-round'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Land Size & Income */}
            <div>
              <h3 className="font-display font-semibold text-[1.2rem] mb-4 text-text">{t('wizard.title.2') || 'Land & income'}</h3>
              <div className="flex flex-col sm:flex-row gap-6 mb-5">
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
                    min="0"
                    step="0.01"
                    className={inputClass}
                  />
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
                </div>
              </div>
              
              <div className="w-full">
                <label className="text-[0.8rem] font-semibold text-text-dim block mb-2">
                  {t('wizard.label.category') || 'Farmer category (auto-computed)'}
                </label>
                <div className="bg-bg2 border border-line rounded-[9px] p-4 text-[0.95rem] font-medium font-mono text-sprout">
                  {farmerCategory ? `${t(`category.${farmerCategory.toLowerCase()}`) || farmerCategory} Farmer` : (t('wizard.category.empty') || '— enter land size —')}
                </div>
              </div>
            </div>
            
            {/* Step 3: About You */}
            <div>
              <h3 className="font-display font-semibold text-[1.2rem] mb-4 text-text">{t('wizard.title.3_new') || 'About you'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2 sm:col-span-2 mb-2">
                  <label className="text-[0.8rem] font-semibold text-text-dim">
                    {t('wizard.label.gender') || 'Gender'}
                  </label>
                  <div className="flex gap-6 mt-1">
                    {['Male', 'Female', 'Other'].map(g => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer text-[0.95rem]">
                        <input
                          type="radio"
                          name="gender"
                          value={g}
                          checked={profile.gender === g}
                          onChange={handleChange}
                          className="accent-sprout w-4 h-4"
                        />
                        <span>{t(`wizard.gender.${g.toLowerCase()}`) || g}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[0.8rem] font-semibold text-text-dim">
                    {t('wizard.label.age') || 'Age'}
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={profile.age}
                    onChange={handleChange}
                    placeholder="e.g. 34"
                    min="16"
                    max="100"
                    className={inputClass}
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[0.8rem] font-semibold text-text-dim">
                    {t('wizard.label.disability') || 'Disability status (optional)'}
                  </label>
                  <select name="disability_status" value={profile.disability_status} onChange={handleChange} className={selectClass}>
                    <option value="no">{t('wizard.disability.no') || 'No'}</option>
                    <option value="yes">{t('wizard.disability.yes') || 'Yes'}</option>
                    <option value="prefer-not">{t('wizard.disability.prefer_not') || 'Prefer not to say'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 4: Interests & Documents */}
            <div>
              <h3 className="font-display font-semibold text-[1.2rem] mb-4 text-text">{t('wizard.title.4') || 'Interests & documents on hand'}</h3>
              
              <div className="mb-8">
                <label className="text-[0.8rem] font-semibold text-text-dim block mb-3">
                  {t('wizard.label.interest') || 'What kind of support are you looking for? (pick any)'}
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {SUPPORT_INTERESTS.map(interest => {
                    const isSelected = profile.interests.includes(interest.id);
                    return (
                      <Chip
                        key={interest.id}
                        selected={isSelected}
                        onClick={() => toggleInterest(interest.id)}
                      >
                        <span className="text-[1.1rem] leading-none">{interest.icon}</span>
                        <span>{t(`wizard.interest.${interest.id}`) || interest.label}</span>
                      </Chip>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="text-[0.8rem] font-semibold text-text-dim block mb-3">
                  {t('wizard.label.docs') || 'Documents you already have'}
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {documentsData.map(doc => {
                    const isSelected = profile.documents_on_hand.includes(doc.id);
                    return (
                      <Chip
                        key={doc.id}
                        selected={isSelected}
                        onClick={() => toggleDocument(doc.id)}
                      >
                        <span className="text-[1.1rem] leading-none text-text-dim">{isSelected ? '✓' : '+'}</span>
                        <span>{doc.name}</span>
                      </Chip>
                    );
                  })}
                </div>
              </div>
            </div>
            
          </div>

          {error && (
            <div className="mt-6 text-[0.88rem] text-[#e55039] bg-[rgba(229,80,57,0.1)] p-3 rounded-md border border-[rgba(229,80,57,0.2)]">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 mt-10 pt-6 border-t border-line">
            <Button variant="secondary" onClick={onCancel}>
              {t('profile.btn.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} className="ml-auto min-w-[140px]" disabled={loading}>
              {loading ? t('profile.btn.saving') || 'Saving...' : t('profile.btn.save') || 'Save Changes'}
            </Button>
          </div>

        </div>
      </div>
    </section>
  );
}
