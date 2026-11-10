// Pure business rules shared by the server handlers (kept free of database code so they are easy to test).

// Who may call an action: 'public' (anyone), 'user' (signed in), 'admin', or 'customer'.
// Returns null when allowed, otherwise { message, code }.
export function checkAccess(required, user) {
  if (required === 'public') return null;
  if (!user) return { message: 'Your session has ended. Please log in again.', code: 'UNAUTHENTICATED' };
  if (required === 'admin' && user.role !== 'admin') return { message: 'Only an administrator can do this.', code: '42501' };
  if (required === 'customer' && user.role !== 'customer') return { message: 'Only customer accounts can do this.', code: '42501' };
  return null;
}

export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// A membership's end date is inclusive: start date + duration - 1.
export function membershipEndDate(startDate, durationDays) {
  return addDays(startDate, durationDays - 1);
}
