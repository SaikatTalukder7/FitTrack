import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { getActiveRoutine, listSessions, createSession, endSession, createRoutine } from '../../services/workoutService.js';
import { listExercises } from '../../services/exerciseService.js';
import { addMeasurement, listMeasurements } from '../../services/progressService.js';
import { getMyMembership, listPlans } from '../../services/membershipService.js';
import { listMyPayments } from '../../services/paymentService.js';
import { checkIn, listAttendance } from '../../services/attendanceService.js';
import './CustomerFeaturePage.css';

const titles = {
  routine: ['My Routine', 'Your personal training plan and exercises.'],
  customize: ['Customize Routine', 'Create a routine and review the available exercises.'],
  session: ['Workout', 'Start a workout session and keep a record of your training.'],
  history: ['Workout History', 'Review your recent training sessions.'],
  progress: ['Progress', 'Track your fitness progress over time.'],
  measurements: ['Body Measurements', 'Record your latest body measurements.'],
  membership: ['Membership', 'Review your current membership and available plans.'],
  payments: ['Payment History', 'Review your payment records.'],
  attendance: ['Attendance', 'Check in and review your gym attendance.'],
};

const dateText = (v) =>
  v ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00` : v).toLocaleDateString() : '—';
const dateTimeText = (v) => (v ? new Date(v).toLocaleString() : '—');
const money = (v) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(v || 0));

function Panel({ title, children }) {
  return (
    <section className="fp-card">
      <h2 className="fp-card__title">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <p className="fp-empty">{children}</p>;
}

function Table({ headers, rows }) {
  if (!rows.length) return <Empty>No records yet. Your saved information will appear here.</Empty>;
  return (
    <div className="fp-table-wrap">
      <table className="fp-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i}>
              {row.cells.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusTag({ value, kind }) {
  return <span className={`fp-tag fp-tag--${kind}`}>{value}</span>;
}

export default function CustomerFeaturePage({ page }) {
  const { profile, session } = useAuth();
  const customerId = profile?.id || session?.user?.id;
  const [data, setData] = useState({
    loading: true,
    error: '',
    routine: null,
    sessions: [],
    exercises: [],
    measurements: [],
    membership: null,
    plans: [],
    payments: [],
    attendance: [],
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    body_weight_kg: '',
    chest_cm: '',
    waist_cm: '',
    hips_cm: '',
    arm_cm: '',
    thigh_cm: '',
    notes: '',
  });

  const load = useCallback(async () => {
    if (!customerId) {
      setData((d) => ({ ...d, loading: false, error: 'Your account information is not ready. Please refresh the page.' }));
      return;
    }
    setData((d) => ({ ...d, loading: true, error: '' }));
    const jobs =
      {
        routine: [getActiveRoutine(customerId), listExercises()],
        customize: [getActiveRoutine(customerId), listExercises()],
        session: [getActiveRoutine(customerId), listSessions(customerId), listExercises()],
        history: [listSessions(customerId)],
        progress: [listMeasurements(customerId)],
        measurements: [listMeasurements(customerId)],
        membership: [getMyMembership(customerId), listPlans()],
        payments: [listMyPayments(customerId)],
        attendance: [listAttendance({ customerId })],
      }[page] || [];
    const results = await Promise.all(jobs);
    const error = results.find((r) => r?.error)?.error?.message || '';
    setData({
      loading: false,
      error,
      routine: results.find((r, i) => ['routine', 'customize', 'session'].includes(page) && i === 0)?.data ?? null,
      sessions: (page === 'history' ? results[0]?.data : page === 'session' ? results[1]?.data : []) || [],
      exercises:
        (page === 'routine' || page === 'customize' ? results[1]?.data : page === 'session' ? results[2]?.data : []) ||
        [],
      measurements: (page === 'progress' || page === 'measurements' ? results[0]?.data : []) || [],
      membership: page === 'membership' ? results[0]?.data : null,
      plans: page === 'membership' ? results[1]?.data || [] : [],
      payments: page === 'payments' ? results[0]?.data || [] : [],
      attendance: page === 'attendance' ? results[0]?.data || [] : [],
    });
  }, [customerId, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function perform(action, successMessage) {
    setBusy(true);
    setNotice('');
    setData((d) => ({ ...d, error: '' }));
    const result = await action();
    setBusy(false);
    if (result?.error) {
      setData((d) => ({ ...d, error: result.error.message }));
      return;
    }
    setNotice(successMessage);
    await load();
  }

  const title = titles[page] || ['FitTrack', ''];

  if (data.loading) {
    return (
      <div className="fp-page">
        <section className="fp-card fp-card--center">
          <Spinner label="Loading" />
        </section>
      </div>
    );
  }

  return (
    <div className="fp-page">
      <header className="fp-head">
        <p className="fp-eyebrow">FitTrack / Member</p>
        <h1 className="fp-title">{title[0]}</h1>
        <p className="fp-sub">{title[1]}</p>
      </header>

      {data.error && (
        <Alert type="error" title="Could not load or save data">
          {data.error}
        </Alert>
      )}
      {notice && (
        <Alert type="success" title="Success">
          {notice}
        </Alert>
      )}

      {/* My Routine */}
      {page === 'routine' && (
        <>
          <Panel title="Your active routine">
            {data.routine ? (
              <>
                <div className="fp-row">
                  <div>
                    <h3 className="fp-strong">{data.routine.name || 'My routine'}</h3>
                    <p className="fp-muted">{data.routine.routine_exercises?.length || 0} exercises</p>
                  </div>
                  <Link className="fp-btn fp-btn--solid" to="/app/session">
                    Start workout →
                  </Link>
                </div>
                <Table
                  headers={['Day', 'Exercise', 'Muscle group', 'Sets', 'Reps']}
                  rows={(data.routine.routine_exercises || []).map((e) => ({
                    id: e.id,
                    cells: [e.day_label || '—', e.exercises?.name || 'Exercise', e.exercises?.muscle_group || '—', e.sets, e.reps],
                  }))}
                />
              </>
            ) : (
              <>
                <Empty>You don't have an active routine yet. Create one to start planning your workouts.</Empty>
                <div className="fp-action">
                  <Link className="fp-btn fp-btn--solid" to="/app/routine/customize">
                    Create my routine
                  </Link>
                </div>
              </>
            )}
          </Panel>
          <Panel title="Exercise library">
            <Table
              headers={['Exercise', 'Muscle group', 'Difficulty']}
              rows={data.exercises.map((e) => ({ id: e.id, cells: [e.name, e.muscle_group, e.difficulty] }))}
            />
          </Panel>
        </>
      )}

      {/* Customize */}
      {page === 'customize' && (
        <>
          <Panel title="Create a routine">
            <p className="fp-muted fp-mb">
              You can create an empty routine first. Add exercises from the exercise library once a routine exists.
            </p>
            {data.routine ? (
              <p>
                Active routine: <strong>{data.routine.name}</strong>.{' '}
                <Link className="fp-link" to="/app/routine">
                  View routine
                </Link>
              </p>
            ) : (
              <button
                className="fp-btn fp-btn--solid"
                disabled={busy}
                onClick={() =>
                  perform(() => createRoutine({ customer_id: customerId, name: 'My routine' }), 'Routine created.')
                }
              >
                {busy ? 'Creating…' : 'Create my routine'}
              </button>
            )}
          </Panel>
          <Panel title="Available exercises">
            <Table
              headers={['Exercise', 'Muscle group', 'Difficulty']}
              rows={data.exercises.map((e) => ({ id: e.id, cells: [e.name, e.muscle_group, e.difficulty] }))}
            />
          </Panel>
        </>
      )}

      {/* Workout session */}
      {page === 'session' && (
        <>
          <Panel title="Workout session">
            {data.sessions.some((s) => !s.ended_at) ? (
              <>
                <p className="fp-mb">
                  You have an active session started {dateText(data.sessions.find((s) => !s.ended_at)?.started_at)}.
                </p>
                <button
                  className="fp-btn fp-btn--danger"
                  disabled={busy}
                  onClick={() =>
                    perform(() => endSession(data.sessions.find((s) => !s.ended_at).id), 'Workout session completed.')
                  }
                >
                  Finish workout
                </button>
              </>
            ) : (
              <>
                <p className="fp-muted fp-mb">
                  Start a session to record today's workout. Your session will appear in History.
                </p>
                <button
                  className="fp-btn fp-btn--solid"
                  disabled={busy}
                  onClick={() =>
                    perform(
                      () => createSession({ customer_id: customerId, routine_id: data.routine?.id || null }),
                      'Workout started!'
                    )
                  }
                >
                  {busy ? 'Starting…' : 'Start workout'}
                </button>
              </>
            )}
          </Panel>
          <Panel title="Your routine">
            <Table
              headers={['Exercise', 'Sets', 'Reps']}
              rows={(data.routine?.routine_exercises || []).map((e) => ({
                id: e.id,
                cells: [e.exercises?.name || 'Exercise', e.sets, e.reps],
              }))}
            />
          </Panel>
        </>
      )}

      {/* History */}
      {page === 'history' && (
        <Panel title="Recent sessions">
          <Table
            headers={['Started', 'Ended', 'Status', 'Notes']}
            rows={data.sessions.map((s) => ({
              id: s.id,
              cells: [
                dateTimeText(s.started_at),
                dateTimeText(s.ended_at),
                <StatusTag key="st" value={s.ended_at ? 'Completed' : 'In progress'} kind={s.ended_at ? 'done' : 'live'} />,
                s.notes || '—',
              ],
            }))}
          />
        </Panel>
      )}

      {/* Progress and measurements */}
      {(page === 'progress' || page === 'measurements') && (
        <>
          <Panel title="Add a measurement">
            <form
              className="fp-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                perform(
                  () =>
                    addMeasurement({
                      customer_id: customerId,
                      body_weight_kg: form.body_weight_kg ? Number(form.body_weight_kg) : undefined,
                      chest_cm: form.chest_cm ? Number(form.chest_cm) : undefined,
                      waist_cm: form.waist_cm ? Number(form.waist_cm) : undefined,
                      hips_cm: form.hips_cm ? Number(form.hips_cm) : undefined,
                      arm_cm: form.arm_cm ? Number(form.arm_cm) : undefined,
                      thigh_cm: form.thigh_cm ? Number(form.thigh_cm) : undefined,
                      notes: form.notes || undefined,
                    }),
                  'Measurement saved.'
                );
              }}
            >
              {[
                ['body_weight_kg', 'Weight (kg)'],
                ['chest_cm', 'Chest (cm)'],
                ['waist_cm', 'Waist (cm)'],
                ['hips_cm', 'Hips (cm)'],
                ['arm_cm', 'Arm (cm)'],
                ['thigh_cm', 'Thigh (cm)'],
              ].map(([key, label]) => (
                <label className="fp-field" key={key}>
                  {label}
                  <input
                    className="fp-input"
                    type="number"
                    min="1"
                    step="0.1"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <label className="fp-field">
                Notes
                <input
                  className="fp-input"
                  maxLength="500"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </label>
              <div className="fp-submit">
                <button className="fp-btn fp-btn--solid" disabled={busy}>
                  {busy ? 'Saving…' : 'Save measurement'}
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Measurement history">
            <Table
              headers={['Date', 'Weight (kg)', 'Chest (cm)', 'Waist (cm)', 'Notes']}
              rows={data.measurements.map((m) => ({
                id: m.id,
                cells: [
                  dateText(m.measured_on),
                  m.body_weight_kg ?? '—',
                  m.chest_cm ?? '—',
                  m.waist_cm ?? '—',
                  m.notes || '—',
                ],
              }))}
            />
          </Panel>

          <Panel title="Progress overview">
            <p className="fp-muted">
              Your progress is calculated from the measurements saved above. Add measurements regularly to see changes
              over time.
            </p>
          </Panel>
        </>
      )}

      {/* Membership */}
      {page === 'membership' && (
        <>
          <Panel title="Current membership">
            {data.membership ? (
              <div className="fp-facts">
                <div className="fp-fact">
                  <p className="fp-fact__label">Plan</p>
                  <p className="fp-fact__value">
                    {data.membership.membership_plans?.name || data.membership.plan_name || 'Membership'}
                  </p>
                </div>
                <div className="fp-fact">
                  <p className="fp-fact__label">Status</p>
                  <p className="fp-fact__value fp-cap">{data.membership.status}</p>
                </div>
                <div className="fp-fact">
                  <p className="fp-fact__label">End date</p>
                  <p className="fp-fact__value">{dateText(data.membership.end_date)}</p>
                </div>
              </div>
            ) : (
              <Empty>No active membership found. Ask the gym administrator to assign a plan to your account.</Empty>
            )}
          </Panel>

          <Panel title="Available plans">
            <Table
              headers={['Plan', 'Duration', 'Price', 'Description']}
              rows={data.plans.map((p) => ({
                id: p.id,
                cells: [p.name, `${p.duration_days} days`, money(p.price), p.description || '—'],
              }))}
            />
          </Panel>
        </>
      )}

      {/* Payments */}
      {page === 'payments' && (
        <Panel title="Your payments">
          <Table
            headers={['Date', 'Amount', 'Status', 'Due date', 'Note']}
            rows={data.payments.map((p) => ({
              id: p.id,
              cells: [
                dateText(p.created_at),
                money(p.amount),
                <span key="s" className="fp-cap">
                  {p.status}
                </span>,
                dateText(p.due_date),
                p.note || '—',
              ],
            }))}
          />
        </Panel>
      )}

      {/* Attendance */}
      {page === 'attendance' && (
        <>
          <Panel title="Gym check-in">
            <p className="fp-muted fp-mb">Check in once per day. An active membership is required by the gym rules.</p>
            <button
              className="fp-btn fp-btn--solid"
              disabled={busy}
              onClick={() => perform(() => checkIn(customerId), 'Checked in successfully.')}
            >
              {busy ? 'Checking in…' : 'Check in today'}
            </button>
          </Panel>
          <Panel title="Attendance history">
            <Table
              headers={['Date', 'Check-in time']}
              rows={data.attendance.map((a) => ({
                id: a.id,
                cells: [dateText(a.check_date), a.created_at ? new Date(a.created_at).toLocaleTimeString() : '—'],
              }))}
            />
          </Panel>
        </>
      )}
    </div>
  );
}