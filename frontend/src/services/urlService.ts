import { apiClient } from '../api/client';

export interface UrlItem {
  code: string;
  long_url: string;
  created_at: string;
  visits: number;
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
};
