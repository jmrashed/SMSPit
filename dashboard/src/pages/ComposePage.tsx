import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createMessage } from '../api/messages';
import { TemplatePicker } from '../components/TemplatePicker';
import { useToast } from '../components/Toast';
import './ComposePage.css';

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

  return (
    <main className="compose-page">
      <Link to="/" className="compose-page__back">
        ← Back to inbox
      </Link>
      <header className="compose-page__header">
        <h1>Compose</h1>
        <p>Send a test message, optionally starting from a saved template.</p>
      </header>

      <div className="compose-page__layout">
        <form className="compose-page__form" onSubmit={handleSubmit}>
          <label className="compose-page__field">
            To
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+8801700000000" required />
          </label>
          <label className="compose-page__field">
            From
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="SMSPit" required />
          </label>
          <label className="compose-page__field">
            Message
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} required />
          </label>
          <button type="submit" className="compose-page__send" disabled={sending}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>

        <TemplatePicker onInsert={setBody} />
      </div>
    </main>
  );
}
