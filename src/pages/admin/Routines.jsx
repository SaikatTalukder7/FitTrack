import { useCallback, useEffect, useState } from 'react';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import * as profileService from '../../services/profileService.js';
import * as workoutService from '../../services/workoutService.js';
import './AdminPage.css';
import './Routines.css';

export default function AdminRoutines() {
  const [customers, setCustomers] = useState([]);
  const [splits, setSplits] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [splitId, setSplitId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingRoutineId, setDeletingRoutineId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [c, s, r] = await Promise.all([
      profileService.listCustomers(),
      workoutService.listSplits(),
      workoutService.listCustomerRoutines(),
    ]);
    const failed = [c, s, r].find((x) => x.error);
    if (failed) setError(failed.error.message || 'Could not load routine data.');
    setCustomers(c.data || []);
    setSplits(s.data || []);
    setRoutines(r.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function assign(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!customerId || !splitId) {
      setError('Choose a customer and a workout split first.');
      return;
    }
    const split = splits.find((s) => s.id === splitId);
    if (!split) {
      setError('Selected workout split was not found.');
      return;
    }
    setSaving(true);
    const assigned = await workoutService.assignRoutine({
      customerId,
      splitId,
    });
    if (assigned.error) {
      setError(assigned.error.message);
      setSaving(false);
      return;
    }
    setNotice(`Assigned "${split.name}" successfully.`);
    setSaving(false);
    await load();
  }

  async function deleteRoutine(routine) {
    const customerName = routine.profiles?.full_name || routine.customer_id;
    if (
      !window.confirm(
        `Delete "${routine.name}" for ${customerName}? Workout session history will be kept, but this routine will no longer be available.`
      )
    )
      return;
    setError('');
    setNotice('');
    setDeletingRoutineId(routine.id);
    const result = await workoutService.deleteRoutine(routine.id);
    setDeletingRoutineId('');
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setNotice(`Deleted "${routine.name}" for ${customerName}.`);
    await load();
  }

  return (
    <div className="ap-page">
      <div className="ap-head">
        <div>
          <h1 className="ap-title">Customer Routines</h1>
          <p className="ap-sub">Assign a workout split to a customer or remove an existing routine.</p>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Action needed">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert type="success" title="Routine assigned">
          {notice}
        </Alert>
      )}

      <form className="ap-card rt-form" onSubmit={assign}>
        <h2 className="rt-form__title">New assignment</h2>
        {loading ? (
          <Spinner label="Loading customers and splits" />
        ) : (
          <>
            <div className="rt-grid">
              <label className="rt-field">
                Customer
                <select
                  className="ap-input rt-select"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">Choose customer</option>
                  {customers.map((c) => {
                    const hasActiveRoutine = routines.some(
                      (routine) => routine.customer_id === c.id && routine.is_active
                    );
                    return (
                      <option key={c.id} value={c.id} disabled={hasActiveRoutine}>
                        {c.full_name || c.id}
                        {hasActiveRoutine ? ' · active routine assigned' : ''}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="rt-field">
                Workout split
                <select
                  className="ap-input rt-select"
                  value={splitId}
                  onChange={(e) => setSplitId(e.target.value)}
                  required
                >
                  <option value="">Choose split</option>
                  {splits
                    .filter((split) => split.workout_split_exercises?.length)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <p className="rt-hint">
              The selected split supplies the routine exercises. A customer can have only one active routine.
            </p>

            <div>
              <button
                className="ap-btn ap-btn--solid"
                type="submit"
                disabled={saving || !customers.length || !splits.length}
              >
                {saving ? 'Assigning…' : 'Assign routine'}
              </button>
            </div>
          </>
        )}
      </form>

      <section className="ap-card">
        <h2 className="ap-card__title">Existing routines</h2>
        {loading ? (
          <Spinner label="Loading routines" />
        ) : routines.length === 0 ? (
          <p className="ap-empty">No routines assigned yet.</p>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Routine</th>
                  <th>Assigned</th>
                  <th>Status</th>
                  <th>Exercise details</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {routines.map((r) => (
                  <tr key={r.id}>
                    <td className="rt-customer">{r.profiles?.full_name || r.customer_id}</td>
                    <td>
                      {r.name}
                      <span className="rt-sub">{r.workout_splits?.name || 'Custom plan'}</span>
                    </td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`rt-tag ${r.is_active ? 'rt-tag--on' : 'rt-tag--off'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <ul className="rt-exlist">
                        {(r.routine_exercises || []).map((exercise) => (
                          <li key={exercise.id}>
                            <span className="rt-exlist__day">
                              {exercise.day_label}: {exercise.exercises?.name || 'Exercise'}
                            </span>{' '}
                            · {exercise.sets} × {exercise.reps} reps
                          </li>
                        ))}
                      </ul>
                      <span className="rt-count">{r.routine_exercises?.length || 0} exercises</span>
                    </td>
                    <td>
                      <button
                        className="rt-danger"
                        type="button"
                        onClick={() => deleteRoutine(r)}
                        disabled={Boolean(deletingRoutineId)}
                      >
                        {deletingRoutineId === r.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
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