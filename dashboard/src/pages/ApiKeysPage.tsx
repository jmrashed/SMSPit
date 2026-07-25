import { useEffect, useState, type FormEvent } from 'react';
import type { ApiKey } from '../types/apiKey';
import { createApiKey, listApiKeys, revokeApiKey } from '../api/apiKeys';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { useToast } from '../components/Toast';

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

  const inputClasses =
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">API keys</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create and manage API keys used to authenticate against SMSPit's API.
        </p>
      </header>

      {newlyCreatedKey && (
        <div
          data-testid="new-key-banner"
          className="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-green-900 dark:bg-green-950/40"
        >
          <div>
            <strong className="block text-sm text-green-900 dark:text-green-300">
              New key created — copy it now, it won't be shown again:
            </strong>
            <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs dark:bg-slate-900">{newlyCreatedKey}</code>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleCopy(newlyCreatedKey)}
              className="rounded-md border border-green-300 px-3 py-1.5 text-sm font-medium hover:bg-green-100 dark:border-green-800 dark:hover:bg-green-900/40"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setNewlyCreatedKey(null)}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
          Key name
          <input
            type="text"
            placeholder="Key name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Key name"
            className={inputClasses}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
          Owner ID
          <input
            type="number"
            placeholder="Owner ID"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            aria-label="Owner ID"
            min={1}
            className={inputClasses}
          />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-400"
        >
          {creating ? 'Creating…' : 'Create key'}
        </button>
      </form>

      {loading && <Spinner label="Loading API keys…" />}

      {error && <ErrorBanner message="Couldn't load API keys." onRetry={() => setRetryToken((t) => t + 1)} />}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Key</th>
                <th className="py-2 pr-4 font-medium">Owner</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Last used</th>
                <th className="py-2 pr-4 font-medium">Created</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 dark:text-slate-400">
                    No API keys yet.
                  </td>
                </tr>
              )}
              {apiKeys.map((apiKey) => (
                <tr key={apiKey.id} className="border-b border-slate-100 dark:border-slate-900">
                  <td className="py-3 pr-4">{apiKey.name}</td>
                  <td className="py-3 pr-4">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{apiKey.key}</code>
                  </td>
                  <td className="py-3 pr-4">{apiKey.owner_id}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        apiKey.revoked_at
                          ? 'bg-slate-500/10 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300'
                          : 'bg-green-600/10 text-green-700 dark:bg-green-400/15 dark:text-green-400'
                      }`}
                    >
                      {apiKey.revoked_at ? 'Revoked' : 'Active'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{formatTimestamp(apiKey.last_used_at)}</td>
                  <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{formatTimestamp(apiKey.created_at)}</td>
                  <td className="py-3">
                    {!apiKey.revoked_at && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(apiKey)}
                        className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
