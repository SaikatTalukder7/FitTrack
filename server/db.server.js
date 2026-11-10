// MongoDB Atlas access. A new client is opened for each server call and closed afterwards,
// because the hosting runtime cannot reuse network connections across requests.
import { MongoClient } from 'mongodb';
import { seedStarterData } from './seed.server.js';

let setupDone = false;

export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR') {
    super(message);
    this.code = code;
  }
}

export const invalid = (message) => new AppError(message, 'VALIDATION_ERROR');
export const notFound = (message) => new AppError(message, 'NOT_FOUND');
export const forbidden = (message) => new AppError(message, '42501');

export function newId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

// Server date (UTC) as YYYY-MM-DD, matching the original database's current_date.
export function today() {
  return new Date().toISOString().slice(0, 10);
}

export { addDays } from './rules.js';

// Converts a stored document (_id) into the API shape (id).
export function out(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export function outAll(docs) {
  return docs.map(out);
}

export function pick(source, keys) {
  const result = {};
  if (!source || typeof source !== 'object') return result;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) result[key] = source[key];
  }
  return result;
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Loads related documents and attaches them under `as`.
 * Example: attach(db, rows, { field: 'customer_id', collection: 'users', as: 'profiles', project: ['full_name'] })
 */
export async function attach(db, rows, { field, collection, as, project }) {
  const ids = [...new Set(rows.map((row) => row[field]).filter(Boolean))];
  const projection = project ? Object.fromEntries(project.map((key) => [key, 1])) : undefined;
  const related = ids.length
    ? await db.collection(collection).find({ _id: { $in: ids } }, projection ? { projection } : {}).toArray()
    : [];
  const byId = new Map(related.map((doc) => [doc._id, out(doc)]));
  for (const row of rows) {
    const found = byId.get(row[field]) ?? null;
    if (found && project && !project.includes('id')) delete found.id;
    row[as] = found;
  }
  return rows;
}

export function isDuplicateError(err) {
  return err && (err.code === 11000 || err.code === 11001);
}

async function ensureSetup(db) {
  if (setupDone) return;
  const idx = (name, spec, options = {}) => db.collection(name).createIndex(spec, options);
  await Promise.all([
    idx('users', { email: 1 }, { unique: true }),
    idx('users', { role: 1 }),
    idx('auth_tokens', { token_hash: 1 }, { unique: true }),
    idx('auth_tokens', { expires_at: 1 }, { expireAfterSeconds: 0 }),
    idx('exercises', { name: 1 }, { unique: true }),
    idx('exercises', { muscle_group: 1 }),
    idx('equipment', { name: 1 }, { unique: true }),
    idx('exercise_equipment', { exercise_id: 1, equipment_id: 1 }, { unique: true }),
    idx('workout_splits', { name: 1 }, { unique: true }),
    idx('workout_split_exercises', { split_id: 1, day_label: 1, exercise_id: 1 }, { unique: true }),
    idx('workout_split_days', { split_id: 1, day_name: 1 }, { unique: true }),
    idx('membership_plans', { name: 1 }, { unique: true }),
    idx('memberships', { customer_id: 1 }, { unique: true, partialFilterExpression: { status: 'active' }, name: 'one_active_membership' }),
    idx('memberships', { customer_id: 1, start_date: -1 }),
    idx('payments', { customer_id: 1, created_at: -1 }),
    idx('attendance', { customer_id: 1, check_date: 1 }, { unique: true }),
    idx('customer_routines', { customer_id: 1 }, { unique: true, partialFilterExpression: { is_active: true }, name: 'one_active_routine' }),
    idx('routine_exercises', { routine_id: 1, exercise_id: 1 }, { unique: true }),
    idx('workout_sessions', { customer_id: 1, started_at: -1 }),
    idx('workout_logs', { session_id: 1, exercise_id: 1, set_number: 1 }, { unique: true }),
    idx('fitness_measurements', { customer_id: 1, measured_on: 1 }, { unique: true }),
    idx('membership_purchase_requests', { customer_id: 1 }, { unique: true, partialFilterExpression: { status: 'pending' }, name: 'one_pending_request' }),
    idx('membership_purchase_requests', { reference: 1 }, { unique: true }),
    idx('membership_purchase_requests', { status: 1, created_at: -1 }),
  ]);
  await seedStarterData(db);
  setupDone = true;
}

// The published app runs on Cloudflare Workers, which cannot share a connection between requests.
// Local Node.js (the editor preview server) can, so it keeps one client open to stay fast.
const canReuseClient = typeof navigator === 'undefined' || navigator.userAgent !== 'Cloudflare-Workers';
let sharedClient = null;

async function openClient(uri, reuse) {
  if (reuse && sharedClient) return sharedClient;
  const client = new MongoClient(uri, {
    maxPoolSize: reuse ? 10 : 1,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 8000,
  });
  const connecting = client.connect().then(() => client);
  if (reuse) {
    sharedClient = connecting.catch((err) => {
      sharedClient = null;
      throw err;
    });
    return sharedClient;
  }
  return connecting;
}

export async function withDb(fn) {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new AppError('The database is not configured yet (MONGODB_URI is missing).', 'CONFIG_ERROR');
  const client = await openClient(uri, canReuseClient);
  try {
    const db = client.db(process.env.MONGODB_DB || 'fittrack_app');
    await ensureSetup(db);
    return await fn(db, client);
  } finally {
    if (!canReuseClient) await client.close().catch(() => {});
  }
}

// Runs fn inside a MongoDB transaction (Atlas clusters support multi-document transactions).
export async function inTransaction(client, fn) {
  const session = client.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
