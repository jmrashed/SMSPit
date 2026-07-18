import './MessageListSkeleton.css';

export function MessageListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="message-list-skeleton" data-testid="message-list-skeleton" aria-busy="true" aria-label="Loading messages">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="message-list-skeleton__row" key={i}>
          <span className="message-list-skeleton__bar message-list-skeleton__bar--sm" />
          <span className="message-list-skeleton__bar message-list-skeleton__bar--sm" />
          <span className="message-list-skeleton__bar message-list-skeleton__bar--lg" />
          <span className="message-list-skeleton__bar message-list-skeleton__bar--pill" />
          <span className="message-list-skeleton__bar message-list-skeleton__bar--sm" />
        </div>
      ))}
    </div>
  );
}
