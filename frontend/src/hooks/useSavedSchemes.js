import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'krishimitra_saved_schemes';

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(schemes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes));
  } catch {
    // localStorage might be unavailable (private browsing quota)
    console.warn('KrishiMitra: Could not write to localStorage');
  }
}

/**
 * Hook for persisting saved schemes in localStorage.
 * Returns:
 *   savedSchemes — array of saved scheme objects
 *   saveScheme(scheme) — add a scheme
 *   removeScheme(id) — remove by id
 *   isSaved(id) — boolean check
 *   clearAll() — remove all
 */
export function useSavedSchemes() {
  const [savedSchemes, setSavedSchemes] = useState(readStorage);

  // Keep localStorage in sync whenever savedSchemes changes
  useEffect(() => {
    writeStorage(savedSchemes);
  }, [savedSchemes]);

  const saveScheme = useCallback((scheme) => {
    setSavedSchemes(prev => {
      if (prev.some(s => s.id === scheme.id)) return prev;
      return [...prev, scheme];
    });
  }, []);

  const removeScheme = useCallback((id) => {
    setSavedSchemes(prev => prev.filter(s => s.id !== id));
  }, []);

  const isSaved = useCallback((id) => {
    return savedSchemes.some(s => s.id === id);
  }, [savedSchemes]);

  const clearAll = useCallback(() => {
    setSavedSchemes([]);
  }, []);

  return { savedSchemes, saveScheme, removeScheme, isSaved, clearAll };
}
