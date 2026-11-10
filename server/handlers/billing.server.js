// Membership plans, memberships, payments, and bKash purchase requests.
import { membershipEndDate } from '../rules.js';
import { AppError, invalid, notFound, out, outAll, pick, newId, nowIso, today, addDays, attach, inTransaction } from '../db.server.js';

const PLAN_FIELDS = ['name', 'price', 'duration_days', 'description', 'is_active'];
const MEMBERSHIP_STATUSES = ['scheduled', 'active', 'expired', 'cancelled'];
const PAYMENT_STATUSES = ['paid', 'pending', 'overdue', 'waived'];
const PAYMENT_FIELDS = ['customer_id', 'membership_id', 'amount', 'status', 'due_date', 'paid_at', 'note'];
const BKASH_NUMBER_PATTERN = /^01[0-9]{9}$/;
const TRANSACTION_PATTERN = /^[A-Za-z0-9]{6,30}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isAdmin = (user) => user.role === 'admin';

function checkPlanFields(fields) {
  if ('name' in fields && String(fields.name ?? '').trim().length < 2) return 'Plan name must be at least 2 characters.';
  if ('name' in fields && String(fields.name ?? '').trim().length > 120) return 'Plan name must be 120 characters or fewer.';
  if ('price' in fields && (fields.price === null || !(Number(fields.price) >= 0))) return 'Price cannot be negative.';
  if ('duration_days' in fields) {
    const d = fields.duration_days;
    if (!(Number.isInteger(d) && d >= 1 && d <= 3650)) return 'Duration must be a whole number of days from 1 to 3650.';
  }
  if ('description' in fields && String(fields.description ?? '').length > 1000) return 'Description must be 1000 characters or fewer.';
  if ('is_active' in fields && typeof fields.is_active !== 'boolean') return 'Choose whether the plan is active.';
  return null;
}

function normalizePlan(fields) {
  if ('name' in fields) fields.name = String(fields.name).trim();
  if ('price' in fields) fields.price = Math.round(Number(fields.price) * 100) / 100;
  return fields;
}

// Expires finished memberships and starts scheduled ones when their date comes.
export async function refreshMembershipStatuses(db, session) {
  const memberships = db.collection('memberships');
  const date = today();
  for (let i = 0; i < 50; i += 1) {
    await memberships.updateMany({ status: 'active', end_date: { $lt: date } }, { $set: { status: 'expired', updated_at: nowIso() } }, { session });
    const due = await memberships.find({ status: 'scheduled', start_date: { $lte: date } }, { session }).sort({ customer_id: 1, start_date: 1 }).toArray();
    let changed = 0;
    const seen = new Set();
    for (const m of due) {
      if (seen.has(m.customer_id)) continue;
      seen.add(m.customer_id);
      const active = await memberships.findOne({ customer_id: m.customer_id, status: 'active' }, { session });
      if (active) continue;
      await memberships.updateOne({ _id: m._id }, { $set: { status: 'active', updated_at: nowIso() } }, { session });
      changed += 1;
    }
    if (!changed) break;
  }
}

async function withCustomerNames(db, rows) {
  return attach(db, rows, { field: 'customer_id', collection: 'users', as: 'profiles', project: ['full_name'] });
}

