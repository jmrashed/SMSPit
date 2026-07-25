import { useEffect, useState, type FormEvent } from 'react';
import type { Template } from '../types/template';
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from '../api/templates';
import { detectVariables } from '../lib/templateVariables';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { useToast } from '../components/Toast';

const NAME_MAX_LENGTH = 255;
const BODY_MAX_LENGTH = 1600;

interface FormState {
  name: string;
  body: string;
}

const EMPTY_FORM: FormState = { name: '', body: '' };

const inputClasses =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function TemplatesPage() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    listTemplates()
      .then((response) => {
        if (cancelled) return;
        setTemplates(response.templates);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load templates', err);
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  function startCreate() {
    setEditingId('new');
    setForm(EMPTY_FORM);
  }

  function startEdit(template: Template) {
    setEditingId(template.id);
    setForm({ name: template.name, body: template.body });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    const body = form.body.trim();

    if (!name || name.length > NAME_MAX_LENGTH) {
      showToast(`Enter a name up to ${NAME_MAX_LENGTH} characters.`, 'error');
      return;
    }
    if (!body || body.length > BODY_MAX_LENGTH) {
      showToast(`Enter a message body up to ${BODY_MAX_LENGTH} characters.`, 'error');
      return;
    }

    const variables = detectVariables(body);
    setSaving(true);
    try {
      if (editingId === 'new') {
        const created = await createTemplate({ name, body, variables });
        setTemplates((current) => [created, ...current]);
        showToast('Template created.', 'success');
      } else if (editingId !== null) {
        const updated = await updateTemplate(editingId, { name, body, variables });
        setTemplates((current) => current.map((t) => (t.id === updated.id ? updated : t)));
        showToast('Template updated.', 'success');
      }
      cancelEdit();
    } catch (err: unknown) {
      console.error('Failed to save template', err);
      showToast('Failed to save template.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(template: Template) {
    if (!window.confirm(`Delete template "${template.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteTemplate(template.id);
      setTemplates((current) => current.filter((t) => t.id !== template.id));
      if (editingId === template.id) cancelEdit();
      showToast('Template deleted.', 'success');
    } catch (err: unknown) {
      console.error('Failed to delete template', err);
      showToast('Failed to delete template.', 'error');
    }
  }

  const previewVariables = detectVariables(form.body);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Templates</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Reusable message bodies with <code>{'{{variable}}'}</code> placeholders. Also usable from the Compose page's
            picker.
          </p>
        </div>
        {editingId === null && (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-400"
          >
            + New template
          </button>
        )}
      </header>

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            Name
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              maxLength={NAME_MAX_LENGTH}
              placeholder="OTP"
              aria-label="Template name"
              className={inputClasses}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            Body
            <textarea
              value={form.body}
              onChange={(e) => setForm((current) => ({ ...current, body: e.target.value }))}
              maxLength={BODY_MAX_LENGTH}
              rows={4}
              placeholder="Your OTP is {{code}}. It expires in {{minutes}} minutes."
              aria-label="Template body"
              className={inputClasses}
            />
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {previewVariables.length > 0
              ? `Detected variables: ${previewVariables.join(', ')}`
              : 'Use {{variable}} placeholders — they’re detected automatically.'}
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-400"
            >
              {saving ? 'Saving…' : editingId === 'new' ? 'Create' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <Spinner label="Loading templates…" />}

      {error && <ErrorBanner message="Couldn't load templates." onRetry={() => setRetryToken((t) => t + 1)} />}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Body</th>
                <th className="py-2 pr-4 font-medium">Variables</th>
                <th className="py-2 pr-4 font-medium">Updated</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 dark:text-slate-400">
                    No templates yet.
                  </td>
                </tr>
              )}
              {templates.map((template) => (
                <tr key={template.id} className="border-b border-slate-100 dark:border-slate-900">
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{template.name}</td>
                  <td className="max-w-xs truncate py-3 pr-4 text-slate-600 dark:text-slate-400">{template.body}</td>
                  <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">
                    {template.variables.length > 0 ? template.variables.join(', ') : '—'}
                  </td>
                  <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{formatTimestamp(template.updated_at)}</td>
                  <td className="py-3">
                    <div className="flex gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => startEdit(template)}
                        className="font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(template)}
                        className="font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
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
