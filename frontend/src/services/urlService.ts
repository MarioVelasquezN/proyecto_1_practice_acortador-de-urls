import { apiClient } from '../api/client';

export interface UrlItem {
  code: string;
  long_url: string;
  created_at: string;
  visits: number;
  is_owner: boolean;
}

export interface DashboardSummary {
  total_urls: number;
  total_clicks: number;
  avg_clicks_per_url: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface DailyClicks {
  date: string;
  clicks: number;
}

export interface BestUrl {
  code: string;
  long_url: string;
  created_at: string;
  visits: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  best_url: BestUrl | null;
  urls_created_by_day: DailyCount[];
  clicks_by_day: DailyClicks[];
  period_days: number;
}

export const urlService = {
  async list(): Promise<UrlItem[]> {
    const { data } = await apiClient.get<UrlItem[]>('/u');
    return data;
  },

  async create(long_url: string): Promise<UrlItem> {
    const { data } = await apiClient.post<UrlItem>('/u', { long_url });
    return data;
  },

  async remove(code: string): Promise<void> {
    await apiClient.delete(`/u/${code}`);
  },

  async getDashboard(): Promise<DashboardData> {
    const { data } = await apiClient.get<DashboardData>('/u/dashboard');
    return data;
  },
};
