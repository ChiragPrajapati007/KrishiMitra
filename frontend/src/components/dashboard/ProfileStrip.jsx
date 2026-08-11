export default function ProfileStrip({ profile, onEdit, t }) {
  const { state, district, crop, land_size, interests } = profile;
  
  return (
    <div className="flex flex-wrap items-center gap-2.5 bg-bg2 border border-line rounded-full py-2.5 px-5 mb-[26px]">
      <span className="font-mono text-[0.76rem] text-text-dim px-2.5 py-1 bg-bg3 rounded-full">
        {t('profile.state')}: <span className="text-text font-bold">{state || 'N/A'}</span>
      </span>
      {district && (
        <span className="font-mono text-[0.76rem] text-text-dim px-2.5 py-1 bg-bg3 rounded-full">
          {t('profile.dist')}: <span className="text-text font-bold">{district}</span>
        </span>
      )}
      <span className="font-mono text-[0.76rem] text-text-dim px-2.5 py-1 bg-bg3 rounded-full">
        {t('profile.crop')}: <span className="text-text font-bold">{crop || 'N/A'}</span>
      </span>
      <span className="font-mono text-[0.76rem] text-text-dim px-2.5 py-1 bg-bg3 rounded-full">
        {t('profile.land')}: <span className="text-text font-bold">{land_size} ac</span>
      </span>
      {interests && interests.length > 0 && (
        <span className="font-mono text-[0.76rem] text-text-dim px-2.5 py-1 bg-bg3 rounded-full">
          {t('profile.needs')}: <span className="text-text font-bold">{interests.length}</span>
        </span>
      )}
      <span className="font-mono text-[0.76rem] text-text-dim px-2.5 py-1 bg-bg3 rounded-full">
        {t('profile.income') || 'Annual Income'}: <span className="text-text font-bold">{profile.annual_income ? `₹${profile.annual_income.toLocaleString()}` : (t('profile.income.not_provided') || 'Not provided')}</span>
      </span>
      
      <button 
        onClick={onEdit} 
        className="ml-auto bg-transparent border-none text-turmeric text-[0.82rem] font-semibold cursor-pointer hover:underline"
      >
        {t('profile.edit')}
      </button>
    </div>
  );
}
