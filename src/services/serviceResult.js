// Every service returns { data, error }. Components never parse raw server errors.

export function ok(data) {
  return { data, error: null };
}

export function fail(message, code = 'UNKNOWN_ERROR') {
  return { data: null, error: { message, code } };
}
