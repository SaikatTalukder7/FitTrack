import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import * as profileService from '../../services/profileService.js';
import * as equipmentService from '../../services/equipmentService.js';
import * as membershipService from '../../services/membershipService.js';
import * as attendanceService from '../../services/attendanceService.js';
import * as paymentService from '../../services/paymentService.js';
import * as workoutService from '../../services/workoutService.js';
import './Dashboard.css';

const STAT_CARDS = [
  { key: 'customers', label: 'Customers', description: 'Registered accounts', to: '/admin/customers', badge: 'CU' },
  { key: 'routines', label: 'Active routines', description: 'Assigned workout plans', to: '/admin/routines', badge: 'RT' },
  { key: 'splits', label: 'Workout splits', description: 'Reusable workout templates', to: '/admin/splits', badge: 'SP' },
  { key: 'equipment', label: 'Equipment items', description: 'Gym equipment records', to: '/admin/equipment', badge: 'EQ' },
  { key: 'plans', label: 'Membership plans', description: 'Available plan options', to: '/admin/memberships/plans', badge: 'PL' },
  { key: 'payments', label: 'Payment records', description: 'Recorded customer payments', to: '/admin/payments', badge: 'PY' },
];

const QUICK_ACTIONS = [
  { title: 'Assign a workout routine', detail: 'Choose a customer and an existing split.', to: '/admin/routines' },
  { title: 'Manage workout splits', detail: 'Organize exercises into workout days.', to: '/admin/splits' },
  { title: 'Add or edit exercises', detail: 'Maintain the exercise library.', to: '/admin/exercises' },
  { title: 'Review customers', detail: 'Search registered customer accounts.', to: '/admin/customers' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    customers: 0,
    routines: 0,
    splits: 0,
    equipment: 0,
    plans: 0,
    payments: 0,
    memberships: 0,
    attendance: 0,
  });
  const [recentRoutines, setRecentRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [customers, routines, splits, equipment, plans, payments, memberships, attendance] = await Promise.all([
      profileService.listCustomers(),
      workoutService.listCustomerRoutines(),
      workoutService.listSplits(),
      equipmentService.listEquipment(),
      membershipService.listPlans({ includeInactive: true }),
      paymentService.listPayments(),
      membershipService.listMemberships(),
      attendanceService.listAttendance(),
    ]);
    const results = [customers, routines, splits, equipment, plans, payments, memberships, attendance];
    const failed = results.find((result) => result.error);
    if (failed) setError(failed.error.message || 'Some dashboard information could not be loaded.');

    const routineRows = routines.data || [];
    setStats({
      customers: (customers.data || []).length,
      routines: routineRows.filter((routine) => routine.is_active).length,
      splits: (splits.data || []).length,
      equipment: (equipment.data || []).length,
      plans: (plans.data || []).length,
      payments: (payments.data || []).length,
      memberships: (memberships.data || []).length,
      attendance: (attendance.data || []).length,
    });
    setRecentRoutines(routineRows.slice(0, 5));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="ad-page">
      {/* Hero */}
      <section className="ad-hero">
        <p className="ad-kicker">FitTrack Admin</p>
        <div className="ad-hero__row">
          <div>
            <h1 className="ad-hero__title">Admin dashboard</h1>
            <p className="ad-hero__text">
              Manage customers, workout plans, memberships, and daily gym operations from one place.
            </p>
          </div>
          <Link to="/admin/routines" className="ad-pill">
            Assign a routine <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {error && (
        <Alert type="error" title="Some data could not be loaded">
          {error}
        </Alert>
      )}

      {/* Overview */}
      <section>
        <div className="ad-section-head">
          <div>
            <h2 className="ad-title">Overview</h2>
            <p className="ad-sub">Current records available to your admin account.</p>
          </div>
          <button type="button" className="ad-btn-outline" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="ad-card">
            <Spinner label="Loading dashboard overview" />
          </div>
        ) : (
          <div className="ad-stats">
            {STAT_CARDS.map((card) => (
              <Link key={card.key} to={card.to} className="ad-stat">
                <div className="ad-stat__top">
                  <div>
                    <p className="ad-stat__label">{card.label}</p>
                    <p className="ad-stat__value">{stats[card.key].toLocaleString()}</p>
                    <p className="ad-stat__desc">{card.description}</p>
                  </div>
                  <span className="ad-stat__badge" aria-hidden="true">
                    {card.badge}
                  </span>
                </div>
                <p className="ad-stat__link">
                  Open section <span aria-hidden="true">↗</span>
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent routines and quick actions */}
      <section className="ad-grid-two">
        <div className="ad-card">
          <div className="ad-card__head">
            <div>
              <h2 className="ad-card__title">Recent routine assignments</h2>
              <p className="ad-sub">Latest customer workout routines.</p>
            </div>
            <Link to="/admin/routines" className="ad-link">
              View all
            </Link>
          </div>

          {loading ? (
            <Spinner label="Loading recent routines" />
          ) : recentRoutines.length === 0 ? (
            <div className="ad-empty">
              <p className="ad-empty__title">No routines assigned yet</p>
              <p className="ad-empty__text">Assign a workout split to a customer to get started.</p>
              <Link to="/admin/routines" className="ad-pill">
                Assign first routine
              </Link>
            </div>
          ) : (
            <div className="ad-rows">
              {recentRoutines.map((routine) => (
                <div key={routine.id} className="ad-row">
                  <div className="ad-row__body">
                    <p className="ad-row__name">{routine.name}</p>
                    <p className="ad-row__meta">
                      {routine.profiles?.full_name || 'Customer'} · {routine.workout_splits?.name || 'No split linked'}
                    </p>
                  </div>
                  <span className={`ad-tag ${routine.is_active ? 'ad-tag--on' : 'ad-tag--off'}`}>
                    {routine.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ad-card">
          <h2 className="ad-card__title">Quick actions</h2>
          <p className="ad-sub">Jump straight to common admin tasks.</p>
          <div className="ad-actions">
            {QUICK_ACTIONS.map((item) => (
              <Link key={item.to + item.title} to={item.to} className="ad-action">
                <div>
                  <p className="ad-action__title">{item.title}</p>
                  <p className="ad-action__text">{item.detail}</p>
                </div>
                <span className="ad-action__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {!loading && (
        <p className="ad-note">
          Counts reflect records returned by the current database permissions. “Equipment items” counts equipment
          records, not exercise-library entries.
        </p>
      )}
    </div>
  );
}