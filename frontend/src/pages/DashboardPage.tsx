import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../auth/AuthContext';
import type { BestUrl, DailyClicks, DailyCount, UrlItem } from '../services/urlService';

const BACKEND_URL = 'http://localhost:3000';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatChartDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]}`;
}

function truncate(str: string, max = 48): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`stat-card${accent ? ' stat-card-accent' : ''}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}

// ── Best URL card ────────────────────────────────────────────────────────────

function BestUrlCard({ url }: { url: BestUrl | null }) {
  if (!url) {
    return (
      <div className="best-url-card best-url-empty">
        <p className="best-url-empty-icon">🔗</p>
        <p className="best-url-empty-text">Aún no tienes URLs con visitas</p>
      </div>
    );
  }

  const shortUrl = `${BACKEND_URL}/u/${url.code}`;

  return (
    <div className="best-url-card">
      <div className="best-url-top">
        <span className="best-url-trophy">🏆 Mejor URL</span>
        <span className="best-url-visits-badge">{url.visits} visitas</span>
      </div>
      <a
        className="best-url-short"
        href={shortUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {shortUrl}
      </a>
      <p className="best-url-original" title={url.long_url}>
        {truncate(url.long_url)}
      </p>
    </div>
  );
}

// ── Chart wrapper ─────────────────────────────────────────────────────────────

function ChartCard({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      {empty ? (
        <div className="chart-empty">Sin actividad en los últimos 30 días</div>
      ) : (
        <div className="chart-body">{children}</div>
      )}
    </div>
  );
}

// ── Clicks chart ──────────────────────────────────────────────────────────────

function ClicksChart({ data }: { data: DailyClicks[] }) {
  const formatted = [...data].reverse().map((d) => ({
    ...d,
    label: formatChartDate(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={formatted} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}
          labelStyle={{ fontWeight: 600 }}
          formatter={(v) => [v, 'Clicks']}
        />
        <Area type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={2} fill="url(#clicksGradient)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── URLs by day chart ─────────────────────────────────────────────────────────

function UrlsCreatedChart({ data }: { data: DailyCount[] }) {
  const formatted = [...data].reverse().map((d) => ({
    ...d,
    label: formatChartDate(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}
          labelStyle={{ fontWeight: 600 }}
          formatter={(v) => [v, 'URLs creadas']}
          cursor={{ fill: '#f1f5f9' }}
        />
        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── My URLs table ─────────────────────────────────────────────────────────────

function MyUrlsTable({ urls }: { urls: UrlItem[] }) {
  if (urls.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-icon">🔗</p>
        <p className="empty-text">Todavía no has acortado ninguna URL.</p>
        <p className="empty-hint">Ve a la página principal para crear tu primera URL.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="url-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>URL original</th>
            <th>Creada</th>
            <th>Visitas</th>
          </tr>
        </thead>
        <tbody>
          {urls.map((url) => (
            <tr key={url.code}>
              <td>
                <a
                  className="url-code"
                  href={`${BACKEND_URL}/u/${url.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  {url.code}
                </a>
              </td>
              <td>
                <a
                  href={url.long_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="url-long"
                  title={url.long_url}
                >
                  {truncate(url.long_url)}
                </a>
              </td>
              <td className="url-date">{formatDate(url.created_at)}</td>
              <td className="url-visits">{url.visits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth();
  const { data, myUrls, loading, error } = useDashboard();

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="state-msg">Cargando dashboard…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard-page">
        <div className="error-banner" role="alert">
          <span>⚠</span> {error ?? 'No se pudo cargar el dashboard'}
        </div>
      </div>
    );
  }

  const { summary, best_url, urls_created_by_day, clicks_by_day, period_days } = data;

  return (
    <div className="dashboard-page">

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Hola, <strong>{user?.name}</strong> — últimos {period_days} días
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-grid">
        <StatCard label="URLs acortadas" value={summary.total_urls} />
        <StatCard label="Total de clicks" value={summary.total_clicks} accent />
        <StatCard label="Promedio clicks / URL" value={summary.avg_clicks_per_url} />
      </div>

      {/* Best URL */}
      <BestUrlCard url={best_url} />

      {/* Charts */}
      <div className="charts-grid">
        <ChartCard title="Clicks por día" empty={clicks_by_day.length === 0}>
          <ClicksChart data={clicks_by_day} />
        </ChartCard>

        <ChartCard title="URLs creadas por día" empty={urls_created_by_day.length === 0}>
          <UrlsCreatedChart data={urls_created_by_day} />
        </ChartCard>
      </div>

      {/* My URLs */}
      <section className="my-urls-section">
        <h2 className="section-title">Mis URLs ({myUrls.length})</h2>
        <MyUrlsTable urls={myUrls} />
      </section>

    </div>
  );
}
