import { createClient } from '@supabase/supabase-js';
import { fail } from './serviceResult.js';

const DATA_SOURCE = (import.meta.env.VITE_DATA_SOURCE || 'dev').trim().toLowerCase();
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isDevMode = DATA_SOURCE === 'dev';

export const isSupabaseConfigured =
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) && !SUPABASE_URL.includes('your-project-ref');

function getConfigError() {
  if (isDevMode) return null;
  if (DATA_SOURCE !== 'supabase') {
    return `VITE_DATA_SOURCE must be "dev" or "supabase" (found "${DATA_SOURCE}").`;
  }
  if (!isSupabaseConfigured) {
    return 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (see .env.example).';
  }
  return null;
}

export const configError = getConfigError();

// Null in dev mode or when misconfigured. Services must check this before use.
export const supabase = !isDevMode && !configError
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export function unavailable() {
  return fail(configError ?? 'Supabase client is unavailable.', 'CONFIG_ERROR');
}
