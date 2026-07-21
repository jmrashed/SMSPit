import { useState } from 'react';
import { generateTestData } from '../api/generate';
import { createMessage } from '../api/messages';
import { useToast } from './Toast';
import './GenerateTestDataButton.css';

// Capped well below ai-service's own limit (50) and gated behind a
// confirmation for anything past a handful -- this writes real rows via
// the same capture endpoint a live integration would use, so a fat-
// fingered count shouldn't be able to flood the inbox unnoticed.
const MAX_COUNT = 20;
const CONFIRM_THRESHOLD = 5;

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Random mix' },
  { value: 'otp', label: 'OTP' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
];

export function GenerateTestDataButton() {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(5);
  const [type, setType] = useState('');
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (count > CONFIRM_THRESHOLD && !window.confirm(`Generate ${count} synthetic test messages into the inbox?`)) {
      return;
    }

    setGenerating(true);
    try {
      const { messages } = await generateTestData({ count, type: type || undefined });

      let created = 0;
      for (const generated of messages) {
        try {
          await createMessage({ to: generated.to, from: generated.from, message: generated.message });
          created++;
        } catch (err: unknown) {
          console.error('Failed to capture a generated test message', err);
        }
      }

      showToast(`Generated ${created} of ${messages.length} test message(s).`, created > 0 ? 'success' : 'error');
      setOpen(false);
    } catch (err: unknown) {
      console.error('Failed to generate test data', err);
      showToast('Failed to generate test data. Is ai-service running?', 'error');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="generate-test-data">
      <button type="button" className="generate-test-data__trigger" onClick={() => setOpen((o) => !o)}>
        Generate test data
      </button>

      {open && (
        <div className="generate-test-data__panel">
          <label className="generate-test-data__field">
            Count (max {MAX_COUNT})
            <input
              type="number"
              min={1}
              max={MAX_COUNT}
              value={count}
              onChange={(e) => setCount(Math.min(MAX_COUNT, Math.max(1, Number(e.target.value) || 1)))}
            />
          </label>

          <label className="generate-test-data__field">
            Type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <p className="generate-test-data__hint">Generated messages are captured into the inbox immediately.</p>

          <button
            type="button"
            className="generate-test-data__submit"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      )}
    </div>
  );
}
