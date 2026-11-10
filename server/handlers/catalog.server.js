// Exercise library and gym equipment. Everyone signed in can read; only admins can change.
import { invalid, notFound, out, outAll, pick, newId, nowIso, escapeRegex, inTransaction, AppError } from '../db.server.js';

export const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core', 'full_body', 'cardio'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const EQUIPMENT_STATUSES = ['available', 'busy', 'maintenance'];
const EXERCISE_FIELDS = ['name', 'muscle_group', 'difficulty', 'description', 'is_active'];
const EQUIPMENT_FIELDS = ['name', 'category', 'status', 'notes'];

function checkExerciseFields(fields) {
  if ('name' in fields && String(fields.name ?? '').trim().length < 2) return 'Exercise name must be at least 2 characters.';
  if ('name' in fields && String(fields.name ?? '').trim().length > 120) return 'Exercise name must be 120 characters or fewer.';
  if ('muscle_group' in fields && !MUSCLE_GROUPS.includes(fields.muscle_group)) return 'Choose a valid muscle group.';
  if ('difficulty' in fields && !DIFFICULTIES.includes(fields.difficulty)) return 'Choose a valid difficulty.';
  if ('description' in fields && String(fields.description ?? '').length > 2000) return 'Description must be 2000 characters or fewer.';
  if ('is_active' in fields && typeof fields.is_active !== 'boolean') return 'Choose whether the exercise is active.';
  return null;
}

function checkEquipmentFields(fields) {
  if ('name' in fields && String(fields.name ?? '').trim().length < 2) return 'Equipment name must be at least 2 characters.';
  if ('name' in fields && String(fields.name ?? '').trim().length > 120) return 'Equipment name must be 120 characters or fewer.';
  if ('category' in fields && String(fields.category ?? '').length > 60) return 'Category must be 60 characters or fewer.';
  if ('status' in fields && !EQUIPMENT_STATUSES.includes(fields.status)) return 'Choose a valid equipment status.';
  if ('notes' in fields && String(fields.notes ?? '').length > 1000) return 'Notes must be 1000 characters or fewer.';
  return null;
}

function trimName(fields) {
  if ('name' in fields) fields.name = String(fields.name).trim();
  return fields;
}

async function updateOne(db, collection, id, fields, missing) {
  const res = await db
    .collection(collection)
    .findOneAndUpdate({ _id: id }, { $set: { ...fields, updated_at: nowIso() } }, { returnDocument: 'after' });
  if (!res) throw notFound(missing);
  return out(res);
}

