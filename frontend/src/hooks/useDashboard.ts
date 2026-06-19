import { useState, useEffect } from 'react';
import { urlService, type DashboardData, type UrlItem } from '../services/urlService';
import { getApiErrorMessage } from '../utils/apiError';

export interface DashboardState {
  data: DashboardData | null;
  myUrls: UrlItem[];
  loading: boolean;
  error: string | null;
}

export function useDashboard(): DashboardState {
  const [data, setData] = useState<DashboardData | null>(null);
  const [myUrls, setMyUrls] = useState<UrlItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ambas peticiones en paralelo: stats del dashboard + lista filtrada por propiedad
    Promise.all([urlService.getDashboard(), urlService.list()])
      .then(([dashboard, allUrls]) => {
        setData(dashboard);
        setMyUrls(allUrls.filter((u) => u.is_owner));
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return { data, myUrls, loading, error };
}
