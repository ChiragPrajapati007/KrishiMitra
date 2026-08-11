import { useState } from 'react';
import { translations } from './i18n/translations';
import Topbar from './components/layout/Topbar';
import Footer from './components/layout/Footer';
import Landing from './pages/Landing';
import ProfileWizard from './pages/ProfileWizard';
import ProfileSettings from './pages/ProfileSettings';
import Results from './pages/Results';
import Explorer from './pages/Explorer';
import Saved from './pages/Saved';
import SchemeDetails from './pages/SchemeDetails';
import MyDocuments from './pages/MyDocuments';
import { useSavedSchemes } from './hooks/useSavedSchemes';

function App() {
  const [lang, setLang] = useState('en');
  const t = (key) => translations[lang][key] || key;

  const [currentScreen, setCurrentScreen] = useState('landing'); // 'landing', 'wizard', 'settings', 'results', 'explorer', 'saved', 'mydocuments'
  const [recommendationData, setRecommendationData] = useState(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState(null);
  const [compareList, setCompareList] = useState([]);

  const { savedSchemes, saveScheme, removeScheme, isSaved } = useSavedSchemes();

  const handleRecommendSuccess = (data) => {
    setRecommendationData(data);
    setCurrentScreen('results');
    setCompareList([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditProfile = () => setCurrentScreen('settings');
  const handleStartWizard = () => setCurrentScreen('wizard');
  const handleCancelSettings = () => setCurrentScreen('results');

  const openSchemeDetails = (id) => setSelectedSchemeId(id);
  const closeSchemeDetails = () => setSelectedSchemeId(null);

  const toggleCompare = (scheme) => {
    setCompareList(prev => {
      const exists = prev.find(s => s.id === scheme.id);
      if (exists) return prev.filter(s => s.id !== scheme.id);
      if (prev.length >= 3) return prev;
      return [...prev, scheme];
    });
  };

  const handleSave = (scheme, action) => {
    if (action === 'save') saveScheme(scheme);
    else removeScheme(scheme.id);
  };

  // The farmer profile from the last recommendation — passed to SchemeDetails
  // so the eligibility endpoint can be called with context.
  const farmerProfile = recommendationData?.profile || null;

  return (
    <>
      <Topbar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        lang={lang}
        setLang={setLang}
        savedCount={savedSchemes.length}
        hasProfile={!!recommendationData}
        t={t}
      />

      <main>
        {currentScreen === 'landing' && (
          <Landing onStartWizard={handleStartWizard} t={t} />
        )}

        {currentScreen === 'wizard' && (
          <ProfileWizard onRecommendSuccess={handleRecommendSuccess} t={t} />
        )}

        {currentScreen === 'settings' && recommendationData && (
          <ProfileSettings
            initialProfile={recommendationData.profile}
            onSave={async (updatedProfile) => {
              // Trigger re-recommendation with new profile
              try {
                const { recommendSchemes } = await import('./api');
                const data = await recommendSchemes(updatedProfile);
                handleRecommendSuccess({ ...data, submittedProfile: updatedProfile });
              } catch (err) {
                alert('Failed to update profile: ' + err.message);
              }
            }}
            onCancel={handleCancelSettings}
            t={t}
          />
        )}

        {currentScreen === 'results' && recommendationData && (
          <Results
            data={recommendationData}
            onEditProfile={handleEditProfile}
            onViewDetails={openSchemeDetails}
            compareList={compareList}
            onToggleCompare={toggleCompare}
            setCompareList={setCompareList}
            onSave={handleSave}
            isSaved={isSaved}
            t={t}
          />
        )}

        {currentScreen === 'explorer' && (
          <Explorer
            onViewDetails={openSchemeDetails}
            onToggleCompare={toggleCompare}
            compareList={compareList}
            onSave={handleSave}
            isSaved={isSaved}
            t={t}
          />
        )}

        {currentScreen === 'mydocuments' && (
          <MyDocuments t={t} />
        )}

        {currentScreen === 'saved' && (
          <Saved
            savedSchemes={savedSchemes}
            onViewDetails={openSchemeDetails}
            onToggleCompare={toggleCompare}
            compareList={compareList}
            onSave={handleSave}
            isSaved={isSaved}
            t={t}
          />
        )}
      </main>

      {/* Scheme Details Modal */}
      {selectedSchemeId && (
        <SchemeDetails
          schemeId={selectedSchemeId}
          farmerProfile={farmerProfile}
          relevanceContext={recommendationData?.results?.find(s => s.id === selectedSchemeId) ? {
            ...recommendationData.results.find(s => s.id === selectedSchemeId),
            rank: recommendationData.results.findIndex(s => s.id === selectedSchemeId) + 1
          } : null}
          onClose={closeSchemeDetails}
          onSave={handleSave}
          isSaved={isSaved(selectedSchemeId)}
          onToggleCompare={toggleCompare}
          isCompared={compareList.some(s => s.id === selectedSchemeId)}
          t={t}
        />
      )}

      <Footer />
    </>
  );
}

export default App;
