export interface URL {
  id: number;
  code: string;
  long_url: string;
  user_id: number;
  created_at: string;
  visits: number;
}

export interface CreateURLRequest {
  long_url: string;
}

// Campos base compartidos entre endpoints (sin datos de sesión).
// Usado por GET /u/dashboard donde la propiedad es siempre implícita.
export interface URLPublicResponse {
  code: string;
  long_url: string;
  created_at: string;
  visits: number;
}

// Respuesta enriquecida que incluye contexto de sesión.
// Usado por GET /u y POST /u.
export interface URLResponse extends URLPublicResponse {
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

export interface DashboardResponse {
  summary: DashboardSummary;
  best_url: URLPublicResponse | null;
  urls_created_by_day: DailyCount[];
  clicks_by_day: DailyClicks[];
  period_days: number;
}
