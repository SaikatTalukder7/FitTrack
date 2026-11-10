// Workout splits (with weekly plans), customer routines, workout sessions, and set logs.
import { AppError, invalid, notFound, forbidden, out, outAll, pick, newId, nowIso, attach, inTransaction } from '../db.server.js';
import { MUSCLE_GROUPS } from './catalog.server.js';

const WEEKDAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SPLIT_FIELDS = ['name', 'description', 'start_day'];
const ROUTINE_EXERCISE_FIELDS = ['routine_id', 'exercise_id', 'day_label', 'position', 'sets', 'reps', 'target_weight_kg'];
const ROUTINE_EXERCISE_UPDATE_FIELDS = ['exercise_id', 'day_label', 'position', 'sets', 'reps', 'target_weight_kg'];
const LOG_FIELDS = ['session_id', 'routine_exercise_id', 'exercise_id', 'set_number', 'reps', 'weight_kg', 'completed', 'notes'];
const LOG_UPDATE_FIELDS = ['reps', 'weight_kg', 'completed', 'notes'];
const DEFAULT_REST_HOURS = 48;

const isAdmin = (user) => user.role === 'admin';

function checkSplitFields(fields) {
  if ('name' in fields && String(fields.name ?? '').trim().length < 2) return 'Split name must be at least 2 characters.';
  if ('name' in fields && String(fields.name ?? '').trim().length > 120) return 'Split name must be 120 characters or fewer.';
  if ('description' in fields && String(fields.description ?? '').length > 1000) return 'Description must be 1000 characters or fewer.';
  if ('start_day' in fields && fields.start_day != null && !WEEKDAYS.includes(fields.start_day)) return 'Choose a valid start day.';
  return null;
}

function checkRoutineExerciseFields(fields) {
  if ('exercise_id' in fields && !fields.exercise_id) return 'Choose an exercise.';
  if ('sets' in fields && !(Number.isInteger(fields.sets) && fields.sets >= 1 && fields.sets <= 20)) return 'Sets must be a whole number from 1 to 20.';
  if ('reps' in fields && !(Number.isInteger(fields.reps) && fields.reps >= 1 && fields.reps <= 100)) return 'Reps must be a whole number from 1 to 100.';
  if ('target_weight_kg' in fields && fields.target_weight_kg !== null && !(Number(fields.target_weight_kg) >= 0)) return 'Target weight cannot be negative.';
  if ('position' in fields && !(Number.isInteger(fields.position) && fields.position >= 0)) return 'Position must be a whole number, zero or higher.';
  if ('day_label' in fields && String(fields.day_label ?? '').length > 40) return 'Day label must be 40 characters or fewer.';
  return null;
}

function normalizeRoutineExercise(fields) {
  if ('target_weight_kg' in fields && fields.target_weight_kg !== null) fields.target_weight_kg = Number(fields.target_weight_kg);
  if ('day_label' in fields) fields.day_label = String(fields.day_label ?? '');
  return fields;
}

function weekdayRank(startDay) {
  const start = Math.max(0, WEEKDAYS.indexOf(startDay));
  const order = [...WEEKDAYS.slice(start), ...WEEKDAYS.slice(0, start)];
  return (label) => {
    const index = order.indexOf(label);
    return index === -1 ? 99 : index;
  };
}

function routineNameFor(split) {
  return /routine$/i.test(split.name) ? split.name : `${split.name} Routine`;
}

async function exerciseMap(db, ids, projection) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const docs = await db.collection('exercises').find({ _id: { $in: unique } }).toArray();
  return new Map(
    docs.map((d) => [d._id, Object.fromEntries(projection.map((key) => [key, key === 'id' ? d._id : d[key]]))])
  );
}

async function loadOwnedRoutine(db, user, routineId) {
  const routine = await db.collection('customer_routines').findOne({ _id: routineId });
  if (!routine || (!isAdmin(user) && routine.customer_id !== user._id)) return null;
  return routine;
}

async function loadOwnedSession(db, user, sessionId) {
  const session = await db.collection('workout_sessions').findOne({ _id: sessionId });
  if (!session || (!isAdmin(user) && session.customer_id !== user._id)) return null;
  return session;
}