export const billingHandlers = {
  // ---------- Plans ----------
  'plans.list': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const filter = args.includeInactive && isAdmin(user) ? {} : { is_active: true };
      return outAll(await db.collection('membership_plans').find(filter).sort({ name: 1 }).toArray());
    },
  },

  'plans.save': {
    auth: 'admin',
    duplicate: 'A membership plan with this name already exists.',
    run: async ({ db, args }) => {
      const plan = args.plan ?? {};
      const fields = normalizePlan(pick(plan, PLAN_FIELDS));
      if (plan.id) {
        if (!Object.keys(fields).length) throw invalid('No plan fields were provided to update.');
        const error = checkPlanFields(fields);
        if (error) throw invalid(error);
        const res = await db.collection('membership_plans').findOneAndUpdate({ _id: plan.id }, { $set: { ...fields, updated_at: nowIso() } }, { returnDocument: 'after' });
        if (!res) throw notFound('Plan not found, or you do not have permission to change it.');
        return out(res);
      }
      if (!('name' in fields) || !('price' in fields) || !('duration_days' in fields)) throw invalid('Plan name, price, and duration are required.');
      const error = checkPlanFields(fields);
      if (error) throw invalid(error);
      const now = nowIso();
      const doc = { _id: newId(), description: '', is_active: true, ...fields, created_at: now, updated_at: now };
      await db.collection('membership_plans').insertOne(doc);
      return out(doc);
    },
  },

  'plans.delete': {
    auth: 'admin',
    run: async ({ db, args }) => {
      const [used, requested] = await Promise.all([
        db.collection('memberships').countDocuments({ plan_id: args.id }, { limit: 1 }),
        db.collection('membership_purchase_requests').countDocuments({ plan_id: args.id }, { limit: 1 }),
      ]);
      if (used || requested) throw new AppError('This plan is used by memberships. Deactivate it instead of deleting it.', '23503');
      const res = await db.collection('membership_plans').deleteOne({ _id: args.id });
      if (!res.deletedCount) throw notFound('Plan not found, or you do not have permission to delete it.');
      return [{ id: args.id }];
    },
  },

  // ---------- Memberships ----------
  'memberships.list': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      if (args.status && !MEMBERSHIP_STATUSES.includes(args.status)) throw invalid('Choose a valid membership status.');
      const filter = {};
      if (args.customerId) filter.customer_id = args.customerId;
      if (!isAdmin(user)) filter.customer_id = user._id;
      if (args.status) filter.status = args.status;
      const rows = outAll(await db.collection('memberships').find(filter).sort({ start_date: -1 }).toArray());
      await withCustomerNames(db, rows);
      await attach(db, rows, { field: 'plan_id', collection: 'membership_plans', as: 'membership_plans', project: ['name', 'duration_days'] });
      return rows;
    },
  },

  'memberships.assign': {
    auth: 'admin',
    duplicate: 'This customer already has an active membership.',
    run: async ({ db, client, args }) => {
      const { customerId, planId } = args;
      if (!customerId || !planId) throw invalid('A customer and a plan are required.');
      const startDate = args.startDate || today();
      if (!DATE_PATTERN.test(startDate)) throw invalid('Choose a valid start date.');
      const customer = await db.collection('users').findOne({ _id: customerId, role: 'customer' });
      if (!customer) throw new AppError('Memberships can only be assigned to customer accounts.', '22023');
      const plan = await db.collection('membership_plans').findOne({ _id: planId, is_active: true });
      if (!plan) throw new AppError('The membership plan does not exist or is inactive.', '22023');
      return inTransaction(client, async (session) => {
        const now = nowIso();
        await db.collection('memberships').updateMany(
          { customer_id: customerId, status: 'active' },
          { $set: { status: 'cancelled', updated_at: now } },
          { session }
        );
        const id = newId();
        await db.collection('memberships').insertOne(
          {
            _id: id, customer_id: customerId, plan_id: planId, status: 'active', start_date: startDate,
            end_date: membershipEndDate(startDate, plan.duration_days), created_at: now, updated_at: now,
          },
          { session }
        );
        return id;
      });
    },
  },

  'memberships.updateStatus': {
    auth: 'admin',
    duplicate: 'This customer already has an active membership.',
    run: async ({ db, args }) => {
      if (!MEMBERSHIP_STATUSES.includes(args.status)) throw invalid('Choose a valid membership status.');
      const res = await db.collection('memberships').findOneAndUpdate({ _id: args.id }, { $set: { status: args.status, updated_at: nowIso() } }, { returnDocument: 'after' });
      if (!res) throw notFound('Membership not found, or you do not have permission to change it.');
      return out(res);
    },
  },

  'memberships.mine': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const customerId = args.customerId;
      if (!isAdmin(user) && customerId !== user._id) return null;
      const doc = await db.collection('memberships').findOne({ customer_id: customerId, status: 'active' });
      if (!doc) return null;
      const [row] = await attach(db, [out(doc)], { field: 'plan_id', collection: 'membership_plans', as: 'membership_plans', project: ['name', 'duration_days'] });
      return row;
    },
  },

  'memberships.refresh': {
    auth: 'user',
    run: async ({ db }) => {
      await refreshMembershipStatuses(db);
      return null;
    },
  },

  // ---------- Payments ----------
  'payments.list': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const filter = {};
      if (args.customerId) filter.customer_id = args.customerId;
      if (!isAdmin(user)) filter.customer_id = user._id;
      if (args.status) filter.status = args.status;
      const rows = outAll(await db.collection('payments').find(filter).sort({ created_at: -1 }).toArray());
      return withCustomerNames(db, rows);
    },
  },

  'payments.record': {
    auth: 'admin',
    run: async ({ db, user, args }) => {
      const fields = pick(args.input, PAYMENT_FIELDS);
      if (!fields.customer_id) throw invalid('A customer is required.');
      if (!('amount' in fields)) throw invalid('Amount is required.');
      if (!(Number(fields.amount) > 0)) throw invalid('Amount must be greater than zero.');
      const status = fields.status ?? 'pending';
      if (!PAYMENT_STATUSES.includes(status)) throw invalid('Choose a valid payment status.');
      if ('note' in fields && String(fields.note ?? '').length > 500) throw invalid('Note must be 500 characters or fewer.');
      if (fields.due_date && !DATE_PATTERN.test(fields.due_date)) throw invalid('Choose a valid due date.');
      const customer = await db.collection('users').findOne({ _id: fields.customer_id });
      if (!customer) throw invalid('Customer not found.');
      if (fields.membership_id) {
        const membership = await db.collection('memberships').findOne({ _id: fields.membership_id });
        if (!membership) throw new AppError('The referenced membership does not exist.', '23503');
        if (membership.customer_id !== fields.customer_id) {
          throw new AppError('A payment customer must match the referenced membership customer.', '23514');
        }
      }
      const now = nowIso();
      const doc = {
        _id: newId(),
        customer_id: fields.customer_id,
        membership_id: fields.membership_id ?? null,
        amount: Math.round(Number(fields.amount) * 100) / 100,
        status,
        due_date: fields.due_date || null,
        paid_at: status === 'paid' ? fields.paid_at || now : null,
        note: String(fields.note ?? ''),
        recorded_by: user._id,
        created_at: now,
        updated_at: now,
      };
      await db.collection('payments').insertOne(doc);
      return out(doc);
    },
  },

  'payments.updateStatus': {
    auth: 'admin',
    run: async ({ db, args }) => {
      if (!PAYMENT_STATUSES.includes(args.status)) throw invalid('Choose a valid payment status.');
      const changes = { status: args.status, paid_at: args.status === 'paid' ? args.paidAt || nowIso() : null, updated_at: nowIso() };
      const res = await db.collection('payments').findOneAndUpdate({ _id: args.id }, { $set: changes }, { returnDocument: 'after' });
      if (!res) throw notFound('Payment not found, or you do not have permission to change it.');
      return out(res);
    },
  },

  'payments.mine': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const customerId = isAdmin(user) ? args.customerId : user._id;
      return outAll(await db.collection('payments').find({ customer_id: customerId }).sort({ created_at: -1 }).toArray());
    },
  },

  'payments.outstanding': {
    auth: 'admin',
    run: async ({ db }) => {
      const rows = outAll(await db.collection('payments').find({ status: { $in: ['pending', 'overdue'] } }).toArray());
      rows.sort((a, b) => {
        if (a.due_date === b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date < b.due_date ? -1 : 1;
      });
      await withCustomerNames(db, rows);
      const total = rows.reduce((sum, p) => sum + Number(p.amount), 0);
      return { items: rows, total: Math.round(total * 100) / 100 };
    },
  },

  // ---------- bKash settings and purchase requests ----------
  'settings.getBkash': {
    auth: 'user',
    run: async ({ db }) => {
      const doc = await db.collection('app_settings').findOne({ _id: 'bkash_number' });
      return { value: doc?.value ?? '' };
    },
  },

  'settings.setBkash': {
    auth: 'admin',
    run: async ({ db, user, args }) => {
      const value = String(args.value ?? '').trim();
      if (!BKASH_NUMBER_PATTERN.test(value)) throw invalid('Enter a valid bKash number (11 digits, starting with 01).');
      await db.collection('app_settings').updateOne(
        { _id: 'bkash_number' },
        { $set: { value, updated_at: nowIso(), updated_by: user._id } },
        { upsert: true }
      );
      return { value };
    },
  },

  'purchase.submit': {
    auth: 'customer',
    run: async ({ db, user, args }) => {
      const { planId, senderNumber, transactionId } = args;
      if (!planId) throw invalid('Choose a plan first.');
      const plan = await db.collection('membership_plans').findOne({ _id: planId, is_active: true });
      if (!plan) throw new AppError('This plan is not available.', '22023');
      if (!BKASH_NUMBER_PATTERN.test(senderNumber ?? '')) throw invalid('Enter a valid bKash number (11 digits, starting with 01).');
      if (!TRANSACTION_PATTERN.test(transactionId ?? '')) throw invalid('Enter a valid bKash transaction ID (letters and numbers only).');
      const requests = db.collection('membership_purchase_requests');
      if (await requests.findOne({ customer_id: user._id, status: 'pending' })) {
        throw new AppError('You already have a purchase waiting for confirmation.', '23505');
      }
      const txUpper = transactionId.toUpperCase();
      if (await requests.findOne({ transaction_id_upper: txUpper, status: { $in: ['pending', 'approved'] } })) {
        throw new AppError('This transaction ID has already been used.', '23505');
      }
      const bytes = new Uint8Array(3);
      crypto.getRandomValues(bytes);
      const reference = `FT-${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
      const doc = {
        _id: newId(),
        customer_id: user._id,
        plan_id: plan._id,
        amount: plan.price,
        reference,
        sender_number: senderNumber,
        transaction_id: transactionId,
        transaction_id_upper: txUpper,
        status: 'pending',
        reject_reason: '',
        membership_id: null,
        reviewed_by: null,
        reviewed_at: null,
        created_at: nowIso(),
      };
      try {
        await requests.insertOne(doc);
      } catch (err) {
        if (err?.code === 11000) throw new AppError('You already have a purchase waiting for confirmation.', '23505');
        throw err;
      }
      return doc._id;
    },
  },

  'purchase.mine': {
    auth: 'user',
    run: async ({ db, user, args }) => {
      const customerId = isAdmin(user) ? args.customerId : user._id;
      const rows = outAll(await db.collection('membership_purchase_requests').find({ customer_id: customerId }).sort({ created_at: -1 }).toArray());
      rows.forEach((r) => delete r.transaction_id_upper);
      return attach(db, rows, { field: 'plan_id', collection: 'membership_plans', as: 'membership_plans', project: ['name'] });
    },
  },

  'purchase.listAll': {
    auth: 'admin',
    run: async ({ db, args }) => {
      const filter = args.status ? { status: args.status } : {};
      const rows = outAll(await db.collection('membership_purchase_requests').find(filter).sort({ created_at: -1 }).toArray());
      rows.forEach((r) => delete r.transaction_id_upper);
      await withCustomerNames(db, rows);
      return attach(db, rows, { field: 'plan_id', collection: 'membership_plans', as: 'membership_plans', project: ['name'] });
    },
  },

  'purchase.approve': {
    auth: 'admin',
    run: async ({ db, client, user, args }) => {
      if (!args.requestId) throw invalid('Choose a request first.');
      const note = String(args.note ?? '').trim();
      return inTransaction(client, async (session) => {
        const requests = db.collection('membership_purchase_requests');
        const req = await requests.findOne({ _id: args.requestId }, { session });
        if (!req) throw new AppError('Request not found.', 'P0002');
        if (req.status !== 'pending') throw new AppError('This request has already been reviewed.', '22023');
        const plan = await db.collection('membership_plans').findOne({ _id: req.plan_id }, { session });
        if (!plan) throw new AppError('The plan for this request no longer exists.', '22023');

        await refreshMembershipStatuses(db, session);
        const current = await db
          .collection('memberships')
          .find({ customer_id: req.customer_id, status: { $in: ['active', 'scheduled'] } }, { session })
          .sort({ end_date: -1 })
          .limit(1)
          .toArray();
        const date = today();
        const lastEnd = current[0]?.end_date ?? addDays(date, -1);
        const nextStart = addDays(lastEnd, 1);
        const start = nextStart > date ? nextStart : date;
        const end = membershipEndDate(start, plan.duration_days);
        const hasActive = await db.collection('memberships').findOne({ customer_id: req.customer_id, status: 'active' }, { session });
        const status = start <= date && !hasActive ? 'active' : 'scheduled';

        const now = nowIso();
        const membershipId = newId();
        await db.collection('memberships').insertOne(
          { _id: membershipId, customer_id: req.customer_id, plan_id: req.plan_id, status, start_date: start, end_date: end, created_at: now, updated_at: now },
          { session }
        );
        await db.collection('payments').insertOne(
          {
            _id: newId(),
            customer_id: req.customer_id,
            membership_id: membershipId,
            amount: req.amount,
            status: 'paid',
            due_date: null,
            paid_at: now,
            note: `bKash ${req.transaction_id} · ${req.reference}${note ? ` · ${note}` : ''}`.slice(0, 500),
            recorded_by: user._id,
            created_at: now,
            updated_at: now,
          },
          { session }
        );
        await requests.updateOne(
          { _id: req._id },
          { $set: { status: 'approved', membership_id: membershipId, reviewed_by: user._id, reviewed_at: now } },
          { session }
        );
        return membershipId;
      });
    },
  },

  'purchase.reject': {
    auth: 'admin',
    run: async ({ db, user, args }) => {
      if (!args.requestId) throw invalid('Choose a request first.');
      const reason = String(args.reason ?? '').trim();
      if (!reason) throw invalid('Give a reason for rejecting this request.');
      const res = await db.collection('membership_purchase_requests').updateOne(
        { _id: args.requestId, status: 'pending' },
        { $set: { status: 'rejected', reject_reason: reason.slice(0, 500), reviewed_by: user._id, reviewed_at: nowIso() } }
      );
      if (!res.matchedCount) throw new AppError('Request not found or already reviewed.', '22023');
      return null;
    },
  },
};
