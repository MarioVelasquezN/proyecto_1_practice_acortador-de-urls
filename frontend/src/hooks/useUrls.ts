import { useState, useEffect, useCallback } from 'react';
import { urlService, type UrlItem } from '../services/urlService';
import { getApiErrorMessage } from '../utils/apiError';

export function useUrls() {
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    urlService
      .list()
      .then(setUrls)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const addUrl = useCallback((url: UrlItem) => {
    setUrls((prev) => [url, ...prev]);
  }, []);

  // Optimistic delete: remove immediately, rollback if API fails.
  const removeUrl = useCallback(async (code: string) => {
    let snapshot: UrlItem[] = [];
    setUrls((prev) => {
      snapshot = prev;
      return prev.filter((u) => u.code !== code);
    });
    try {
      await urlService.remove(code);
    } catch (err) {
      setUrls(snapshot);
      throw err;
    }
  }, []);

  return { urls, loading, error, addUrl, removeUrl };
}
