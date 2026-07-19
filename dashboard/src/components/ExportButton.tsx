import { useState } from 'react';
import { exportMessages, type ExportMessagesParams } from '../api/messages';
import { useToast } from './Toast';
import './ExportButton.css';

// blob: URLs are how a browser-triggered download works for a response
// that required an Authorization header to fetch -- a plain <a href>
// can't attach one, so the file has to be fetched first and handed to
// the browser as an object URL.
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ExportButton({ filters }: { filters: Omit<ExportMessagesParams, 'format'> }) {
  const { showToast } = useToast();
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const { blob, filename } = await exportMessages({ ...filters, format });
      triggerDownload(blob, filename);
    } catch (err: unknown) {
      console.error('Failed to export messages', err);
      showToast('Failed to export messages.', 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="export-button">
      <select
        className="export-button__format"
        value={format}
        onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
        aria-label="Export format"
        disabled={exporting}
      >
        <option value="csv">CSV</option>
        <option value="json">JSON</option>
      </select>
      <button type="button" onClick={handleExport} disabled={exporting}>
        {exporting ? 'Exporting…' : 'Export'}
      </button>
    </div>
  );
}
