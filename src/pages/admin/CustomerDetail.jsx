import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import * as profileService from '../../services/profileService.js';
import './AdminPage.css';
import './CustomerDetail.css';

const AVATAR_STYLE = {
  width: 72,
  height: 72,
  borderRadius: '50%',
  objectFit: 'cover',
  flexShrink: 0,
  background: '#ecfccb',
  color: '#0b1120',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 26,
  fontWeight: 700,
  overflow: 'hidden',
};

const date = (value) =>
  value ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value).toLocaleDateString() : '—';

const money = (value) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

function RecordTable({ title, headers, rows, empty }) {
  return (
    <section className="ap-card">
      <h2 className="ap-card__title">{title}</h2>
      {rows.length === 0 ? (
        <p className="ap-empty">{empty}</p>
      ) : (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                {headers.map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {row.cells.map((cell, index) => (
                    <td key={index}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: '', customer: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    const result = await profileService.getCustomerDetails(id);
    setState({
      loading: false,
      error: result.error?.message || '',
      customer: result.data || null,
    });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const [avatarUrl, setAvatarUrl] = useState(null);
  const customerId = state.customer?.profile?.id;
  const avatarPath = state.customer?.profile?.avatar_path ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!customerId || !avatarPath) {
      setAvatarUrl(null);
      return undefined;
    }
    profileService.getCustomerAvatarUrl(customerId).then((result) => {
      if (!cancelled) setAvatarUrl(result.error ? null : result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [customerId, avatarPath]);

  if (state.loading) {
    return (
      <div className="ap-page">
        <div className="ap-center">
          <Spinner label="Loading customer details" />
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="ap-page">
        <div>
          <Link className="ap-back" to="/admin/customers">
            ← Customers
          </Link>
        </div>
        <Alert type="error" title="Could not load customer">
          {state.error}
        </Alert>
        <div>
          <button className="ap-btn" type="button" onClick={load}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!state.customer) {
    return (
      <div className="ap-page">
        <Alert type="info" title="Customer not found">
          This customer account may have been removed.
        </Alert>
      </div>
    );
  }

  const customer = state.customer;
  const overdue = customer.payments.filter((payment) => ['pending', 'overdue'].includes(payment.status));
  const dues = overdue.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const activeMembership = customer.memberships.find((membership) => membership.status === 'active');

  return (
    <div className="ap-page">
      <div className="ap-head">
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${customer.profile.full_name || 'Customer'} photo`} style={AVATAR_STYLE} />
        ) : (
          <div style={AVATAR_STYLE} aria-hidden="true">
            {(customer.profile.full_name || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <Link className="ap-back" to="/admin/customers">
            ← Customers
          </Link>
          <h1 className="ap-title">{customer.profile.full_name || 'Unnamed customer'}</h1>
          <p className="cd-account">
            Account {customer.profile.id} · Joined {date(customer.profile.created_at)}
          </p>
        </div>
        <button className="ap-btn" type="button" onClick={load}>
          Refresh details
        </button>
      </div>

      <section className="ap-stats">
        {[
          ['Active routine', customer.routines.find((routine) => routine.is_active)?.name || 'None'],
          ['Membership', activeMembership?.membership_plans?.name || 'None'],
          ['Outstanding dues', money(dues)],
          ['Recent check-ins', customer.attendance.length],
        ].map(([label, value]) => (
          <div className="ap-stat" key={label}>
            <p className="ap-stat__label">{label}</p>
            <p className="ap-stat__value">{value}</p>
          </div>
        ))}
      </section>

      <RecordTable
        title="Workout routines"
        headers={['Name', 'Split', 'Exercises', 'Status', 'Created']}
        rows={customer.routines.map((routine) => ({
          id: routine.id,
          cells: [
            routine.name,
            routine.workout_splits?.name || '—',
            routine.routine_exercises?.length || 0,
            routine.is_active ? 'Active' : 'Archived',
            date(routine.created_at),
          ],
        }))}
        empty="No routines assigned."
      />

      <RecordTable
        title="Memberships"
        headers={['Plan', 'Price', 'Start', 'End', 'Status']}
        rows={customer.memberships.map((membership) => ({
          id: membership.id,
          cells: [
            membership.membership_plans?.name || '—',
            money(membership.membership_plans?.price),
            date(membership.start_date),
            date(membership.end_date),
            membership.status,
          ],
        }))}
        empty="No memberships assigned."
      />

      <RecordTable
        title="Payments"
        headers={['Created', 'Amount', 'Due date', 'Status', 'Note']}
        rows={customer.payments.map((payment) => ({
          id: payment.id,
          cells: [
            date(payment.created_at),
            money(payment.amount),
            date(payment.due_date),
            payment.status,
            payment.note || '—',
          ],
        }))}
        empty="No payments recorded."
      />

      <RecordTable
        title="Recent attendance"
        headers={['Date', 'Checked in']}
        rows={customer.attendance.map((entry) => ({
          id: entry.id,
          cells: [
            date(entry.check_date),
            entry.checked_in_at ? new Date(entry.checked_in_at).toLocaleTimeString() : '—',
          ],
        }))}
        empty="No check-ins recorded."
      />

      <RecordTable
        title="Recent workout sessions"
        headers={['Started', 'Ended', 'Status', 'Notes']}
        rows={customer.sessions.map((session) => ({
          id: session.id,
          cells: [
            session.started_at ? new Date(session.started_at).toLocaleString() : '—',
            session.ended_at ? new Date(session.ended_at).toLocaleString() : '—',
            session.ended_at ? 'Completed' : 'In progress',
            session.notes || '—',
          ],
        }))}
        empty="No workout sessions recorded."
      />

      <RecordTable
        title="Recent measurements"
        headers={['Date', 'Weight (kg)', 'Chest (cm)', 'Waist (cm)']}
        rows={customer.measurements.map((measurement) => ({
          id: measurement.id,
          cells: [
            date(measurement.measured_on),
            measurement.body_weight_kg ?? '—',
            measurement.chest_cm ?? '—',
            measurement.waist_cm ?? '—',
          ],
        }))}
        empty="No measurements recorded."
      />
    </div>
  );
}