export const catalogHandlers = {
  // ---------- Exercises ----------
  'exercises.list': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const filter = {};
      if (args.muscleGroup) filter.muscle_group = args.muscleGroup;
      const search = String(args.search ?? '').trim();
      if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };
      // Customers only ever see active exercises.
      if (!(args.includeInactive && user.role === 'admin')) filter.is_active = true;
      return outAll(await db.collection('exercises').find(filter).sort({ name: 1 }).toArray());
    },
  },

  'exercises.get': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const doc = await db.collection('exercises').findOne({ _id: args.id });
      if (!doc || (!doc.is_active && user.role !== 'admin')) throw notFound('Exercise not found.');
      return out(doc);
    },
  },

  'exercises.create': {
    auth: 'admin',
    duplicate: 'An exercise with this name already exists.',
    run: async ({ db, args }) => {
      const fields = trimName(pick(args.input, EXERCISE_FIELDS));
      const error = checkExerciseFields({ name: '', muscle_group: '', ...fields });
      if (error) throw invalid(error);
      const now = nowIso();
      const doc = {
        _id: newId(),
        difficulty: 'beginner',
        description: '',
        is_active: true,
        ...fields,
        created_at: now,
        updated_at: now,
      };
      await db.collection('exercises').insertOne(doc);
      return out(doc);
    },
  },

  'exercises.update': {
    auth: 'admin',
    duplicate: 'An exercise with this name already exists.',
    run: async ({ db, args }) => {
      const fields = trimName(pick(args.changes, EXERCISE_FIELDS));
      if (!Object.keys(fields).length) throw invalid('No exercise fields were provided to update.');
      const error = checkExerciseFields(fields);
      if (error) throw invalid(error);
      return updateOne(db, 'exercises', args.id, fields, 'Exercise not found, or you do not have permission to change it.');
    },
  },

  'exercises.delete': {
    auth: 'admin',
    run: async ({ db, args }) => {
      const id = args.id;
      const [inSplits, inRoutines, inLogs] = await Promise.all([
        db.collection('workout_split_exercises').countDocuments({ exercise_id: id }, { limit: 1 }),
        db.collection('routine_exercises').countDocuments({ exercise_id: id }, { limit: 1 }),
        db.collection('workout_logs').countDocuments({ exercise_id: id }, { limit: 1 }),
      ]);
      if (inSplits || inRoutines || inLogs) {
        throw new AppError('This exercise is used in workout history or split plans. Deactivate it instead of deleting it.', '23503');
      }
      const res = await db.collection('exercises').deleteOne({ _id: id });
      if (!res.deletedCount) throw notFound('Exercise not found, or you do not have permission to delete it.');
      await db.collection('exercise_equipment').deleteMany({ exercise_id: id });
      return [{ id }];
    },
  },

  // ---------- Equipment ----------
  'equipment.list': {
    auth: 'user',
    run: async ({ db, args }) => {
      const filter = {};
      if (args.status) filter.status = args.status;
      const search = String(args.search ?? '').trim();
      if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };
      return outAll(await db.collection('equipment').find(filter).sort({ name: 1 }).toArray());
    },
  },

  'equipment.create': {
    auth: 'admin',
    duplicate: 'Equipment with this name already exists.',
    run: async ({ db, args }) => {
      const fields = trimName(pick(args.input, EQUIPMENT_FIELDS));
      const error = checkEquipmentFields({ name: '', ...fields });
      if (error) throw invalid(error);
      const now = nowIso();
      const doc = { _id: newId(), category: 'general', status: 'available', notes: '', ...fields, created_at: now, updated_at: now };
      await db.collection('equipment').insertOne(doc);
      return out(doc);
    },
  },

  'equipment.update': {
    auth: 'admin',
    duplicate: 'Equipment with this name already exists.',
    run: async ({ db, args }) => {
      const fields = trimName(pick(args.changes, EQUIPMENT_FIELDS));
      if (!Object.keys(fields).length) throw invalid('No equipment fields were provided to update.');
      const error = checkEquipmentFields(fields);
      if (error) throw invalid(error);
      return updateOne(db, 'equipment', args.id, fields, 'Equipment not found, or you do not have permission to change it.');
    },
  },

  'equipment.setStatus': {
    auth: 'admin',
    run: async ({ db, args }) => {
      if (!EQUIPMENT_STATUSES.includes(args.status)) throw invalid('Choose a valid equipment status.');
      return updateOne(db, 'equipment', args.id, { status: args.status }, 'Equipment not found, or you do not have permission to change it.');
    },
  },

  'equipment.delete': {
    auth: 'admin',
    run: async ({ db, args }) => {
      const res = await db.collection('equipment').deleteOne({ _id: args.id });
      if (!res.deletedCount) throw notFound('Equipment not found, or you do not have permission to delete it.');
      await db.collection('exercise_equipment').deleteMany({ equipment_id: args.id });
      return [{ id: args.id }];
    },
  },

  'equipment.forExercise': {
    auth: 'user',
    run: async ({ db, args }) => {
      const links = await db.collection('exercise_equipment').find({ exercise_id: args.exerciseId }).toArray();
      const equipment = links.length
        ? await db.collection('equipment').find({ _id: { $in: links.map((l) => l.equipment_id) } }).toArray()
        : [];
      const byId = new Map(equipment.map((e) => [e._id, e]));
      return links.map((l) => {
        const e = byId.get(l.equipment_id);
        return {
          exercise_id: l.exercise_id,
          equipment_id: l.equipment_id,
          equipment: e ? { id: e._id, name: e.name, category: e.category, status: e.status } : null,
        };
      });
    },
  },

  'equipment.setForExercise': {
    auth: 'admin',
    run: async ({ db, client, args }) => {
      if (!args.exerciseId) throw invalid('Choose an exercise first.');
      if (!Array.isArray(args.equipmentIds)) throw invalid('Equipment must be a list of IDs.');
      const ids = [...new Set(args.equipmentIds.map(String))];
      const found = ids.length ? await db.collection('equipment').countDocuments({ _id: { $in: ids } }) : 0;
      if (found !== ids.length) throw invalid('One of the chosen equipment items no longer exists.');
      const now = nowIso();
      await inTransaction(client, async (session) => {
        await db.collection('exercise_equipment').deleteMany({ exercise_id: args.exerciseId }, { session });
        if (ids.length) {
          await db.collection('exercise_equipment').insertMany(
            ids.map((equipment_id) => ({ _id: newId(), exercise_id: args.exerciseId, equipment_id, created_at: now })),
            { session }
          );
        }
      });
      return null;
    },
  },

  'equipment.alternatives': {
    auth: 'user',
    run: async ({ db, args }) => {
      const exerciseId = args.exerciseId;
      if (!exerciseId) throw invalid('Choose an exercise first.');
      const original = await db.collection('exercises').findOne({ _id: exerciseId });
      if (!original) throw invalid('Exercise not found.');
      const candidates = await db
        .collection('exercises')
        .find({ muscle_group: original.muscle_group, is_active: true, _id: { $ne: exerciseId } })
        .sort({ name: 1 })
        .toArray();
      if (!candidates.length) return [];
      const links = await db.collection('exercise_equipment').find({ exercise_id: { $in: candidates.map((c) => c._id) } }).toArray();
      const equipment = links.length
        ? await db.collection('equipment').find({ _id: { $in: [...new Set(links.map((l) => l.equipment_id))] } }).toArray()
        : [];
      const statusById = new Map(equipment.map((e) => [e._id, e.status]));
      const requirements = new Map();
      for (const link of links) {
        const list = requirements.get(link.exercise_id) || [];
        list.push(statusById.get(link.equipment_id));
        requirements.set(link.exercise_id, list);
      }
      return candidates
        .filter((c) => (requirements.get(c._id) || []).every((status) => status === 'available'))
        .map((c) => ({ id: c._id, name: c.name, muscle_group: c.muscle_group, difficulty: c.difficulty }));
    },
  },
};
