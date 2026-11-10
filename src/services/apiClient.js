// Every service calls the FitTrack backend through this one function and gets back { data, error }.
// Calls made at the same moment (for example a page loading several lists) are sent together,
// so they share one database connection.
import { fittrackApi } from './http.js';
import { fail } from './serviceResult.js';

const MAX_BATCH = 40;
let queue = [];
let scheduled = false;

async function flush() {
  scheduled = false;
  const batch = queue.splice(0, MAX_BATCH);
  if (queue.length) schedule();
  if (!batch.length) return;
  try {
    const origin = typeof window === 'undefined' ? undefined : window.location.origin;
    const results = await fittrackApi({
      data: { calls: batch.map(({ action, args }) => ({ action, args })), origin },
    });
    batch.forEach((item, index) => {
      const result = Array.isArray(results) ? results[index] : null;
      item.resolve(
        result && typeof result === 'object'
          ? { data: result.data ?? null, error: result.error ?? null }
          : fail('Unexpected response from the server.', 'BAD_RESPONSE')
      );
    });
  } catch (err) {
    console.error('[fittrack] request failed', err);
    const failure = fail('Could not reach the FitTrack server. Check your connection and try again.', 'NETWORK_ERROR');
    batch.forEach((item) => item.resolve(failure));
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(flush, 0);
}

export function callApi(action, args = {}) {
  return new Promise((resolve) => {
    queue.push({ action, args, resolve });
    schedule();
  });
}

export function invalid(message) {
  return fail(message, 'VALIDATION_ERROR');
}
