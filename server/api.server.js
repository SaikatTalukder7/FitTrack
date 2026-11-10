// FitTrack API router: maps an action name to its handler, checks who may call it,
// and always answers in the shared { data, error } shape. This replaces the old Supabase REST API + RLS.
import { getRequest } from './http.js';
import { withDb, AppError, isDuplicateError } from './db.server.js';
import { checkAccess } from './rules.js';
import { authHandlers, getCurrentUser } from './auth.server.js';
import { profileHandlers } from './handlers/profile.server.js';
import { catalogHandlers } from './handlers/catalog.server.js';
import { workoutHandlers } from './handlers/workouts.server.js';
import { billingHandlers } from './handlers/billing.server.js';
import { trackingHandlers } from './handlers/tracking.server.js';

const HANDLERS = {
  ...authHandlers,
  ...profileHandlers,
  ...catalogHandlers,
  ...workoutHandlers,
  ...billingHandlers,
  ...trackingHandlers,
};

export const ACTIONS = Object.keys(HANDLERS);

function requestOrigin(claimed) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const request = getRequest();
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
  const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  const fallback = `${proto}://${host}`;
  if (typeof claimed === 'string') {
    try {
      const parsed = new URL(claimed);
      if (parsed.host === host) return parsed.origin;
    } catch {
      // ignore malformed origin
    }
  }
  return fallback;
}

function toError(handler, action, err) {
  if (isDuplicateError(err)) {
    return { data: null, error: { message: handler?.duplicate || 'This record already exists.', code: '23505' } };
  }
  if (err instanceof AppError) return { data: null, error: { message: err.message, code: err.code } };
  console.error(`[fittrack] ${action} failed:`, err);
  return { data: null, error: { message: 'The request could not be completed. Please try again.', code: 'SERVER_ERROR' } };
}

async function runOne(ctx, action, args) {
  const handler = Object.prototype.hasOwnProperty.call(HANDLERS, action) ? HANDLERS[action] : null;
  if (!handler) return { data: null, error: { message: 'Unknown request.', code: 'UNKNOWN_ACTION' } };
  try {
    const denied = checkAccess(handler.auth, ctx.user);
    if (denied) throw new AppError(denied.message, denied.code);
    const data = await handler.run({ ...ctx, args: args ?? {} });
    return { data: data ?? null, error: null };
  } catch (err) {
    return toError(handler, action, err);
  }
}

// Runs several actions over one database connection (the browser groups calls made at the same moment).
export async function dispatchBatch(calls, claimedOrigin) {
  try {
    return await withDb(async (db, client) => {
      const user = await getCurrentUser(db);
      const ctx = { db, client, user, origin: requestOrigin(claimedOrigin) };
      return Promise.all(calls.map((call) => runOne(ctx, call.action, call.args)));
    });
  } catch (err) {
    const failure = toError(null, 'batch', err);
    return calls.map(() => failure);
  }
}