async function getActiveRoutine(db, customerId) {
  const routine = await db.collection('customer_routines').findOne({ customer_id: customerId, is_active: true });
  if (!routine) return null;
  const items = await db.collection('routine_exercises').find({ routine_id: routine._id }).sort({ position: 1, created_at: 1 }).toArray();
  // Show training days in weekly order, starting from the split's start day.
  const split = routine.split_id ? await db.collection('workout_splits').findOne({ _id: routine.split_id }) : null;
  const dayRank = weekdayRank(split?.start_day);
  items.sort((a, b) => dayRank(a.day_label) - dayRank(b.day_label) || (a.day_label < b.day_label ? -1 : a.day_label > b.day_label ? 1 : 0) || a.position - b.position);
  const exercises = await exerciseMap(db, items.map((i) => i.exercise_id), ['id', 'name', 'muscle_group', 'difficulty']);
  const result = out(routine);
  result.routine_exercises = items.map((i) => ({
    id: i._id,
    exercise_id: i.exercise_id,
    day_label: i.day_label,
    position: i.position,
    sets: i.sets,
    reps: i.reps,
    target_weight_kg: i.target_weight_kg ?? null,
    exercises: exercises.get(i.exercise_id) ?? null,
  }));
  return result;
}

async function requireCustomer(db, customerId, message) {
  const customer = await db.collection('users').findOne({ _id: customerId, role: 'customer' });
  if (!customer) throw new AppError(message, '22023');
  return customer;
}

// Picks one row per exercise from a split (earliest day, then position), active exercises only.
async function splitSelection(db, splitId, session) {
  const rows = await db.collection('workout_split_exercises').find({ split_id: splitId }, { session }).toArray();
  const activeIds = new Set(
    (await db.collection('exercises').find({ _id: { $in: rows.map((r) => r.exercise_id) }, is_active: true }, { session }).toArray()).map((e) => e._id)
  );
  const byExercise = new Map();
  for (const row of rows.filter((r) => activeIds.has(r.exercise_id))) {
    const current = byExercise.get(row.exercise_id);
    if (!current || row.day_label < current.day_label || (row.day_label === current.day_label && row.position < current.position)) {
      byExercise.set(row.exercise_id, row);
    }
  }
  return [...byExercise.values()].sort((a, b) => (a.day_label === b.day_label ? a.position - b.position : a.day_label < b.day_label ? -1 : 1));
}

async function createRoutineFromSplit(db, session, { customerId, split, name }) {
  const selection = await splitSelection(db, split._id, session);
  if (!selection.length) throw new AppError('Choose a workout split with active exercises.', '22023');
  const now = nowIso();
  const routineId = newId();
  const items = selection.map((row) => ({
    _id: newId(),
    routine_id: routineId,
    exercise_id: row.exercise_id,
    day_label: row.day_label,
    position: row.position,
    sets: 3,
    reps: 10,
    target_weight_kg: null,
    created_at: now,
    updated_at: now,
  }));
  await db.collection('customer_routines').insertOne(
    {
      _id: routineId,
      customer_id: customerId,
      split_id: split._id,
      name,
      is_active: true,
      original_exercises: items.map(({ exercise_id, day_label, position, sets, reps, target_weight_kg }) => ({
        exercise_id, day_label, position, sets, reps, target_weight_kg,
      })),
      created_at: now,
      updated_at: now,
    },
    { session }
  );
  await db.collection('routine_exercises').insertMany(items, { session });
  return routineId;
}

async function splitsWithActiveExercises(db) {
  const rows = await db.collection('workout_split_exercises').find({}, { projection: { split_id: 1, exercise_id: 1 } }).toArray();
  const active = new Set(
    (await db.collection('exercises').find({ is_active: true }, { projection: { _id: 1 } }).toArray()).map((e) => e._id)
  );
  return [...new Set(rows.filter((r) => active.has(r.exercise_id)).map((r) => r.split_id))];
}

