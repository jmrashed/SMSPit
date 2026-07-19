import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ApiKey } from '../types/apiKey';
import { createApiKey, listApiKeys, revokeApiKey } from '../api/apiKeys';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { useToast } from '../components/Toast';
import './ApiKeysPage.css';

function formatTimestamp(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

export function ApiKeysPage() {
  const { showToast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    listApiKeys()
      .then((response) => {
        if (cancelled) return;
        setApiKeys(response.api_keys);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load API keys', err);
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const ownerIdNumber = Number(ownerId);
    if (!name.trim() || !Number.isInteger(ownerIdNumber) || ownerIdNumber <= 0) {
      showToast('Enter a name and a valid owner ID.', 'error');
      return;
    }

    setCreating(true);
    try {
      const created = await createApiKey({ name: name.trim(), owner_id: ownerIdNumber });
      setNewlyCreatedKey(created.key);
      setName('');
      setOwnerId('');
      setRetryToken((t) => t + 1);
      showToast('API key created.', 'success');
    } catch (err) {
      console.error('Failed to create API key', err);
      showToast('Failed to create API key.', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(apiKey: ApiKey) {
    if (!window.confirm(`Revoke the key "${apiKey.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await revokeApiKey(apiKey.id);
      showToast('API key revoked.', 'success');
      setRetryToken((t) => t + 1);
    } catch (err) {
      console.error('Failed to revoke API key', err);
      showToast('Failed to revoke API key.', 'error');
    }
  }

  async function handleCopy(key: string) {
    await navigator.clipboard.writeText(key);
    showToast('Copied to clipboard.', 'success');
  }

  return (
    <main className="api-keys-page">
      <Link to="/" className="api-keys-page__back">
        ← Back to inbox
      </Link>
      <header className="api-keys-page__header">
        <h1>API keys</h1>
        <p>Create and manage API keys used to authenticate against SMSPit's API.</p>
      </header>

      {newlyCreatedKey && (
        <div className="api-keys-page__new-key" data-testid="new-key-banner">
          <div>
            <strong>New key created — copy it now, it won't be shown again:</strong>
            <code>{newlyCreatedKey}</code>
          </div>
          <div className="api-keys-page__new-key-actions">
            <button type="button" onClick={() => handleCopy(newlyCreatedKey)}>
              Copy
            </button>
            <button type="button" onClick={() => setNewlyCreatedKey(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form className="api-keys-page__form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Key name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Key name"
        />
        <input
          type="number"
          placeholder="Owner ID"
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          aria-label="Owner ID"
          min={1}
        />
        <button type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create key'}
        </button>
      </form>

      {loading && <Spinner label="Loading API keys…" />}

      {error && (
        <ErrorBanner message="Couldn't load API keys." onRetry={() => setRetryToken((t) => t + 1)} />
      )}

      {!loading && !error && (
        <table className="api-keys-page__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Last used</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.length === 0 && (
              <tr>
                <td colSpan={7} className="api-keys-page__empty">
                  No API keys yet.
                </td>
              </tr>
            )}
            {apiKeys.map((apiKey) => (
              <tr key={apiKey.id}>
                <td>{apiKey.name}</td>
                <td>
                  <code>{apiKey.key}</code>
                </td>
                <td>{apiKey.owner_id}</td>
                <td>
                  <span className={`api-keys-page__status api-keys-page__status--${apiKey.revoked_at ? 'revoked' : 'active'}`}>
                    {apiKey.revoked_at ? 'Revoked' : 'Active'}
                  </span>
                </td>
                <td>{formatTimestamp(apiKey.last_used_at)}</td>
                <td>{formatTimestamp(apiKey.created_at)}</td>
                <td>
                  {!apiKey.revoked_at && (
                    <button type="button" onClick={() => handleRevoke(apiKey)}>
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
