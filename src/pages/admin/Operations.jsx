import { useCallback, useEffect, useState } from 'react';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import * as equipmentService from '../../services/equipmentService.js';
import * as membershipService from '../../services/membershipService.js';
import * as paymentService from '../../services/paymentService.js';
import * as attendanceService from '../../services/attendanceService.js';
import * as profileService from '../../services/profileService.js';
import './AdminPage.css';
import './Operations.css';

const money = (n) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

const EMPTY_FORM = {
  name: '',
  category: 'general',
  status: 'available',
  notes: '',
  price: '',
  duration_days: '30',
  description: '',
  customer_id: '',
  plan_id: '',
  amount: '',
  due_date: '',
};

const TITLES = {
  equipment: 'Equipment',
  plans: 'Membership Plans',
  memberships: 'Customer Memberships',
  payments: 'Payments',
  attendance: 'Attendance',
  statistics: 'Statistics',
};

const FORM_TITLES = {
  equipment: 'Equipment',
  plans: 'Membership plan',
  memberships: 'Assign membership',
  payments: 'Record payment',
};

const TABLE_HEADERS = {
  equipment: ['Name', 'Category', 'Status', 'Actions'],
  plans: ['Plan', 'Price', 'Duration', 'Status', 'Actions'],
  memberships: ['Customer', 'Plan', 'Start', 'End', 'Status', 'Update status'],
  payments: ['Customer', 'Amount', 'Due date', 'Status', 'Update status'],
  attendance: ['Customer', 'Check-in date', 'Actions'],
};

