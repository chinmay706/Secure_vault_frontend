import { useState, useCallback, useEffect } from 'react';

const SEARCH_HISTORY_KEY = 'sv.search.history';
const MAX_HISTORY = 10;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  tags?: string[];
}

const getStoredHistory = (): SearchHistoryItem[] => {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return [];
};

const saveHistory = (items: SearchHistoryItem[]) => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
};

export const useSearchHistory = () => {
  const [history, setHistory] = useState<SearchHistoryItem[]>(getStoredHistory);

  // Sync from storage on mount
  useEffect(() => {
    setHistory(getStoredHistory());
  }, []);

  const addToHistory = useCallback((query: string, tags?: string[]) => {
    if (!query.trim()) return;

    setHistory(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(
        item => item.query.toLowerCase() !== query.toLowerCase()
      );

      const newItem: SearchHistoryItem = {
        query: query.trim(),
        timestamp: Date.now(),
        tags,
      };

      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setHistory(prev => {
      const updated = prev.filter(
        item => item.query.toLowerCase() !== query.toLowerCase()
      );
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
};
