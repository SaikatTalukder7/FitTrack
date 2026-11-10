import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { getActiveRoutine, listSessions } from '../../services/workoutService.js';
import { getMyMembership } from '../../services/membershipService.js';
import { getAttendanceSummary } from '../../services/attendanceService.js';
import { listMyPayments } from '../../services/paymentService.js';
import './Dashboard.css';

function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en', options).format(date);
}

function daysRemaining(endDate) {
  if (!endDate) return null;
  const end = new Date(`${endDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
}

function Icon({ children, className = '' }) {
  return (
    <span aria-hidden="true" className={`cx-icon ${className}`}>
      {children}
    </span>
  );
}

function StatCard({ icon, label, value, detail, tone = 'mint' }) {
  return (
    <div className="cx-stat">
      <span className={`cx-stat__icon cx-tone--${tone}`}>{icon}</span>
      <div className="cx-stat__body">
        <p className="cx-stat__label">{label}</p>
        <p className="cx-stat__value">{value}</p>
        <p className="cx-stat__detail">{detail}</p>
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle, action, to }) {
  return (
    <div className="cx-section-head">
      <div>
        <h2 className="cx-title">{title}</h2>
        {subtitle && <p className="cx-sub">{subtitle}</p>}
      </div>
      {action && (
        <Link className="cx-link" to={to}>
          {action} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { profile, session } = useAuth();
  const customerId = profile?.id || session?.user?.id;
  const [dashboard, setDashboard] = useState({
    routine: null,
    sessions: [],
    membership: null,
    attendance: null,
    payments: [],
    loading: true,
    errors: [],
  });

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      if (!customerId) {
        setDashboard((current) => ({ ...current, loading: false }));
        return;
      }
      const results = await Promise.all([
        getActiveRoutine(customerId),
        listSessions(customerId, { limit: 5 }),
        getMyMembership(customerId),
        getAttendanceSummary(customerId),
        listMyPayments(customerId),
      ]);
      if (cancelled) return;
      const errors = results
        .filter((result) => result?.error)
        .map((result) => result.error.message || 'Some dashboard information could not be loaded.');
      setDashboard({
        routine: results[0]?.error ? null : results[0]?.data ?? null,
        sessions: results[1]?.error ? [] : results[1]?.data ?? [],
        membership: results[2]?.error ? null : results[2]?.data ?? null,
        attendance: results[3]?.error ? null : results[3]?.data ?? null,
        payments: results[4]?.error ? [] : results[4]?.data ?? [],
        loading: false,
        errors: [...new Set(errors)],
      });
    }
    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const firstName = useMemo(() => {
    const name = profile?.full_name?.trim();
    return name ? name.split(/\s+/)[0] : 'there';
  }, [profile?.full_name]);

  const today = new Date();
  const greetingDate = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(today);
  const routineExercises = dashboard.routine?.routine_exercises ?? [];
  const nextWorkoutDay = routineExercises[0]?.day_label || null;
  const remainingDays = daysRemaining(dashboard.membership?.end_date);
  const outstanding = dashboard.payments.filter((payment) => ['pending', 'overdue'].includes(payment.status));
  const outstandingTotal = outstanding.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const completedSessions = dashboard.sessions.filter((item) => item.ended_at).length;

  return (
    <div className="cx-page">
      {dashboard.errors.length > 0 && (
        <Alert type="error" title="Some dashboard details could not be loaded">
          {dashboard.errors[0]} Refresh the page to try again.
        </Alert>
      )}

      {/* Hero */}
      <section className="cx-hero">
        <span className="cx-hero__ring" aria-hidden="true" />
        <span className="cx-hero__glow" aria-hidden="true" />

        <div className="cx-hero__grid">
          <div>
            <p className="cx-hero__date">{greetingDate}</p>
            <h1 className="cx-hero__title">Welcome back, {firstName}!</h1>
            <p className="cx-hero__text">
              Every workout counts. Keep showing up, follow your routine, and make progress one day at a time.
            </p>
            <div className="cx-hero__actions">
              <Link to="/app/session" className="cx-btn cx-btn--lime">
                Start a workout <span aria-hidden="true">↗</span>
              </Link>
              <Link to="/app/routine" className="cx-btn cx-btn--ghost">
                View my routine
              </Link>
            </div>
          </div>

          <div className="cx-focus">
            <div className="cx-focus__top">
              <Icon className="cx-icon--lime">✦</Icon>
              <div>
                <p className="cx-focus__label">Your current focus</p>
                <p className="cx-focus__name">
                  {dashboard.loading ? 'Loading your plan…' : dashboard.routine?.name || 'Build your routine'}
                </p>
              </div>
            </div>
            <div className="cx-focus__divider" />
            <div className="cx-focus__row">
              <span>Exercises in routine</span>
              <strong>{dashboard.loading ? '—' : routineExercises.length}</strong>
            </div>
            <div className="cx-focus__row">
              <span>Next workout day</span>
              <strong>{dashboard.loading ? '—' : nextWorkoutDay || 'Not set yet'}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="cx-stats">
        <StatCard
          icon="◉"
          label="Workouts logged"
          value={dashboard.loading ? '—' : dashboard.sessions.length}
          detail={`${completedSessions} completed in recent sessions`}
          tone="mint"
        />
        <StatCard
          icon="▦"
          label="Gym check-ins"
          value={dashboard.loading ? '—' : dashboard.attendance?.total ?? 0}
          detail={
            dashboard.attendance?.lastCheckIn
              ? `Last visit ${formatDate(dashboard.attendance.lastCheckIn)}`
              : 'Your attendance history'
          }
          tone="teal"
        />
        <StatCard
          icon="♧"
          label="Membership"
          value={
            dashboard.loading
              ? '—'
              : dashboard.membership
                ? remainingDays === 0
                  ? 'Ends today'
                  : `${remainingDays} days`
                : 'No active plan'
          }
          detail={dashboard.membership?.membership_plans?.name || 'Membership status'}
          tone="sage"
        />
        <StatCard
          icon="৳"
          label="Outstanding payments"
          value={dashboard.loading ? '—' : `৳${outstandingTotal.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`}
          detail={
            outstanding.length
              ? `${outstanding.length} payment${outstanding.length === 1 ? '' : 's'} pending or overdue`
              : 'No pending payments'
          }
          tone="sand"
        />
      </section>

      {/* Routine and membership */}
      <section className="cx-grid-two">
        <div>
          <SectionHeading
            title="Your workout routine"
            subtitle="A quick look at your current training plan"
            action="Open routine"
            to="/app/routine"
          />
          <div className="cx-card">
            {dashboard.loading ? (
              <Spinner label="Loading your routine" />
            ) : dashboard.routine && routineExercises.length > 0 ? (
              <>
                {routineExercises
                  .slice()
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                  .slice(0, 4)
                  .map((item) => (
                    <div key={item.id} className="cx-ex">
                      <span className="cx-ex__icon">↗</span>
                      <div className="cx-ex__body">
                        <p className="cx-ex__name">{item.exercises?.name || 'Exercise'}</p>
                        <p className="cx-ex__meta">
                          {item.day_label || 'Routine'} · {item.sets} sets × {item.reps} reps
                        </p>
                      </div>
                      {item.target_weight_kg != null && <span className="cx-ex__weight">{item.target_weight_kg} kg</span>}
                    </div>
                  ))}
                {routineExercises.length > 4 && (
                  <p className="cx-more">Plus {routineExercises.length - 4} more exercises in your routine</p>
                )}
              </>
            ) : (
              <div className="cx-empty">
                <span className="cx-empty__icon">＋</span>
                <h3 className="cx-empty__title">Your routine starts here</h3>
                <p className="cx-empty__text">
                  You don't have an active routine yet. Visit My Routine to see your available options.
                </p>
                <Link to="/app/routine" className="cx-btn cx-btn--solid">
                  Explore my routine
                </Link>
              </div>
            )}
          </div>
        </div>

        <div>
          <SectionHeading
            title="Membership snapshot"
            subtitle="Keep track of your gym access"
            action="View details"
            to="/app/membership"
          />
          <div className="cx-card">
            {dashboard.loading ? (
              <Spinner label="Loading membership" />
            ) : dashboard.membership ? (
              <>
                <div className="cx-plan__top">
                  <div>
                    <p className="cx-plan__label">Current plan</p>
                    <h3 className="cx-plan__name">{dashboard.membership.membership_plans?.name || 'Active membership'}</h3>
                  </div>
                  <span className="cx-tag cx-tag--on">{dashboard.membership.status}</span>
                </div>
                <div className="cx-plan__dates">
                  <div className="cx-plan__box">
                    <span>Started</span>
                    <strong>{formatDate(dashboard.membership.start_date)}</strong>
                  </div>
                  <div className="cx-plan__box">
                    <span>Expires</span>
                    <strong>{formatDate(dashboard.membership.end_date)}</strong>
                  </div>
                </div>
                <p className="cx-plan__note">
                  {remainingDays === 0
                    ? 'Your membership reaches its end date today.'
                    : `${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining on your membership.`}
                </p>
              </>
            ) : (
              <div className="cx-empty">
                <span className="cx-empty__icon">♧</span>
                <h3 className="cx-empty__title">No active membership</h3>
                <p className="cx-empty__text">
                  Your membership information will appear here once a plan is assigned.
                </p>
                <Link to="/app/membership" className="cx-btn cx-btn--outline">
                  Membership details
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recent workouts */}
      <section>
        <SectionHeading
          title="Recent workouts"
          subtitle="Your latest training sessions"
          action="View history"
          to="/app/history"
        />
        <div className="cx-card cx-card--flush">
          {dashboard.loading ? (
            <div className="cx-pad">
              <Spinner label="Loading workout history" />
            </div>
          ) : dashboard.sessions.length ? (
            <div>
              {dashboard.sessions.slice(0, 4).map((item) => (
                <div key={item.id} className="cx-session">
                  <span className="cx-ex__icon">▤</span>
                  <div className="cx-session__body">
                    <p className="cx-session__title">Workout session</p>
                    <p className="cx-session__meta">
                      {formatDate(item.started_at)} · {item.ended_at ? 'Completed' : 'In progress'}
                    </p>
                  </div>
                  <span className={`cx-tag ${item.ended_at ? 'cx-tag--done' : 'cx-tag--live'}`}>
                    {item.ended_at ? 'Completed' : 'In progress'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="cx-empty cx-empty--inline">
              <span className="cx-empty__icon">↗</span>
              <h3 className="cx-empty__title">No workouts logged yet</h3>
              <p className="cx-empty__text">Your sessions will show up here after you start training.</p>
              <Link to="/app/session" className="cx-btn cx-btn--solid">
                Start your first workout
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <SectionHeading title="Quick actions" subtitle="Jump straight to what you need" />
        <div className="cx-actions">
          {[
            { to: '/app/session', icon: '▶', title: 'Start workout', desc: 'Begin a training session' },
            { to: '/app/progress', icon: '↗', title: 'Track progress', desc: 'Review your fitness journey' },
            { to: '/app/measurements', icon: '⌁', title: 'Body measurements', desc: 'Log your latest measurements' },
            { to: '/app/attendance', icon: '✓', title: 'Attendance', desc: 'Check your gym visits' },
          ].map((action) => (
            <Link key={action.to} to={action.to} className="cx-action">
              <span className="cx-action__icon">{action.icon}</span>
              <span className="cx-action__body">
                <span className="cx-action__title">{action.title}</span>
                <span className="cx-action__desc">{action.desc}</span>
              </span>
              <span className="cx-action__arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}