export default function AdminOperations({ page }) {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    let result;
    if (page === 'equipment') result = await equipmentService.listEquipment();
    else if (page === 'plans') result = await membershipService.listPlans({ includeInactive: true });
    else if (page === 'memberships') result = await membershipService.listMemberships();
    else if (page === 'payments') result = await paymentService.listPayments();
    else if (page === 'attendance') result = await attendanceService.listAttendance();
    else if (page === 'statistics') {
      const [c, e, p, m, a, pay] = await Promise.all([
        profileService.listCustomers(),
        equipmentService.listEquipment(),
        membershipService.listPlans({ includeInactive: true }),
        membershipService.listMemberships(),
        attendanceService.listAttendance(),
        paymentService.listPayments(),
      ]);
      const failed = [c, e, p, m, a, pay].find((x) => x.error);
      result = failed
        ? failed
        : {
            data: [
              { label: 'Customers', value: (c.data || []).length },
              { label: 'Equipment items', value: (e.data || []).length },
              { label: 'Membership plans', value: (p.data || []).length },
              { label: 'Memberships', value: (m.data || []).length },
              { label: 'Attendance records', value: (a.data || []).length },
              { label: 'Payment records', value: (pay.data || []).length },
            ],
            error: null,
          };
    }
    const [c, p] = await Promise.all([profileService.listCustomers(), membershipService.listPlans()]);
    setCustomers(c.data || []);
    setPlans(p.data || []);
    setItems(result?.data || []);
    setError(result?.error?.message || c.error?.message || '');
    setLoading(false);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId('');
    setForm(EMPTY_FORM);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    let r;
    if (page === 'equipment') {
      const values = { name: form.name, category: form.category, status: form.status, notes: form.notes };
      r = editingId
        ? await equipmentService.updateEquipment(editingId, values)
        : await equipmentService.createEquipment(values);
    } else if (page === 'plans')
      r = await membershipService.savePlan({
        id: editingId || undefined,
        name: form.name,
        price: Number(form.price),
        duration_days: Number(form.duration_days),
        description: form.description,
        is_active: editingId ? form.is_active : true,
      });
    else if (page === 'memberships')
      r = await membershipService.assignMembership({ customerId: form.customer_id, planId: form.plan_id });
    else if (page === 'payments')
      r = await paymentService.recordPayment({
        customer_id: form.customer_id,
        amount: Number(form.amount),
        status: 'pending',
        due_date: form.due_date || null,
        note: form.notes,
      });

    if (r?.error) setError(r.error.message);
    else setNotice(editingId ? 'Changes saved.' : 'Saved successfully.');
    setSaving(false);
    if (!r?.error) {
      resetForm();
      await load();
    }
  }

  function editItem(item) {
    setEditingId(item.id);
    setForm((f) => ({
      ...f,
      name: item.name,
      category: item.category || 'general',
      status: item.status || 'available',
      notes: item.notes || '',
      price: String(item.price ?? ''),
      duration_days: String(item.duration_days ?? '30'),
      description: item.description || '',
      is_active: item.is_active,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteItem(item) {
    const label = page === 'equipment' ? 'equipment' : page === 'plans' ? 'membership plan' : 'attendance record';
    if (
      !window.confirm(
        page === 'attendance' ? 'Remove this check-in record? This cannot be undone.' : `Delete this ${label}? This cannot be undone.`
      )
    )
      return;
    setSaving(true);
    setError('');
    setNotice('');
    const r =
      page === 'equipment'
        ? await equipmentService.deleteEquipment(item.id)
        : page === 'plans'
          ? await membershipService.deletePlan(item.id)
          : await attendanceService.deleteAttendance(item.id);
    if (r.error) setError(r.error.message);
    else setNotice(`${label.charAt(0).toUpperCase() + label.slice(1)} deleted.`);
    setSaving(false);
    await load();
  }

  async function changeStatus(item, status) {
    setSaving(true);
    setError('');
    setNotice('');
    let r;
    if (page === 'equipment') r = await equipmentService.setEquipmentStatus(item.id, status);
    else if (page === 'plans') r = await membershipService.savePlan({ id: item.id, is_active: status === 'active' });
    else if (page === 'memberships') r = await membershipService.updateMembershipStatus(item.id, status);
    else if (page === 'payments') r = await paymentService.updatePaymentStatus(item.id, status);
    if (r?.error) setError(r.error.message);
    else setNotice('Status updated.');
    setSaving(false);
    await load();
  }

  const title = TITLES[page] || 'Management';
  const canCreate = ['equipment', 'plans', 'memberships', 'payments'].includes(page);

  return (
    <div className="ap-page">
      <div className="ap-head">
        <div>
          <h1 className="ap-title">{title}</h1>
          <p className="ap-sub">Manage FitTrack {title.toLowerCase()}.</p>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Could not complete action">
          {error}
        </Alert>
      )}
      {notice && <Alert type="success">{notice}</Alert>}

      {canCreate && (
        <form className="ap-card op-form" onSubmit={submit}>
          <h2 className="op-form__title">
            {editingId ? 'Edit ' : ''}
            {FORM_TITLES[page]}
          </h2>

          {page === 'equipment' && (
            <div className="op-grid op-grid--3">
              <label className="op-field">
                Name
                <input
                  className="ap-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  minLength={2}
                />
              </label>
              <label className="op-field">
                Category
                <input
                  className="ap-input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </label>
              <label className="op-field">
                Status
                <select
                  className="ap-input op-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option>available</option>
                  <option>busy</option>
                  <option>maintenance</option>
                </select>
              </label>
            </div>
          )}

          {page === 'plans' && (
            <div className="op-grid op-grid--2">
              <label className="op-field">
                Plan name
                <input
                  className="ap-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  minLength={2}
                />
              </label>
              <label className="op-field">
                Price (BDT)
                <input
                  className="ap-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </label>
              <label className="op-field">
                Duration (days)
                <input
                  className="ap-input"
                  type="number"
                  min="1"
                  max="3650"
                  value={form.duration_days}
                  onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                  required
                />
              </label>
              <label className="op-field">
                Description
                <input
                  className="ap-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
            </div>
          )}

          {['memberships', 'payments'].includes(page) && (
            <div className="op-grid op-grid--2">
              <label className="op-field">
                Customer
                <select
                  className="ap-input op-select"
                  value={form.customer_id}
                  onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                  required
                >
                  <option value="">Choose customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name || c.id}
                    </option>
                  ))}
                </select>
              </label>

              {page === 'memberships' ? (
                <label className="op-field">
                  Plan
                  <select
                    className="ap-input op-select"
                    value={form.plan_id}
                    onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                    required
                  >
                    <option value="">Choose plan</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {money(p.price)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <label className="op-field">
                    Amount (BDT)
                    <input
                      className="ap-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </label>
                  <label className="op-field">
                    Due date
                    <input
                      className="ap-input"
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </label>
                </>
              )}
            </div>
          )}

          {page === 'equipment' && (
            <label className="op-field">
              Notes
              <input
                className="ap-input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
          )}

          <div className="op-actions">
            <button className="ap-btn ap-btn--solid" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save'}
            </button>
            {editingId && (
              <button className="ap-btn" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      )}

      <section className="ap-card">
        {loading ? (
          <Spinner label={`Loading ${title.toLowerCase()}`} />
        ) : items.length === 0 ? (
          <p className="ap-empty">No records found.</p>
        ) : page === 'statistics' ? (
          <div className="ap-stats">
            {items.map((x) => (
              <div className="ap-stat" key={x.label}>
                <p className="ap-stat__label">{x.label}</p>
                <p className="ap-stat__value">{x.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  {TABLE_HEADERS[page].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((x, i) => (
                  <tr key={x.id || i}>
                    {page === 'equipment' ? (
                      <>
                        <td className="op-strong">{x.name}</td>
                        <td>{x.category || '—'}</td>
                        <td className="op-cap">{x.status}</td>
                        <td>
                          <div className="op-row-actions">
                            <select
                              aria-label={`Equipment status for ${x.name}`}
                              className="ap-input op-select op-select--compact"
                              value={x.status}
                              disabled={saving}
                              onChange={(e) => changeStatus(x, e.target.value)}
                            >
                              <option>available</option>
                              <option>busy</option>
                              <option>maintenance</option>
                            </select>
                            <button className="op-btn" type="button" onClick={() => editItem(x)}>
                              Edit
                            </button>
                            <button
                              className="op-danger"
                              type="button"
                              disabled={saving}
                              onClick={() => deleteItem(x)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    ) : page === 'plans' ? (
                      <>
                        <td className="op-strong">{x.name}</td>
                        <td>{money(x.price)}</td>
                        <td>{x.duration_days} days</td>
                        <td>
                          <span className={`op-tag ${x.is_active ? 'op-tag--on' : 'op-tag--off'}`}>
                            {x.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="op-row-actions">
                            <button
                              className="op-btn"
                              onClick={() => changeStatus(x, x.is_active ? 'inactive' : 'active')}
                              type="button"
                              disabled={saving}
                            >
                              {x.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button className="op-btn" type="button" onClick={() => editItem(x)}>
                              Edit
                            </button>
                            <button
                              className="op-danger"
                              type="button"
                              disabled={saving}
                              onClick={() => deleteItem(x)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    ) : page === 'memberships' ? (
                      <>
                        <td className="op-strong">{x.profiles?.full_name || x.customer_id}</td>
                        <td>{x.membership_plans?.name || '—'}</td>
                        <td>{x.start_date || '—'}</td>
                        <td>{x.end_date || '—'}</td>
                        <td className="op-cap">{x.status}</td>
                        <td>
                          <select
                            aria-label={`Update membership status for ${x.profiles?.full_name || x.customer_id}`}
                            className="ap-input op-select op-select--compact"
                            value={x.status}
                            disabled={saving}
                            onChange={(e) => changeStatus(x, e.target.value)}
                          >
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </>
                    ) : page === 'payments' ? (
                      <>
                        <td className="op-strong">{x.profiles?.full_name || x.customer_id}</td>
                        <td>{money(x.amount)}</td>
                        <td>{x.due_date || '—'}</td>
                        <td className="op-cap">{x.status}</td>
                        <td>
                          <select
                            aria-label={`Update payment status for ${x.profiles?.full_name || x.customer_id}`}
                            className="ap-input op-select op-select--compact"
                            value={x.status}
                            disabled={saving}
                            onChange={(e) => changeStatus(x, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="overdue">Overdue</option>
                            <option value="paid">Paid</option>
                            <option value="waived">Waived</option>
                          </select>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="op-strong">{x.profiles?.full_name || x.customer_id}</td>
                        <td>{x.check_date}</td>
                        <td>
                          <button
                            className="op-danger"
                            type="button"
                            disabled={saving}
                            onClick={() => deleteItem(x)}
                          >
                            Remove check-in
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}