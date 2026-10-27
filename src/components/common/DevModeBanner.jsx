import { isDevMode } from '../../services/supabaseClient.js';

export default function DevModeBanner() {
  if (!isDevMode) return null;
  return (
    <div
      role="note"
      className="mb-4 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-300"
    >
      DEVELOPMENT MODE: sample data only. Changes are not saved to a database.
    </div>
  );
}
