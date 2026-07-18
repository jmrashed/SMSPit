import './ErrorBanner.css';

export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-banner" role="alert" data-testid="error-banner">
      <span>{message}</span>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
