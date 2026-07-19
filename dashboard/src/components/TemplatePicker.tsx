import { useEffect, useState } from 'react';
import type { Template } from '../types/template';
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from '../api/templates';
import { useToast } from './Toast';
import './TemplatePicker.css';

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
    <div className="template-picker">
      <div className="template-picker__header">
        <h2>Templates</h2>
        <button type="button" className="template-picker__new" onClick={startCreate}>
          + New template
        </button>
      </div>

      {loading && <p className="template-picker__empty">Loading templates…</p>}

      {!loading && templates.length === 0 && editingId === null && (
        <p className="template-picker__empty">No templates yet. Create one to reuse common message bodies.</p>
      )}

      {!loading && templates.length > 0 && (
        <ul className="template-picker__list">
          {templates.map((template) => (
            <li
              key={template.id}
              className={`template-picker__item${
                selectedId === template.id ? ' template-picker__item--selected' : ''
              }`}
            >
              <button type="button" className="template-picker__item-name" onClick={() => selectTemplate(template)}>
                {template.name}
              </button>
              <div className="template-picker__item-actions">
                <button type="button" onClick={() => startEdit(template)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(template)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="template-picker__variables">
          {selected.variables.map((name) => (
            <label key={name} className="template-picker__variable-row">
              {name}
              <input
                value={variableValues[name] ?? ''}
                onChange={(e) => setVariableValues((current) => ({ ...current, [name]: e.target.value }))}
                placeholder={`Value for {{${name}}}`}
              />
            </label>
          ))}
          <button type="button" className="template-picker__insert" onClick={handleInsert}>
            Insert into message
          </button>
        </div>
      )}

      {editingId !== null && (
        <form className="template-picker__form" onSubmit={handleFormSubmit}>
          <input
            value={form.name}
            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            placeholder="Template name"
            required
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm((current) => ({ ...current, body: e.target.value }))}
            placeholder="Your OTP is {{code}}"
            rows={3}
            required
          />
          <p className="template-picker__hint">Use {'{{variable}}'} placeholders — they're detected automatically.</p>
          <div className="template-picker__form-actions">
            <button type="submit">{editingId === 'new' ? 'Create' : 'Save'}</button>
            <button type="button" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
