import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import * as exerciseService from '../../services/exerciseService.js';
import * as workoutService from '../../services/workoutService.js';
import './WorkoutSession.css';

export default function WorkoutSession() {
  const { profile } = useAuth();
  const [routine, setRoutine] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState([]);
  const [recovery, setRecovery] = useState(null);
  const [extraIds, setExtraIds] = useState([]);
  const [exerciseToAdd, setExerciseToAdd] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const activeSession = sessions.find((session) => !session.ended_at) || null;

  const load = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      setError('Your account information is not ready. Refresh the page and try again.');
      return;
    }
    setLoading(true);
    setError('');
    const [routineResult, sessionResult, exerciseResult, recoveryResult] = await Promise.all([
      workoutService.getActiveRoutine(profile.id),
      workoutService.listSessions(profile.id, { limit: 20 }),
      exerciseService.listExercises(),
      workoutService.getRecoveryStatus(profile.id),
    ]);
    const active = (sessionResult.data || []).find((session) => !session.ended_at);
    const logResult = active ? await workoutService.listSessionLogs(active.id) : { data: [], error: null };
    const failed = [routineResult, sessionResult, exerciseResult, recoveryResult, logResult].find((result) => result.error);
    setRoutine(routineResult.data || null);
    setSessions(sessionResult.data || []);
    setExercises(exerciseResult.data || []);
    setLogs(logResult.data || []);
    setRecovery(recoveryResult.data || null);
    setError(failed?.error?.message || '');
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const allRoutineEntries = routine?.routine_exercises || [];
  const routineEntries = allRoutineEntries;
  const routineIds = new Set(routineEntries.map((item) => item.exercise_id));
  const extraEntries = exercises
    .filter((exercise) => extraIds.includes(exercise.id) && !routineIds.has(exercise.id))
    .map((exercise) => ({
      id: null,
      exercise_id: exercise.id,
      exercises: exercise,
      sets: 3,
      reps: 10,
      target_weight_kg: null,
    }));
  const workoutEntries = useMemo(() => [...routineEntries, ...extraEntries], [routineEntries, extraEntries]);
  const selectableExercises = exercises.filter(
    (exercise) => !routineIds.has(exercise.id) && !extraIds.includes(exercise.id)
  );

  async function perform(action, message) {
    setBusy(true);
    setError('');
    setNotice('');
    const result = await action();
    setBusy(false);
    if (result?.error) {
      setError(result.error.message);
      return false;
    }
    setNotice(message);
    await load();
    return true;
  }

  async function startSession() {
    await perform(
      () =>
        workoutService.createSession({
          customer_id: profile.id,
          routine_id: routine?.id || null,
        }),
      'Workout started. Your session will stay in progress until you finish it.'
    );
  }

  async function finishSession() {
    if (!window.confirm('Finish this workout session? You can review its set logs in Workout History.')) return;
    await perform(() => workoutService.endSession(activeSession.id), 'Workout session completed.');
  }

  if (loading) {
    return (
      <div className="ws-page">
        <section className="ws-card ws-card--center">
          <Spinner label="Loading workout" />
        </section>
      </div>
    );
  }

  return (
    <div className="ws-page">
      <header className="ws-head">
        <p className="ws-eyebrow">FitTrack / Member</p>
        <h1 className="ws-title">Workout session</h1>
        <p className="ws-sub">Record each set, reps, weight, completion, and optional notes.</p>
      </header>

      {error && (
        <Alert type="error" title="Could not complete request">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert type="success" title="Workout updated">
          {notice}
        </Alert>
      )}

      {/* Session status */}
      <section className="ws-card ws-bar">
        <div>
          <h2 className="ws-bar__title">{activeSession ? 'Session in progress' : 'Ready to train?'}</h2>
          <p className="ws-muted">
            {activeSession
              ? `Started ${new Date(activeSession.started_at).toLocaleString()}`
              : routine
                ? `Current routine: ${routine.name}`
                : 'You can start a session and choose exercises from the library.'}
          </p>
        </div>
        {activeSession ? (
          <button className="ws-btn ws-btn--danger" type="button" disabled={busy} onClick={finishSession}>
            {busy ? 'Finishing…' : 'Finish workout'}
          </button>
        ) : (
          <button className="ws-btn ws-btn--solid" type="button" disabled={busy} onClick={startSession}>
            {busy ? 'Starting…' : 'Start workout'}
          </button>
        )}
      </section>

      {activeSession && (
        <>
          <section className="ws-card ws-stack">
            <div>
              <h2 className="ws-card__title">Add an exercise to today</h2>
              <p className="ws-muted">Started {new Date(activeSession.started_at).toLocaleString()}</p>
            </div>
            <div className="ws-add">
              <select
                className="ws-input ws-select"
                value={exerciseToAdd}
                onChange={(event) => setExerciseToAdd(event.target.value)}
              >
                <option value="">Choose from active exercise library</option>
                {selectableExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name} · {exercise.muscle_group}
                  </option>
                ))}
              </select>
              <button
                className="ws-btn ws-btn--outline"
                type="button"
                disabled={!exerciseToAdd}
                onClick={() => {
                  setExtraIds((ids) => [...ids, exerciseToAdd]);
                  setExerciseToAdd('');
                }}
              >
                Add exercise
              </button>
            </div>
          </section>

          {workoutEntries.length === 0 ? (
            <section className="ws-card ws-stack">
              <p className="ws-muted">
                Your routine has no exercises. Add an exercise above to record today's workout.
              </p>
              <div>
                <Link className="ws-btn ws-btn--outline" to="/app/routine/customize">
                  Customize your routine
                </Link>
              </div>
            </section>
          ) : (
            workoutEntries.map((entry) => (
              <ExerciseLog
                key={entry.id || entry.exercise_id}
                entry={entry}
                logs={logs.filter((log) => log.exercise_id === entry.exercise_id)}
                sessionId={activeSession.id}
                busy={busy}
                onSave={perform}
              />
            ))
          )}
        </>
      )}

      {/* Recovery */}
      <section className="ws-card ws-stack">
        <div>
          <h2 className="ws-card__title">Recent muscle recovery</h2>
          <p className="ws-muted">
            Based on completed exercise logs from the last 7 days and a configurable {recovery?.restHours || 48}-hour
            rest interval. This is general planning information, not medical advice.
          </p>
        </div>

        {!recovery?.groups?.length ? (
          <p className="ws-muted">Complete and log a workout to see recently trained muscle groups.</p>
        ) : (
          <>
            {recovery.restDaySuggested && (
              <p className="ws-note ws-note--warn">
                Every muscle group logged recently is still within the rest interval. Consider a rest day or an
                untrained area.
              </p>
            )}
            <ul className="ws-groups">
              {recovery.groups.map((group) => (
                <li key={group.muscleGroup} className="ws-group">
                  <p className="ws-group__name">{group.muscleGroup}</p>
                  <p className="ws-muted">
                    {group.exercise} · {group.elapsedHours} hours ago
                  </p>
                  <p className={`ws-status ${group.recovered ? 'ws-status--ok' : 'ws-status--wait'}`}>
                    {group.recovered ? 'Rest interval reached' : 'Within rest interval'}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function ExerciseLog({ entry, logs, sessionId, busy, onSave }) {
  const loggedSets = new Map(logs.map((log) => [log.set_number, log]));
  const count = Math.max(1, Number(entry.sets) || 3);

  return (
    <section className="ws-card ws-stack">
      <div className="ws-ex__head">
        <div>
          <h2 className="ws-ex__name">{entry.exercises?.name || 'Exercise'}</h2>
          <p className="ws-ex__meta">
            {entry.day_label || entry.exercises?.muscle_group || 'Workout'} · target {entry.sets} × {entry.reps} reps
            {entry.target_weight_kg == null ? '' : ` · ${entry.target_weight_kg} kg`}
          </p>
        </div>
        {entry.id && <span className="ws-pill">From your routine</span>}
      </div>

      <div className="ws-sets">
        {Array.from({ length: count }, (_, index) => {
          const setNumber = index + 1;
          return (
            <SetLogForm
              key={setNumber}
              setNumber={setNumber}
              existing={loggedSets.get(setNumber)}
              entry={entry}
              sessionId={sessionId}
              busy={busy}
              onSave={onSave}
            />
          );
        })}
      </div>
    </section>
  );
}

function SetLogForm({ setNumber, existing, entry, sessionId, busy, onSave }) {
  const [reps, setReps] = useState(String(existing?.reps ?? entry.reps ?? 10));
  const [weight, setWeight] = useState(
    existing?.weight_kg == null
      ? entry.target_weight_kg == null
        ? ''
        : String(entry.target_weight_kg)
      : String(existing.weight_kg)
  );
  const [completed, setCompleted] = useState(existing?.completed ?? true);
  const [notes, setNotes] = useState(existing?.notes || '');

  useEffect(() => {
    setReps(String(existing?.reps ?? entry.reps ?? 10));
    setWeight(
      existing?.weight_kg == null
        ? entry.target_weight_kg == null
          ? ''
          : String(entry.target_weight_kg)
        : String(existing.weight_kg)
    );
    setCompleted(existing?.completed ?? true);
    setNotes(existing?.notes || '');
  }, [
    existing?.id,
    existing?.reps,
    existing?.weight_kg,
    existing?.completed,
    existing?.notes,
    entry.reps,
    entry.target_weight_kg,
  ]);

  return (
    <form
      className="ws-setrow"
      onSubmit={(event) => {
        event.preventDefault();
        const values = { reps: Number(reps), weight_kg: weight === '' ? null : Number(weight), completed, notes };
        onSave(
          () =>
            existing
              ? workoutService.updateWorkoutLog(existing.id, values)
              : workoutService.logSet({
                  session_id: sessionId,
                  routine_exercise_id: entry.id || null,
                  exercise_id: entry.exercise_id,
                  set_number: setNumber,
                  ...values,
                }),
          existing ? 'Set log updated.' : 'Set logged.'
        );
      }}
    >
      <div className="ws-setrow__num">Set {setNumber}</div>

      <label className="ws-field">
        Reps
        <input
          className="ws-input"
          type="number"
          min="0"
          max="500"
          value={reps}
          onChange={(event) => setReps(event.target.value)}
          required
        />
      </label>

      <label className="ws-field">
        Weight (kg)
        <input
          className="ws-input"
          type="number"
          min="0"
          step="0.25"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
        />
      </label>

      <label className="ws-field">
        Notes
        <input
          className="ws-input"
          value={notes}
          maxLength="500"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional"
        />
      </label>

      <div className="ws-setrow__actions">
        <label className="ws-check">
          <input type="checkbox" checked={completed} onChange={(event) => setCompleted(event.target.checked)} />
          Complete
        </label>
        <button className="ws-btn ws-btn--outline ws-btn--sm" disabled={busy}>
          {busy ? 'Saving…' : existing ? 'Update' : 'Log set'}
        </button>
      </div>
    </form>
  );
}