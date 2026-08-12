import { useState, useEffect } from 'react';
import documentsData from '../data/documents.json';

export function useDocuments() {
  const [documents, setDocuments] = useState(() => {
    try {
      const stored = localStorage.getItem('krishimitra_documents');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse documents from local storage', e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('krishimitra_documents', JSON.stringify(documents));
  }, [documents]);

  const hasDocument = (id) => documents.includes(id);

  const addDocument = (id) => {
    if (!documents.includes(id)) {
      setDocuments(prev => [...prev, id]);
    }
  };

  const removeDocument = (id) => {
    setDocuments(prev => prev.filter(d => d !== id));
  };

  const toggleDocument = (id) => {
    setDocuments(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const clearDocuments = () => {
    setDocuments([]);
  };

  // Helper to map a raw required_document string from DB to a normalized document
  const normalizeDocument = (rawName) => {
    if (!rawName) return null;
    const lowerName = rawName.toLowerCase().trim();
    for (const doc of documentsData) {
      if (doc.aliases.includes(lowerName)) {
        return doc;
      }
    }
    return null; // Unknown/unmapped
  };

  return {
    documents,
    hasDocument,
    addDocument,
    removeDocument,
    toggleDocument,
    clearDocuments,
    normalizeDocument,
    allNormalizedDocs: documentsData
  };
}
