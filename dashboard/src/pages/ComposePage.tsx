import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMessage } from '../api/messages';
import { TemplatePicker } from '../components/TemplatePicker';
import { useToast } from '../components/Toast';

export function ComposePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await createMessage({ to, from, message: body });
      showToast('Message captured.', 'success');
      navigate('/');
    } catch (err: unknown) {
      console.error('Failed to send message', err);
      showToast('Failed to send message.', 'error');
    } finally {
      setSending(false);
    }
  }

  const inputClasses =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Compose</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Send a test message, optionally starting from a saved template.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            To
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+8801700000000" required className={inputClasses} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            From
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="SMSPit" required className={inputClasses} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            Message
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} required className={inputClasses} />
          </label>
          <button
            type="submit"
            disabled={sending}
            className="self-start rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-400"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>

        <TemplatePicker onInsert={setBody} />
      </div>
    </div>
  );
}
