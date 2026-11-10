import { AppError, invalid, notFound, out, outAll, nowIso, escapeRegex, attach } from '../db.server.js';

const AVATAR_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function profileOf(user) {
  if (!user) return null;
  return {
    id: user._id,
    full_name: user.full_name,
    role: user.role,
    created_at: user.created_at,
    avatar_path: user.avatar_path ?? null,
  };
}

const PROFILE_PROJECTION = { projection: { full_name: 1, role: 1, created_at: 1, avatar_path: 1 } };

export const profileHandlers = {
  'profile.me': {
    auth: 'user',
    run: async ({ user }) => profileOf(user),
  },

  'profile.update': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const fullName = String(args.fullName ?? '').trim();
      if (!fullName) throw invalid('Full name is required.');
      if (fullName.length > 120) throw invalid('Full name must be 120 characters or fewer.');
      await db.collection('users').updateOne({ _id: user._id }, { $set: { full_name: fullName, updated_at: nowIso() } });
      return profileOf({ ...user, full_name: fullName });
    },
  },

  'profile.avatarUrl': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      // Admins can request a customer's photo by passing userId. Everyone else gets their own photo only.
      let target = user;
      const requestedId = args?.userId;
      if (requestedId && String(requestedId) !== String(user._id)) {
        if (user.role !== 'admin') throw notFound('Photo not found.');
        target = await db.collection('users').findOne({ _id: requestedId, role: 'customer' });
        if (!target) throw notFound('Customer not found.');
      }
      if (!target.avatar_path) return null;
      const avatar = await db.collection('avatars').findOne({ _id: target._id });
      return avatar ? `data:${avatar.content_type};base64,${avatar.data}` : null;
    },
  },

  'profile.uploadAvatar': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const contentType = String(args.contentType ?? '');
      const extension = AVATAR_TYPES[contentType];
      if (!extension) throw invalid('Use a JPG, PNG, or WebP image.');
      const data = String(args.base64 ?? '');
      if (!data || !/^[A-Za-z0-9+/=]+$/.test(data)) throw invalid('Choose an image first.');
      const bytes = Math.floor((data.length * 3) / 4);
      if (bytes > AVATAR_MAX_BYTES) throw invalid('Images must be 2 MB or smaller.');
      const path = `${user._id}/avatar-${Date.now()}.${extension}`;
      await db.collection('avatars').updateOne(
        { _id: user._id },
        { $set: { content_type: contentType, data, updated_at: nowIso() } },
        { upsert: true }
      );
      await db.collection('users').updateOne({ _id: user._id }, { $set: { avatar_path: path, updated_at: nowIso() } });
      return { avatar_path: path };
    },
  },

  'profile.removeAvatar': {
    auth: 'user',
    run: async ({ db, user }) => {
      await db.collection('users').updateOne({ _id: user._id }, { $set: { avatar_path: null, updated_at: nowIso() } });
      await db.collection('avatars').deleteOne({ _id: user._id });
      return { avatar_path: null };
    },
  },

  'customers.list': {
    auth: 'admin',
    run: async ({ db, args }) => {
      const filter = { role: 'customer' };
      const search = String(args.search ?? '').trim();
      if (search) filter.full_name = { $regex: escapeRegex(search), $options: 'i' };
      const rows = await db.collection('users').find(filter, PROFILE_PROJECTION).sort({ full_name: 1 }).toArray();
      return outAll(rows);
    },
  },

  'customers.details': {
    auth: 'admin',
    run: async ({ db, args }) => {
      const customerId = args.customerId;
      if (!customerId) throw invalid('A customer is required.');
      const profile = await db.collection('users').findOne({ _id: customerId, role: 'customer' }, PROFILE_PROJECTION);
      if (!profile) throw notFound('Customer not found.');

      const [routines, memberships, payments, attendance, measurements, sessions] = await Promise.all([
        db.collection('customer_routines').find({ customer_id: customerId }).sort({ created_at: -1 }).toArray(),
        db.collection('memberships').find({ customer_id: customerId }).sort({ start_date: -1 }).toArray(),
        db.collection('payments').find({ customer_id: customerId }).sort({ created_at: -1 }).toArray(),
        db.collection('attendance').find({ customer_id: customerId }).sort({ check_date: -1 }).limit(30).toArray(),
        db.collection('fitness_measurements').find({ customer_id: customerId }).sort({ measured_on: -1 }).limit(30).toArray(),
        db.collection('workout_sessions').find({ customer_id: customerId }).sort({ started_at: -1 }).limit(30).toArray(),
      ]);

      const routineRows = outAll(routines);
      await attach(db, routineRows, { field: 'split_id', collection: 'workout_splits', as: 'workout_splits', project: ['name'] });
      const routineIds = routineRows.map((r) => r.id);
      const items = routineIds.length
        ? await db.collection('routine_exercises').find({ routine_id: { $in: routineIds } }, { projection: { routine_id: 1 } }).toArray()
        : [];
      for (const routine of routineRows) {
        routine.routine_exercises = items.filter((i) => i.routine_id === routine.id).map((i) => ({ id: i._id }));
      }

      const membershipRows = outAll(memberships);
      await attach(db, membershipRows, {
        field: 'plan_id', collection: 'membership_plans', as: 'membership_plans', project: ['name', 'price', 'duration_days'],
      });

      return {
        profile: out(profile),
        routines: routineRows,
        memberships: membershipRows,
        payments: outAll(payments),
        attendance: outAll(attendance),
        measurements: outAll(measurements),
        sessions: outAll(sessions),
      };
    },
  },
};

export function assertSelfOrAdmin(user, customerId, message = 'You can only access your own records.') {
  if (user.role === 'admin') return;
  if (customerId !== user._id) throw new AppError(message, '42501');
}
