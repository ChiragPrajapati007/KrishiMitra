// KrishiMitra AI — frontend API client
// Uses native browser fetch() — no Axios dependency.

const API_BASE = '';

export const fetchSchemes = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_BASE}/api/schemes?${query}` : `${API_BASE}/api/schemes`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch schemes');
  // Returns { count, schemes }
  return response.json();
};

export const fetchSchemeById = async (id) => {
  const response = await fetch(`${API_BASE}/api/schemes/${id}`);
  if (!response.ok) throw new Error('Scheme not found');
  return response.json();
};

export const fetchEligibility = async (schemeId, profile) => {
  const params = new URLSearchParams({
    state: profile.state,
    crop: profile.crop,
    land_size: String(profile.land_size),
  });
  const response = await fetch(`${API_BASE}/api/schemes/${schemeId}/eligibility?${params}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch eligibility assessment');
  }
  return response.json();
};

export const recommendSchemes = async (profile) => {
  const response = await fetch(`${API_BASE}/api/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch recommendations');
  }
  return response.json();
};