export const workoutHandlers = {
  // ---------- Splits ----------
  'splits.list': {
    auth: 'user',
    run: async ({ db }) => {
      const splits = outAll(await db.collection('workout_splits').find({}).sort({ name: 1 }).toArray());
      const rows = await db.collection('workout_split_exercises').find({}).toArray();
      const exercises = await exerciseMap(db, rows.map((r) => r.exercise_id), ['name', 'muscle_group']);
      for (const split of splits) {
        split.workout_split_exercises = rows
          .filter((r) => r.split_id === split.id)
          .map((r) => ({ id: r._id, day_label: r.day_label, position: r.position, exercise_id: r.exercise_id, exercises: exercises.get(r.exercise_id) ?? null }));
      }
      return splits;
    },
  },

  'splits.save': {
    auth: 'admin',
    duplicate: 'A workout split with this name already exists.',
    run: async ({ db, args }) => {
      const split = args.split ?? {};
      const fields = pick(split, SPLIT_FIELDS);
      if ('name' in fields) fields.name = String(fields.name).trim();
      if (split.id) {
        if (!Object.keys(fields).length) throw invalid('No split fields were provided to update.');
        const error = checkSplitFields(fields);
        if (error) throw invalid(error);
        const res = await db
          .collection('workout_splits')
          .findOneAndUpdate({ _id: split.id }, { $set: { ...fields, updated_at: nowIso() } }, { returnDocument: 'after' });
        if (!res) throw notFound('Split not found, or you do not have permission to change it.');
        return out(res);
      }
      if (!('name' in fields)) throw invalid('Split name is required.');
      const error = checkSplitFields(fields);
      if (error) throw invalid(error);
      const now = nowIso();
      const doc = { _id: newId(), description: '', start_day: 'Saturday', ...fields, created_at: now, updated_at: now };
      await db.collection('workout_splits').insertOne(doc);
      return out(doc);
    },
  },

  'splits.delete': {
    auth: 'admin',
    run: async ({ db, client, args }) => {
      const splitId = args.splitId;
      if (!splitId) throw invalid('Choose a workout split first.');
      await inTransaction(client, async (session) => {
        const res = await db.collection('workout_splits').deleteOne({ _id: splitId }, { session });
        if (!res.deletedCount) throw notFound('Split not found, or you do not have permission to delete it.');
        await db.collection('workout_split_exercises').deleteMany({ split_id: splitId }, { session });
        await db.collection('workout_split_days').deleteMany({ split_id: splitId }, { session });
        await db.collection('customer_routines').updateMany({ split_id: splitId }, { $set: { split_id: null } }, { session });
      });
      return [{ id: splitId }];
    },
  },

  'splits.exercises': {
    auth: 'user',
    run: async ({ db, args }) => {
      const rows = await db.collection('workout_split_exercises').find({ split_id: args.splitId }).sort({ day_label: 1, position: 1 }).toArray();
      const exercises = await exerciseMap(db, rows.map((r) => r.exercise_id), ['id', 'name', 'muscle_group', 'difficulty']);
      return rows.map((r) => ({
        id: r._id, split_id: r.split_id, day_label: r.day_label, position: r.position, exercise_id: r.exercise_id,
        exercises: exercises.get(r.exercise_id) ?? null,
      }));
    },
  },

  'splits.setExercises': {
    auth: 'admin',
    run: async ({ db, client, args }) => {
      const splitId = args.splitId;
      if (!splitId) throw invalid('Choose a workout split first.');
      if (!Array.isArray(args.items)) throw invalid('Split exercises must be a list.');
      const days = await db.collection('workout_split_days').find({ split_id: splitId }).toArray();
      const groupsByDay = new Map(days.filter((d) => !d.is_rest).map((d) => [d.day_name, d.muscle_groups]));
      const exercises = await exerciseMap(db, args.items.map((i) => i?.exercise_id), ['muscle_group']);
      const seen = new Set();
      const now = nowIso();
      const docs = [];
      for (const item of args.items) {
        const dayLabel = String(item?.day_label ?? '').trim();
        if (dayLabel.length < 1 || dayLabel.length > 40) throw invalid('Each split exercise needs a day label of 1 to 40 characters.');
        if (!item?.exercise_id) throw invalid('Each split exercise needs an exercise.');
        const exercise = exercises.get(item.exercise_id);
        if (!exercise) throw invalid('One of the chosen exercises no longer exists.');
        const allowed = groupsByDay.get(dayLabel);
        if (!allowed) throw new AppError('Put this exercise on a training day of the weekly plan first.', '22023');
        if (!allowed.includes(exercise.muscle_group)) throw new AppError(`This exercise does not match the muscle groups of ${dayLabel}.`, '22023');
        const key = `${dayLabel}|${item.exercise_id}`;
        if (seen.has(key)) throw new AppError('The same exercise appears twice on one split day.', '23505');
        seen.add(key);
        docs.push({
          _id: newId(), split_id: splitId, day_label: dayLabel, exercise_id: item.exercise_id,
          position: Number.isInteger(item.position) && item.position >= 0 ? item.position : 0, created_at: now,
        });
      }
      await inTransaction(client, async (session) => {
        await db.collection('workout_split_exercises').deleteMany({ split_id: splitId }, { session });
        if (docs.length) await db.collection('workout_split_exercises').insertMany(docs, { session });
      });
      return null;
    },
  },

  'splitDays.list': {
    auth: 'user',
    run: async ({ db }) => outAll(await db.collection('workout_split_days').find({}).sort({ day_name: 1 }).toArray()),
  },

  'splitDays.save': {
    auth: 'admin',
    run: async ({ db, client, args }) => {
      const splitId = args.splitId;
      const days = args.days;
      if (!splitId) throw invalid('Choose a workout split first.');
      if (!Array.isArray(days) || days.length !== 7) throw invalid('A weekly plan needs exactly 7 days.');
      if (!(await db.collection('workout_splits').findOne({ _id: splitId }))) throw notFound('Split not found.');
      const names = new Set();
      let restCount = 0;
      const docs = days.map((d) => {
        const dayName = String(d?.day_name ?? '');
        if (!WEEKDAYS.includes(dayName) || names.has(dayName)) throw invalid('Each weekday must appear exactly once.');
        names.add(dayName);
        const isRest = Boolean(d?.is_rest);
        if (isRest) restCount += 1;
        const groups = isRest ? [] : [...new Set((Array.isArray(d?.muscle_groups) ? d.muscle_groups : []).map(String))];
        if (!isRest && (groups.length < 1 || groups.length > 2)) throw invalid(`Choose 1 or 2 muscle groups for ${dayName}.`);
        if (groups.some((g) => !MUSCLE_GROUPS.includes(g))) throw invalid('Choose valid muscle groups.');
        return { _id: newId(), split_id: splitId, day_name: dayName, is_rest: isRest, muscle_groups: groups };
      });
      if (restCount !== 1) throw new AppError('Choose exactly one rest day.', '22023');
      await inTransaction(client, async (session) => {
        await db.collection('workout_split_days').deleteMany({ split_id: splitId }, { session });
        await db.collection('workout_split_days').insertMany(docs, { session });
      });
      return null;
    },
  },

  // ---------- Routines ----------
  'routines.active': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      if (!isAdmin(user) && args.customerId !== user._id) return null;
      return getActiveRoutine(db, args.customerId);
    },
  },

  'routines.listAll': {
    auth: 'admin',
    run: async ({ db }) => {
      const routines = outAll(await db.collection('customer_routines').find({}).sort({ created_at: -1 }).toArray());
      await attach(db, routines, { field: 'customer_id', collection: 'users', as: 'profiles', project: ['full_name'] });
      await attach(db, routines, { field: 'split_id', collection: 'workout_splits', as: 'workout_splits', project: ['name'] });
      const items = routines.length
        ? await db.collection('routine_exercises').find({ routine_id: { $in: routines.map((r) => r.id) } }).toArray()
        : [];
      const exercises = await exerciseMap(db, items.map((i) => i.exercise_id), ['name']);
      for (const routine of routines) {
        delete routine.original_exercises;
        routine.routine_exercises = items
          .filter((i) => i.routine_id === routine.id)
          .map((i) => ({ id: i._id, day_label: i.day_label, position: i.position, sets: i.sets, reps: i.reps, exercises: exercises.get(i.exercise_id) ?? null }));
      }
      return routines;
    },
  },

  'routines.create': {
    auth: 'user',
    duplicate: 'This customer already has an active routine.',
    run: async ({ db, user, args }) => {
      const fields = pick(args.input, ['customer_id', 'split_id', 'name']);
      if (!fields.customer_id) throw invalid('A customer is required.');
      if (!isAdmin(user) && fields.customer_id !== user._id) throw forbidden('You can only create your own routine.');
      const name = String(fields.name || 'My routine').trim();
      if (name.length < 1 || name.length > 120) throw invalid('Routine name must be 1 to 120 characters.');
      const now = nowIso();
      const doc = {
        _id: newId(), customer_id: fields.customer_id, split_id: fields.split_id ?? null, name, is_active: true,
        original_exercises: [], created_at: now, updated_at: now,
      };
      await db.collection('customer_routines').insertOne(doc);
      return out(doc);
    },
  },

  'routines.delete': {
    auth: 'user',
    run: async ({ db, client, user, args }) => {
      if (!args.routineId) throw invalid('Choose a routine first.');
      const routine = await loadOwnedRoutine(db, user, args.routineId);
      if (!routine) throw notFound('Routine not found, or you do not have permission to delete it.');
      await inTransaction(client, async (session) => {
        const items = await db.collection('routine_exercises').find({ routine_id: routine._id }, { session, projection: { _id: 1 } }).toArray();
        const itemIds = items.map((i) => i._id);
        if (itemIds.length) {
          await db.collection('workout_logs').updateMany({ routine_exercise_id: { $in: itemIds } }, { $set: { routine_exercise_id: null } }, { session });
        }
        await db.collection('routine_exercises').deleteMany({ routine_id: routine._id }, { session });
        await db.collection('workout_sessions').updateMany({ routine_id: routine._id }, { $set: { routine_id: null } }, { session });
        await db.collection('customer_routines').deleteOne({ _id: routine._id }, { session });
      });
      return [{ id: routine._id }];
    },
  },

  'routines.assign': {
    auth: 'admin',
    duplicate: 'This customer already has an active routine.',
    run: async ({ db, client, args }) => {
      const { customerId, splitId } = args;
      if (!customerId || !splitId) throw invalid('A customer and a workout split are required.');
      await requireCustomer(db, customerId, 'Routines can only be assigned to customer accounts.');
      const split = await db.collection('workout_splits').findOne({ _id: splitId });
      if (!split) throw new AppError('Choose a workout split with active exercises.', '22023');
      const name = String(args.name ?? '').trim() || routineNameFor(split);
      if (name.length > 120) throw invalid('Routine name must be 120 characters or fewer.');
      return inTransaction(client, async (session) => {
        if (await db.collection('customer_routines').findOne({ customer_id: customerId, is_active: true }, { session })) {
          throw new AppError('This customer already has an active routine.', '23505');
        }
        return createRoutineFromSplit(db, session, { customerId, split, name });
      });
    },
  },

  'routines.generate': {
    auth: 'user',
    run: async ({ db, client, user, args }) => {
      const customerId = args.customerId;
      if (!customerId) throw invalid('A customer is required.');
      if (!isAdmin(user) && customerId !== user._id) throw forbidden('You can only generate a routine for your own account.');
      await requireCustomer(db, customerId, 'Routines can only be generated for customer accounts.');
      const regenerate = Boolean(args.regenerate);
      await inTransaction(client, async (session) => {
        const current = await db.collection('customer_routines').findOne({ customer_id: customerId, is_active: true }, { session });
        if (current && !regenerate) return;
        const candidates = await splitsWithActiveExercises(db);
        if (!candidates.length) throw new AppError('No workout split with active exercises is available yet.', '22023');
        const splitId = candidates[Math.floor(Math.random() * candidates.length)];
        const split = await db.collection('workout_splits').findOne({ _id: splitId }, { session });
        if (current) {
          await db.collection('customer_routines').updateOne({ _id: current._id }, { $set: { is_active: false, updated_at: nowIso() } }, { session });
        }
        await createRoutineFromSplit(db, session, { customerId, split, name: routineNameFor(split) });
      });
      return getActiveRoutine(db, customerId);
    },
  },

  'routines.restore': {
    auth: 'user',
    run: async ({ db, client, user, args }) => {
      if (!args.routineId) throw invalid('An active routine is required.');
      const routine = await db.collection('customer_routines').findOne({ _id: args.routineId, is_active: true });
      if (!routine) throw new AppError('Active routine not found.', 'P0002');
      if (!isAdmin(user) && routine.customer_id !== user._id) throw forbidden('You can only restore your own routine.');
      const original = Array.isArray(routine.original_exercises) ? routine.original_exercises : null;
      if (!original) throw new AppError('The routine has no saved original version.', '22023');
      const now = nowIso();
      await inTransaction(client, async (session) => {
        const items = await db.collection('routine_exercises').find({ routine_id: routine._id }, { session, projection: { _id: 1 } }).toArray();
        if (items.length) {
          await db.collection('workout_logs').updateMany({ routine_exercise_id: { $in: items.map((i) => i._id) } }, { $set: { routine_exercise_id: null } }, { session });
        }
        await db.collection('routine_exercises').deleteMany({ routine_id: routine._id }, { session });
        if (original.length) {
          await db.collection('routine_exercises').insertMany(
            original.map((item) => ({
              _id: newId(), routine_id: routine._id, exercise_id: item.exercise_id, day_label: item.day_label ?? '',
              position: item.position ?? 0, sets: item.sets, reps: item.reps, target_weight_kg: item.target_weight_kg ?? null,
              created_at: now, updated_at: now,
            })),
            { session }
          );
        }
      });
      return null;
    },
  },

  'routineExercises.update': {
    auth: 'user',
    duplicate: 'This exercise is already in the routine.',
    run: async ({ db, user, args }) => {
      const fields = normalizeRoutineExercise(pick(args.changes, ROUTINE_EXERCISE_UPDATE_FIELDS));
      if (!Object.keys(fields).length) throw invalid('No routine exercise fields were provided to update.');
      const error = checkRoutineExerciseFields(fields);
      if (error) throw invalid(error);
      const item = await db.collection('routine_exercises').findOne({ _id: args.id });
      const routine = item ? await loadOwnedRoutine(db, user, item.routine_id) : null;
      if (!item || !routine) throw notFound('Routine exercise not found, or you do not have permission to change it.');
      if (fields.exercise_id && !(await db.collection('exercises').findOne({ _id: fields.exercise_id }))) throw invalid('Choose an exercise.');
      const res = await db
        .collection('routine_exercises')
        .findOneAndUpdate({ _id: item._id }, { $set: { ...fields, updated_at: nowIso() } }, { returnDocument: 'after' });
      return out(res);
    },
  },

  'routineExercises.add': {
    auth: 'user',
    duplicate: 'This exercise is already in the routine.',
    run: async ({ db, user, args }) => {
      const fields = normalizeRoutineExercise(pick(args.input, ROUTINE_EXERCISE_FIELDS));
      if (!fields.routine_id || !fields.exercise_id) throw invalid('A routine and an exercise are required.');
      if (!('sets' in fields) || !('reps' in fields)) throw invalid('Sets and reps are required.');
      const error = checkRoutineExerciseFields(fields);
      if (error) throw invalid(error);
      const routine = await loadOwnedRoutine(db, user, fields.routine_id);
      if (!routine) throw forbidden('You can only change your own routine.');
      if (!(await db.collection('exercises').findOne({ _id: fields.exercise_id }))) throw invalid('Choose an exercise.');
      const now = nowIso();
      const doc = { _id: newId(), day_label: '', position: 0, target_weight_kg: null, ...fields, created_at: now, updated_at: now };
      await db.collection('routine_exercises').insertOne(doc);
      return out(doc);
    },
  },

  'routineExercises.remove': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const item = await db.collection('routine_exercises').findOne({ _id: args.id });
      const routine = item ? await loadOwnedRoutine(db, user, item.routine_id) : null;
      if (!item || !routine) throw notFound('Routine exercise not found, or you do not have permission to remove it.');
      await db.collection('workout_logs').updateMany({ routine_exercise_id: item._id }, { $set: { routine_exercise_id: null } });
      await db.collection('routine_exercises').deleteOne({ _id: item._id });
      return [{ id: item._id }];
    },
  },

  // ---------- Sessions and set logs ----------
  'sessions.create': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const fields = pick(args.input, ['customer_id', 'routine_id', 'notes']);
      if (!fields.customer_id) throw invalid('A customer is required.');
      if (!isAdmin(user) && fields.customer_id !== user._id) throw forbidden('You can only start your own workout sessions.');
      if (fields.notes !== undefined && String(fields.notes).length > 1000) throw invalid('Session notes must be 1000 characters or fewer.');
      if (fields.routine_id) {
        const routine = await db.collection('customer_routines').findOne({ _id: fields.routine_id });
        if (!routine || routine.customer_id !== fields.customer_id) throw forbidden('That routine does not belong to this customer.');
      }
      const now = nowIso();
      const doc = {
        _id: newId(), customer_id: fields.customer_id, routine_id: fields.routine_id ?? null, started_at: now, ended_at: null,
        notes: String(fields.notes ?? ''), created_at: now, updated_at: now,
      };
      await db.collection('workout_sessions').insertOne(doc);
      return out(doc);
    },
  },

  'sessions.end': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const filter = { _id: args.sessionId, ended_at: null };
      if (!isAdmin(user)) filter.customer_id = user._id;
      const now = nowIso();
      const res = await db.collection('workout_sessions').findOneAndUpdate(filter, { $set: { ended_at: now, updated_at: now } }, { returnDocument: 'after' });
      if (!res) throw notFound('Session not found, already ended, or not yours.');
      return out(res);
    },
  },

  'sessions.list': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const limit = Number.isInteger(args.limit) && args.limit > 0 && args.limit <= 500 ? args.limit : 20;
      const filter = {};
      if (args.customerId) filter.customer_id = args.customerId;
      if (!isAdmin(user)) filter.customer_id = user._id;
      return outAll(await db.collection('workout_sessions').find(filter).sort({ started_at: -1 }).limit(limit).toArray());
    },
  },

  'logs.create': {
    auth: 'user',
    duplicate: 'This set is already logged for this session.',
    run: async ({ db, user, args }) => {
      const fields = pick(args.input, LOG_FIELDS);
      if (!fields.session_id || !fields.exercise_id) throw invalid('A session and an exercise are required.');
      if (!Number.isInteger(fields.set_number) || fields.set_number < 1 || fields.set_number > 50) throw invalid('Set number must be a whole number from 1 to 50.');
      if (fields.reps != null && !(Number.isInteger(fields.reps) && fields.reps >= 0 && fields.reps <= 500)) throw invalid('Reps must be a whole number from 0 to 500.');
      if (fields.weight_kg != null && !(Number(fields.weight_kg) >= 0)) throw invalid('Weight cannot be negative.');
      if (fields.notes !== undefined && String(fields.notes ?? '').length > 500) throw invalid('Set notes must be 500 characters or fewer.');
      const session = await loadOwnedSession(db, user, fields.session_id);
      if (!session) throw forbidden('You can only log sets in your own sessions.');
      if (fields.routine_exercise_id) {
        const item = await db.collection('routine_exercises').findOne({ _id: fields.routine_exercise_id });
        const routine = item ? await db.collection('customer_routines').findOne({ _id: item.routine_id }) : null;
        if (!routine || routine.customer_id !== session.customer_id) throw forbidden('That routine exercise does not belong to you.');
      }
      if (!(await db.collection('exercises').findOne({ _id: fields.exercise_id }))) throw invalid('Choose an exercise.');
      const now = nowIso();
      const doc = {
        _id: newId(),
        session_id: fields.session_id,
        routine_exercise_id: fields.routine_exercise_id ?? null,
        exercise_id: fields.exercise_id,
        set_number: fields.set_number,
        reps: fields.reps ?? null,
        weight_kg: fields.weight_kg == null ? null : Number(fields.weight_kg),
        completed: Boolean(fields.completed),
        notes: String(fields.notes ?? ''),
        created_at: now,
        updated_at: now,
      };
      await db.collection('workout_logs').insertOne(doc);
      return out(doc);
    },
  },

  'logs.update': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const fields = pick(args.changes, LOG_UPDATE_FIELDS);
      if (!Object.keys(fields).length) throw invalid('No workout log fields were provided to update.');
      if ('reps' in fields && fields.reps != null && !(Number.isInteger(fields.reps) && fields.reps >= 0 && fields.reps <= 500)) throw invalid('Reps must be a whole number from 0 to 500.');
      if ('weight_kg' in fields && fields.weight_kg != null && !(Number(fields.weight_kg) >= 0)) throw invalid('Weight cannot be negative.');
      if ('weight_kg' in fields && fields.weight_kg != null) fields.weight_kg = Number(fields.weight_kg);
      if ('completed' in fields && typeof fields.completed !== 'boolean') throw invalid('Choose whether the set is complete.');
      if ('notes' in fields && String(fields.notes ?? '').length > 500) throw invalid('Set notes must be 500 characters or fewer.');
      const log = await db.collection('workout_logs').findOne({ _id: args.logId });
      const session = log ? await loadOwnedSession(db, user, log.session_id) : null;
      if (!log || !session) throw notFound('Workout log not found, or you do not have permission to change it.');
      const res = await db.collection('workout_logs').findOneAndUpdate({ _id: log._id }, { $set: { ...fields, updated_at: nowIso() } }, { returnDocument: 'after' });
      return out(res);
    },
  },

  'logs.forSession': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      if (!args.sessionId) throw invalid('A workout session is required.');
      const session = await loadOwnedSession(db, user, args.sessionId);
      if (!session) return [];
      const logs = outAll(await db.collection('workout_logs').find({ session_id: session._id }).sort({ created_at: 1 }).toArray());
      const exercises = await exerciseMap(db, logs.map((l) => l.exercise_id), ['name', 'muscle_group']);
      for (const log of logs) log.exercises = exercises.get(log.exercise_id) ?? null;
      return logs;
    },
  },

  'recovery.status': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const customerId = args.customerId;
      const restHours = args.restHours ?? DEFAULT_REST_HOURS;
      if (!customerId) throw invalid('A customer is required.');
      if (!Number.isInteger(restHours) || restHours < 1 || restHours > 168) throw invalid('Recovery time must be between 1 and 168 hours.');
      if (!isAdmin(user) && customerId !== user._id) throw forbidden('You can only view your own recovery.');
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const sessions = await db
        .collection('workout_sessions')
        .find({ customer_id: customerId, ended_at: { $ne: null }, started_at: { $gte: since } })
        .sort({ started_at: -1 })
        .toArray();
      if (!sessions.length) return { restHours, groups: [], restDaySuggested: false };
      const logs = await db.collection('workout_logs').find({ session_id: { $in: sessions.map((s) => s._id) }, completed: true }).toArray();
      const exercises = await exerciseMap(db, logs.map((l) => l.exercise_id), ['name', 'muscle_group']);
      const sessionDates = new Map(sessions.map((s) => [s._id, s.started_at]));
      const latestByGroup = new Map();
      for (const log of logs) {
        const exercise = exercises.get(log.exercise_id);
        const group = exercise?.muscle_group;
        const trainedAt = sessionDates.get(log.session_id);
        if (group && trainedAt && (!latestByGroup.has(group) || trainedAt > latestByGroup.get(group).trainedAt)) {
          latestByGroup.set(group, { muscleGroup: group, exercise: exercise.name, trainedAt });
        }
      }
      const groups = [...latestByGroup.values()]
        .map((g) => {
          const elapsedHours = (Date.now() - new Date(g.trainedAt).getTime()) / 3600000;
          return { ...g, recovered: elapsedHours >= restHours, elapsedHours: Math.max(0, Math.floor(elapsedHours)) };
        })
        .sort((a, b) => a.elapsedHours - b.elapsedHours);
      return { restHours, groups, restDaySuggested: groups.length > 0 && groups.every((g) => !g.recovered) };
    },
  },
};
