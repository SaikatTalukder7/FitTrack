import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import * as equipmentService from '../../services/equipmentService.js';
import * as exerciseService from '../../services/exerciseService.js';
import * as workoutService from '../../services/workoutService.js';
import './RoutineCustomize.css';

const DEFAULT_ADD = { exerciseId: '', dayLabel: 'Workout A', sets: '3', reps: '12', weight: '' };

export default function RoutineCustomize() {
  const { profile } = useAuth();
  const [routine, setRoutine] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [addForm, setAddForm] = useState(DEFAULT_ADD);
  const [alternatives, setAlternatives] = useState({});

  const load = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      setError('Your account information is not ready. Refresh the page and try again.');
      return;
    }
    setLoading(true);
    setError('');
    const [routineResult, exerciseResult] = await Promise.all([
      workoutService.getActiveRoutine(profile.id),
      exerciseService.listExercises(),
    ]);
    const failed = [routineResult, exerciseResult].find((result) => result.error);
    setRoutine(routineResult.error ? null : routineResult.data);
    setExercises(exerciseResult.data || []);
    setError(failed?.error?.message || '');
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

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

  async function generate(regenerate) {
    if (
      regenerate &&
      !window.confirm(
        'Generate a new routine? Your current routine will be archived, and workout history will stay available.'
      )
    )
      return;
    const action = regenerate
      ? () => workoutService.regenerateRoutine(profile.id)
      : () => workoutService.generateRoutine(profile.id);
    await perform(
      action,
      regenerate
        ? 'A replacement routine was generated. Your previous routine and workout history were preserved.'
        : 'Your routine was generated and saved.'
    );
  }

  async function restore() {
    if (!window.confirm('Restore the routine to its original generated version? Your workout history will not be changed.'))
      return;
    await perform(() => workoutService.restoreOriginalRoutine(routine.id), 'The original routine was restored.');
  }

  async function addExercise(event) {
    event.preventDefault();
    const result = await perform(
      () =>
        workoutService.addRoutineExercise({
          routine_id: routine.id,
          exercise_id: addForm.exerciseId,
          day_label: addForm.dayLabel.trim(),
          position: routine.routine_exercises?.length || 0,
          sets: Number(addForm.sets),
          reps: Number(addForm.reps),
          target_weight_kg: addForm.weight === '' ? null : Number(addForm.weight),
        }),
      'Exercise added to your routine.'
    );
    if (result) setAddForm(DEFAULT_ADD);
  }

  async function saveExercise(event, item, values) {
    event.preventDefault();
    await perform(
      () =>
        workoutService.updateRoutineExercise(item.id, {
          day_label: values.day_label.trim(),
          sets: Number(values.sets),
          reps: Number(values.reps),
          target_weight_kg: values.target_weight_kg === '' ? null : Number(values.target_weight_kg),
        }),
      'Routine exercise updated.'
    );
  }

  async function findAlternatives(item) {
    setError('');
    const result = await equipmentService.getExerciseAlternatives(item.exercise_id);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setAlternatives((current) => ({ ...current, [item.id]: result.data }));
  }

  async function replaceExercise(item, exerciseId) {
    if (
      !exerciseId ||
      !window.confirm('Replace this exercise in your current routine? You can restore the original routine later.')
    )
      return;
    await perform(
      () => workoutService.updateRoutineExercise(item.id, { exercise_id: exerciseId }),
      'Compatible exercise selected.'
    );
  }

  if (loading) {
    return (
      <div className="rc-page">
        <section className="rc-card rc-card--center">
          <Spinner label="Loading routine" />
        </section>
      </div>
    );
  }

  return (
    <div className="rc-page">
      <header className="rc-head">
        <p className="rc-eyebrow">FitTrack / Member</p>
        <h1 className="rc-title">Customize routine</h1>
        <p className="rc-sub">Customize your saved workout plan and exercise targets.</p>
      </header>

      {error && (
        <Alert type="error" title="Could not complete request">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert type="success" title="Saved">
          {notice}
        </Alert>
      )}

      {!routine ? (
        <section className="rc-card rc-stack">
          <h2 className="rc-card__title">Create a saved workout plan</h2>
          <p className="rc-muted">Generate and save a workout plan to your account.</p>
          <div>
            <button className="rc-btn rc-btn--solid" type="button" disabled={busy} onClick={() => generate(false)}>
              {busy ? 'Generating…' : 'Generate my routine'}
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="rc-card rc-bar">
            <div>
              <p className="rc-label">Active saved routine</p>
              <h2 className="rc-bar__name">{routine.name}</h2>
              <p className="rc-muted">
                {routine.routine_exercises?.length || 0} exercises · {routine.workout_splits?.name || 'Custom plan'}
              </p>
            </div>
            <div className="rc-actions">
              <Link className="rc-btn rc-btn--outline" to="/app/routine">
                View routine
              </Link>
              <button className="rc-btn rc-btn--outline" type="button" disabled={busy} onClick={restore}>
                Restore original
              </button>
              <button className="rc-btn rc-btn--solid" type="button" disabled={busy} onClick={() => generate(true)}>
                Regenerate routine
              </button>
            </div>
          </section>

          <section className="rc-card rc-stack">
            <div>
              <h2 className="rc-card__title">Add an exercise</h2>
              <p className="rc-muted">Select exercises from the active library and set your own targets.</p>
            </div>

            {exercises.length === 0 ? (
              <p className="rc-muted">No active exercises are available yet.</p>
            ) : (
              <form className="rc-grid" onSubmit={addExercise}>
                <label className="rc-field">
                  Exercise
                  <select
                    className="rc-input rc-select"
                    value={addForm.exerciseId}
                    onChange={(event) => setAddForm((form) => ({ ...form, exerciseId: event.target.value }))}
                    required
                  >
                    <option value="">Choose exercise</option>
                    {exercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name} · {exercise.muscle_group}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rc-field">
                  Workout day
                  <input
                    className="rc-input"
                    value={addForm.dayLabel}
                    maxLength="40"
                    onChange={(event) => setAddForm((form) => ({ ...form, dayLabel: event.target.value }))}
                    required
                  />
                </label>
                <label className="rc-field">
                  Sets
                  <input
                    className="rc-input"
                    type="number"
                    min="1"
                    max="20"
                    value={addForm.sets}
                    onChange={(event) => setAddForm((form) => ({ ...form, sets: event.target.value }))}
                    required
                  />
                </label>
                <label className="rc-field">
                  Reps
                  <input
                    className="rc-input"
                    type="number"
                    min="1"
                    max="100"
                    value={addForm.reps}
                    onChange={(event) => setAddForm((form) => ({ ...form, reps: event.target.value }))}
                    required
                  />
                </label>
                <label className="rc-field">
                  Target weight (kg)
                  <input
                    className="rc-input"
                    type="number"
                    min="0"
                    step="0.25"
                    value={addForm.weight}
                    onChange={(event) => setAddForm((form) => ({ ...form, weight: event.target.value }))}
                  />
                </label>
                <div className="rc-submit">
                  <button className="rc-btn rc-btn--solid" disabled={busy}>
                    {busy ? 'Saving…' : 'Add to routine'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="rc-list">
            {(routine.routine_exercises || []).map((item) => (
              <RoutineExercise
                key={item.id}
                item={item}
                busy={busy}
                alternatives={alternatives[item.id]}
                onSave={saveExercise}
                onFindAlternatives={findAlternatives}
                onReplace={replaceExercise}
                onRemove={() => {
                  if (
                    window.confirm(
                      `Remove ${item.exercises?.name || 'this exercise'} from your active routine? Workout history will be preserved.`
                    )
                  ) {
                    perform(() => workoutService.removeRoutineExercise(item.id), 'Exercise removed from routine.');
                  }
                }}
              />
            ))}
            {routine.routine_exercises?.length === 0 && (
              <div className="rc-card">
                <p className="rc-muted">This routine is empty. Add exercises above or generate a new routine.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function RoutineExercise({ item, busy, alternatives, onSave, onFindAlternatives, onReplace, onRemove }) {
  const [values, setValues] = useState({
    day_label: item.day_label || '',
    sets: String(item.sets),
    reps: String(item.reps),
    target_weight_kg: item.target_weight_kg == null ? '' : String(item.target_weight_kg),
  });

  useEffect(() => {
    setValues({
      day_label: item.day_label || '',
      sets: String(item.sets),
      reps: String(item.reps),
      target_weight_kg: item.target_weight_kg == null ? '' : String(item.target_weight_kg),
    });
  }, [item.day_label, item.sets, item.reps, item.target_weight_kg]);

  return (
    <article className="rc-card rc-ex">
      <div className="rc-ex__head">
        <div>
          <h3 className="rc-ex__name">{item.exercises?.name || 'Exercise'}</h3>
          <p className="rc-ex__meta">
            {item.exercises?.muscle_group || 'Muscle group not set'} · {item.exercises?.difficulty || 'Difficulty not set'}
          </p>
        </div>
        <button className="rc-btn rc-btn--danger" type="button" disabled={busy} onClick={onRemove}>
          Remove
        </button>
      </div>

      <form className="rc-grid" onSubmit={(event) => onSave(event, item, values)}>
        <label className="rc-field">
          Workout day
          <input
            className="rc-input"
            maxLength="40"
            value={values.day_label}
            onChange={(event) => setValues((current) => ({ ...current, day_label: event.target.value }))}
            required
          />
        </label>
        <label className="rc-field">
          Sets
          <input
            className="rc-input"
            type="number"
            min="1"
            max="20"
            value={values.sets}
            onChange={(event) => setValues((current) => ({ ...current, sets: event.target.value }))}
            required
          />
        </label>
        <label className="rc-field">
          Reps
          <input
            className="rc-input"
            type="number"
            min="1"
            max="100"
            value={values.reps}
            onChange={(event) => setValues((current) => ({ ...current, reps: event.target.value }))}
            required
          />
        </label>
        <label className="rc-field">
          Target weight (kg)
          <input
            className="rc-input"
            type="number"
            min="0"
            step="0.25"
            value={values.target_weight_kg}
            onChange={(event) => setValues((current) => ({ ...current, target_weight_kg: event.target.value }))}
          />
        </label>
        <div className="rc-submit">
          <button className="rc-btn rc-btn--outline" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save targets'}
          </button>
        </div>
      </form>

      <div>
        <button className="rc-link" type="button" onClick={() => onFindAlternatives(item)}>
          Find available alternatives
        </button>

        {alternatives && (
          <div className="rc-alt">
            <p className="rc-muted">
              Alternatives use the same muscle group and only list exercises whose required equipment is currently
              marked available. Equipment status is maintained by gym staff.
            </p>
            {alternatives.length === 0 ? (
              <p className="rc-muted">No currently compatible alternatives found.</p>
            ) : (
              <ul className="rc-alt__list">
                {alternatives.map((exercise) => (
                  <li className="rc-alt__item" key={exercise.id}>
                    <span className="rc-alt__name">
                      {exercise.name} <span className="rc-alt__diff">· {exercise.difficulty}</span>
                    </span>
                    <button
                      className="rc-btn rc-btn--outline rc-btn--sm"
                      type="button"
                      disabled={busy}
                      onClick={() => onReplace(item, exercise.id)}
                    >
                      Use this exercise
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </article>
  );
}