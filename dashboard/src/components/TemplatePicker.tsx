import { useEffect, useState } from 'react';
import type { Template } from '../types/template';
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from '../api/templates';
import { useToast } from './Toast';

const VARIABLE_PATTERN = /{{\s*([\w.]+)\s*}}/g;

function detectVariables(body: string): string[] {
  const names = new Set<string>();
  for (const match of body.matchAll(VARIABLE_PATTERN)) {
    names.add(match[1]);
  }
  return [...names];
}

function renderBody(body: string, values: Record<string, string>): string {
  return body.replace(VARIABLE_PATTERN, (full, name: string) => values[name] ?? full);
}

interface TemplateFormState {
  name: string;
  body: string;
}

const EMPTY_FORM: TemplateFormState = { name: '', body: '' };

const inputClasses =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export function TemplatePicker({ onInsert }: { onInsert: (body: string) => void }) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<number | null | 'new'>(null);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);

  useEffect(() => {
    let cancelled = false;

    listTemplates()
      .then((response) => {
        if (cancelled) return;
        setTemplates(response.templates);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load templates', err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  function selectTemplate(template: Template) {
    setSelectedId(template.id);
    setVariableValues(Object.fromEntries(template.variables.map((name) => [name, ''])));
  }

  function startCreate() {
    setEditingId('new');
    setForm(EMPTY_FORM);
  }

  function startEdit(template: Template) {
    setEditingId(template.id);
    setForm({ name: template.name, body: template.body });
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const variables = detectVariables(form.body);

    try {
      if (editingId === 'new') {
        const created = await createTemplate({ name: form.name, body: form.body, variables });
        setTemplates((current) => [created, ...current]);
        showToast('Template created.', 'success');
      } else if (editingId !== null) {
        const updated = await updateTemplate(editingId, { name: form.name, body: form.body, variables });
        setTemplates((current) => current.map((t) => (t.id === updated.id ? updated : t)));
        showToast('Template updated.', 'success');
      }
      setEditingId(null);
    } catch (err: unknown) {
      console.error('Failed to save template', err);
      showToast('Failed to save template.', 'error');
    }
  }

  async function handleDelete(template: Template) {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;

    try {
      await deleteTemplate(template.id);
      setTemplates((current) => current.filter((t) => t.id !== template.id));
      if (selectedId === template.id) setSelectedId(null);
      showToast('Template deleted.', 'success');
    } catch (err: unknown) {
      console.error('Failed to delete template', err);
      showToast('Failed to delete template.', 'error');
    }
  }

  function handleInsert() {
    if (!selected) return;
    onInsert(renderBody(selected.body, variableValues));
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Templates</h2>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-md border border-slate-200 px-3 py-1 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          + New template
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading templates…</p>}

      {!loading && templates.length === 0 && editingId === null && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No templates yet. Create one to reuse common message bodies.
        </p>
      )}

      {!loading && templates.length > 0 && (
        <ul className="flex flex-col gap-1">
          {templates.map((template) => (
            <li
              key={template.id}
              className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                selectedId === template.id ? 'bg-purple-600/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <button type="button" onClick={() => selectTemplate(template)} className="text-left">
                {template.name}
              </button>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => startEdit(template)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(template)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          {selected.variables.map((name) => (
            <label key={name} className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
              {name}
              <input
                value={variableValues[name] ?? ''}
                onChange={(e) => setVariableValues((current) => ({ ...current, [name]: e.target.value }))}
                placeholder={`Value for {{${name}}}`}
                className={inputClasses}
              />
            </label>
          ))}
          <button
            type="button"
            onClick={handleInsert}
            className="mt-1 self-start rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-400"
          >
            Insert into message
          </button>
        </div>
      )}

      {editingId !== null && (
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <input
            value={form.name}
            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            placeholder="Template name"
            required
            className={inputClasses}
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm((current) => ({ ...current, body: e.target.value }))}
            placeholder="Your OTP is {{code}}"
            rows={3}
            required
            className={inputClasses}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Use {'{{variable}}'} placeholders — they're detected automatically.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-400"
            >
              {editingId === 'new' ? 'Create' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
