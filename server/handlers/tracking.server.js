// Attendance check-ins, body measurements, and progress charts.
import { AppError, invalid, notFound, forbidden, out, outAll, pick, newId, nowIso, today, attach } from '../db.server.js';

const MEASUREMENT_FIELDS = ['customer_id', 'measured_on', 'body_weight_kg', 'chest_cm', 'waist_cm', 'hips_cm', 'arm_cm', 'thigh_cm', 'notes'];
const MEASURED_VALUES = ['body_weight_kg', 'chest_cm', 'waist_cm', 'hips_cm', 'arm_cm', 'thigh_cm'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const isAdmin = (user) => user.role === 'admin';

function dateRange(field, fromDate, toDate) {
  const range = {};
  if (fromDate) range.$gte = fromDate;
  if (toDate) range.$lte = toDate;
  return Object.keys(range).length ? { [field]: range } : {};
}

async function listMeasurements(db, user, args) {
  const filter = { ...dateRange('measured_on', args.fromDate, args.toDate) };
  if (args.customerId) filter.customer_id = args.customerId;
  if (!isAdmin(user)) filter.customer_id = user._id;
  return outAll(await db.collection('fitness_measurements').find(filter).sort({ measured_on: 1 }).toArray());
}

export const trackingHandlers = {
  'attendance.checkIn': {
    auth: 'user',
    duplicate: 'You have already checked in today.',
    run: async ({ db, user, args }) => {
      const customerId = args.customerId;
      if (!customerId) throw invalid('A customer is required.');
      const date = today();
      if (!isAdmin(user)) {
        if (customerId !== user._id) throw forbidden('Check-in needs an active membership that covers today.');
        const covered = await db.collection('memberships').findOne({
          customer_id: user._id, status: 'active', start_date: { $lte: date }, end_date: { $gte: date },
        });
        if (!covered) throw new AppError('Check-in needs an active membership that covers today.', '42501');
      }
      const now = nowIso();
      const doc = { _id: newId(), customer_id: customerId, check_date: date, checked_in_at: now, created_at: now };
      await db.collection('attendance').insertOne(doc);
      return out(doc);
    },
  },

  'attendance.list': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const filter = { ...dateRange('check_date', args.fromDate, args.toDate) };
      if (args.customerId) filter.customer_id = args.customerId;
      if (!isAdmin(user)) filter.customer_id = user._id;
      const rows = outAll(await db.collection('attendance').find(filter).sort({ check_date: -1 }).toArray());
      return attach(db, rows, { field: 'customer_id', collection: 'users', as: 'profiles', project: ['full_name'] });
    },
  },

  'attendance.delete': {
    auth: 'admin',
    run: async ({ db, args }) => {
      if (!args.attendanceId) throw invalid('Choose an attendance record first.');
      const res = await db.collection('attendance').deleteOne({ _id: args.attendanceId });
      if (!res.deletedCount) throw notFound('Attendance record not found, or you do not have permission to delete it.');
      return [{ id: args.attendanceId }];
    },
  },

  'measurements.add': {
    auth: 'user',
    duplicate: 'A measurement for this date already exists.',
    run: async ({ db, user, args }) => {
      const fields = pick(args.input, MEASUREMENT_FIELDS);
      if (!fields.customer_id) throw invalid('A customer is required.');
      if (!isAdmin(user) && fields.customer_id !== user._id) throw forbidden('You can only add your own measurements.');
      const present = MEASURED_VALUES.filter((key) => fields[key] !== undefined && fields[key] !== null && fields[key] !== '');
      if (!present.length) throw invalid('Enter at least one measurement.');
      for (const key of present) {
        if (!(Number(fields[key]) > 0)) throw invalid('Measurements must be greater than zero.');
      }
      if (fields.notes !== undefined && String(fields.notes ?? '').length > 500) throw invalid('Notes must be 500 characters or fewer.');
      const measuredOn = fields.measured_on || today();
      if (!DATE_PATTERN.test(measuredOn)) throw invalid('Choose a valid date.');
      const now = nowIso();
      const doc = { _id: newId(), customer_id: fields.customer_id, measured_on: measuredOn, notes: String(fields.notes ?? ''), created_at: now, updated_at: now };
      for (const key of MEASURED_VALUES) doc[key] = present.includes(key) ? Number(fields[key]) : null;
      await db.collection('fitness_measurements').insertOne(doc);
      return out(doc);
    },
  },

  'measurements.list': {
    auth: 'user',
    run: async ({ db, user, args }) => listMeasurements(db, user, args),
  },

  'progress.series': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const metric = args.metric || 'body_weight_kg';
      if (!args.customerId) throw invalid('A customer is required.');
      if (!MEASURED_VALUES.includes(metric)) throw invalid('Choose a valid measurement to chart.');
      const rows = await listMeasurements(db, user, { customerId: args.customerId });
      return rows.filter((m) => m[metric] != null).map((m) => ({ date: m.measured_on, value: Number(m[metric]) }));
    },
  },

  'progress.performance': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const customerId = args.customerId;
      const limit = args.limit ?? 100;
      if (!customerId) throw invalid('A customer is required.');
      if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw invalid('Result limit must be from 1 to 500.');
      if (!isAdmin(user) && customerId !== user._id) return [];
      const sessions = await db
        .collection('workout_sessions')
        .find({ customer_id: customerId, ended_at: { $ne: null } })
        .sort({ started_at: -1 })
        .toArray();
      if (!sessions.length) return [];
      const sessionById = new Map(sessions.map((s) => [s._id, s]));
      const filter = { session_id: { $in: sessions.map((s) => s._id) }, completed: true };
      if (args.exerciseId) filter.exercise_id = args.exerciseId;
      const logs = await db.collection('workout_logs').find(filter).toArray();
      const exerciseIds = [...new Set(logs.map((l) => l.exercise_id))];
      const exercises = exerciseIds.length ? await db.collection('exercises').find({ _id: { $in: exerciseIds } }).toArray() : [];
      const exerciseById = new Map(exercises.map((e) => [e._id, e]));
      return logs
        .filter((l) => exerciseById.has(l.exercise_id))
        .sort((a, b) => {
          const sa = sessionById.get(a.session_id).started_at;
          const sb = sessionById.get(b.session_id).started_at;
          return sa === sb ? 0 : sa < sb ? 1 : -1;
        })
        .slice(0, limit)
        .map((l) => {
          const s = sessionById.get(l.session_id);
          const e = exerciseById.get(l.exercise_id);
          return {
            id: l._id,
            exercise_id: l.exercise_id,
            set_number: l.set_number,
            reps: l.reps,
            weight_kg: l.weight_kg,
            created_at: l.created_at,
            exercises: { name: e.name, muscle_group: e.muscle_group },
            workout_sessions: { customer_id: s.customer_id, started_at: s.started_at, ended_at: s.ended_at },
          };
        });
    },
  },
};
