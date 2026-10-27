// Every service returns { data, error }. Components never parse raw Supabase errors.

export function ok(data) {
  return { data, error: null };
}

export function fail(message, code = 'UNKNOWN_ERROR') {
  return { data: null, error: { message, code } };
}

export function normalizeSupabaseError(err) {
  const message = err?.message || 'The request could not be completed.';
  const code = String(err?.code ?? err?.status ?? 'UNKNOWN_ERROR');
  return fail(message, code);
}
