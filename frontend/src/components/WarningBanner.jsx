import { AlertTriangle } from 'lucide-react';

/**
 * Informational warning banner — used to surface booking conflicts.
 * Never blocks user actions; purely informational.
 *
 * @param {{ message: string, compact?: boolean, id?: string }} props
 */
export default function WarningBanner({ message, compact = false, id }) {
  if (!message) return null;

  return (
    <div
      className={`warning-banner${compact ? ' warning-banner--compact' : ''}`}
      role="alert"
      id={id}
    >
      <AlertTriangle size={compact ? 14 : 16} className="warning-banner__icon" />
      <span className="warning-banner__text">{message}</span>
    </div>
  );
}
