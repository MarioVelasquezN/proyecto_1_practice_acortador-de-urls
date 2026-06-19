import { Fragment, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useUrls } from '../hooks/useUrls';
import { urlService, type UrlItem } from '../services/urlService';
import { getApiErrorMessage, getApiErrorStatus } from '../utils/apiError';

const BACKEND_URL = 'http://localhost:3000';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function truncate(str: string, max = 52): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ── Create form ────────────────────────────────────────────────────────────

function CreateUrlForm({ onCreated }: { onCreated: (url: UrlItem) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Ingresa una URL');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const newUrl = await urlService.create(trimmed);
      onCreated(newUrl);
      setValue('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-card">
      <h2 className="create-title">Acortar una URL</h2>
      <form onSubmit={handleSubmit}>
        <div className="create-input-row">
          <input
            type="text"
            className={`form-input create-input${error ? ' input-error' : ''}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://ejemplo.com/url-muy-larga-para-compartir"
            disabled={loading}
            autoFocus
          />
          <button type="submit" className="btn-primary btn-acortar" disabled={loading}>
            {loading ? '…' : 'Acortar'}
          </button>
        </div>
        {error && <span className="field-error">{error}</span>}
      </form>
    </div>
  );
}

// ── Copy button ─────────────────────────────────────────────────────────────

function CopyButton({ code, disabled }: { code: string; disabled: boolean }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(`${BACKEND_URL}/u/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      className={`btn-copy${copied ? ' copied' : ''}`}
      onClick={handleCopy}
      disabled={disabled}
      title={`${BACKEND_URL}/u/${code}`}
    >
      {copied ? '✓ Copiado' : 'Copiar'}
    </button>
  );
}

// ── URL Table ───────────────────────────────────────────────────────────────

interface UrlTableProps {
  urls: UrlItem[];
  isAuthenticated: boolean;
  deletingCodes: Set<string>;
  deleteErrors: Record<string, string>;
  onDelete: (code: string) => void;
}

function UrlTable({ urls, isAuthenticated, deletingCodes, deleteErrors, onDelete }: UrlTableProps) {
  const colSpan = isAuthenticated ? 5 : 4;

  return (
    <div className="table-wrapper">
      <table className="url-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>URL original</th>
            <th>Creada</th>
            <th>Visitas</th>
            {isAuthenticated && <th className="th-actions">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {urls.map((url) => {
            const isDeleting = deletingCodes.has(url.code);
            const deleteError = deleteErrors[url.code];

            return (
              <Fragment key={url.code}>
                <tr className={isDeleting ? 'row-deleting' : ''}>
                  <td>
                    <span className="url-code">{url.code}</span>
                  </td>
                  <td>
                    <a
                      href={url.long_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={url.long_url}
                      className="url-long"
                    >
                      {truncate(url.long_url)}
                    </a>
                  </td>
                  <td className="url-date">{formatDate(url.created_at)}</td>
                  <td className="url-visits">{url.visits}</td>
                  {isAuthenticated && (
                    <td className="action-cell">
                      <CopyButton code={url.code} disabled={isDeleting} />
                      <button
                        className="btn-delete"
                        onClick={() => onDelete(url.code)}
                        disabled={isDeleting}
                        title="Eliminar URL"
                      >
                        {isDeleting ? '…' : 'Eliminar'}
                      </button>
                    </td>
                  )}
                </tr>

                {deleteError && (
                  <tr className="error-row">
                    <td colSpan={colSpan} className="error-row-cell">
                      ⚠ {deleteError}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Home page ───────────────────────────────────────────────────────────────

function resolveDeleteError(err: unknown): string {
  const status = getApiErrorStatus(err);
  if (status === 403) return 'No tienes permiso para eliminar esta URL';
  if (status === 404) return 'Esta URL ya no existe';
  return getApiErrorMessage(err);
}

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const { urls, loading, error, addUrl, removeUrl } = useUrls();

  const [deletingCodes, setDeletingCodes] = useState<Set<string>>(new Set());
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  async function handleDelete(code: string) {
    setDeleteErrors((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
    setDeletingCodes((prev) => new Set(prev).add(code));

    try {
      await removeUrl(code);
    } catch (err) {
      setDeleteErrors((prev) => ({ ...prev, [code]: resolveDeleteError(err) }));
    } finally {
      setDeletingCodes((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    }
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <h1 className="home-title">⚡ SNAP</h1>
        <p className="home-subtitle">Acorta, comparte y mide tus URLs</p>
      </div>

      {isAuthenticated && <CreateUrlForm onCreated={addUrl} />}

      <section className="urls-section">
        <h2 className="section-title">URLs públicas</h2>

        {loading && <div className="state-msg">Cargando URLs…</div>}

        {!loading && error && (
          <div className="error-banner" role="alert">
            <span>⚠</span> {error}
          </div>
        )}

        {!loading && !error && urls.length === 0 && (
          <div className="empty-state">
            <p className="empty-icon">🔗</p>
            <p className="empty-text">Todavía no hay URLs acortadas.</p>
            <p className="empty-hint">
              {isAuthenticated
                ? '¡Sé el primero en acortar una!'
                : 'Inicia sesión para crear la primera.'}
            </p>
          </div>
        )}

        {!loading && !error && urls.length > 0 && (
          <UrlTable
            urls={urls}
            isAuthenticated={isAuthenticated}
            deletingCodes={deletingCodes}
            deleteErrors={deleteErrors}
            onDelete={handleDelete}
          />
        )}
      </section>
    </div>
  );
}
