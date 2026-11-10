import { useCallback, useEffect, useState } from 'react';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import * as exerciseService from '../../services/exerciseService.js';
import * as workoutService from '../../services/workoutService.js';
import * as scheduleService from '../../services/splitScheduleService.js';
import {
  START_DAYS,
  Modal,
  ScheduleEditor,
  ScheduleModal,
  ExercisePicker,
  buildDays,
  daysFrom,
  muscleLabel,
  scheduleProblem,
} from './SplitParts.jsx';
import './AdminPage.css';
import './Splits.css';

export default function AdminSplits() {
  const [splits, setSplits] = useState([]);
  const [daysBySplit, setDaysBySplit] = useState({});
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Create form. The start day starts empty, so the 7-day plan appears only after it is chosen.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDay, setStartDay] = useState('');
  const [createRest, setCreateRest] = useState('Friday');
  const [createGroups, setCreateGroups] = useState({});

  // Popup state
  const [selectedId, setSelectedId] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [pickerDay, setPickerDay] = useState(null);

  const selected = splits.find((s) => s.id === selectedId) || null;
  const selectedDays = selected ? daysBySplit[selected.id] || [] : [];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [splitResult, exerciseResult, dayResult] = await Promise.all([
      workoutService.listSplits(),
      exerciseService.listExercises(),
      scheduleService.listSplitDays(),
    ]);
    const failed = [splitResult, exerciseResult, dayResult].find((r) => r.error);
    if (failed) setError(failed.error.message || 'Could not load workout splits.');

    const map = {};
    (dayResult.data || []).forEach((row) => {
      map[row.split_id] = [...(map[row.split_id] || []), row];
    });
    setSplits(splitResult.data || []);
    setExercises(exerciseResult.data || []);
    setDaysBySplit(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openSplit(id) {
    setError('');
    setNotice('');
    setEditingSchedule(false);
    setPickerDay(null);
    setSelectedId(id);
  }

  function closeSplit() {
    setEditingSchedule(false);
    setPickerDay(null);
    setSelectedId(null);
  }

  // Without a start day there is no 7-day plan yet, so the form is not valid.
  const createDays = startDay ? buildDays(startDay, createRest, createGroups) : [];
  const createProblem = !startDay ? 'Choose a start day first.' : scheduleProblem(createDays);

  async function createSplit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (createProblem) {
      setError(createProblem);
      return;
    }
    setSaving(true);
    const created = await workoutService.saveSplit({ name, description, start_day: startDay });
    if (created.error) {
      setSaving(false);
      setError(created.error.message);
      return;
    }
    const saved = await scheduleService.saveSplitSchedule(created.data?.id, createDays);
    setSaving(false);
    if (saved.error) {
      setError(
        `The split was created, but its weekly plan was not saved: ${saved.error.message} Open the split and set its plan again.`
      );
    } else {
      setNotice('Workout split created with its weekly plan.');
    }
    setName('');
    setDescription('');
    setStartDay('');
    setCreateRest('Friday');
    setCreateGroups({});
    await load();
  }

  async function saveScheduleEdit(nextStartDay, restDay, groupsByDay) {
    if (!selected) return;
    const nextDays = buildDays(nextStartDay, restDay, groupsByDay);
    const problem = scheduleProblem(nextDays);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    if (nextStartDay !== selected.start_day) {
      const changed = await workoutService.saveSplit({ id: selected.id, start_day: nextStartDay });
      if (changed.error) {
        setSaving(false);
        setError(changed.error.message);
        return;
      }
    }
    const saved = await scheduleService.saveSplitSchedule(selected.id, nextDays);
    setSaving(false);
    if (saved.error) {
      setError(saved.error.message);
      return;
    }
    setEditingSchedule(false);
    setNotice('Weekly plan saved.');
    await load();
  }

  async function removeSplit(split) {
    if (!window.confirm(`Delete "${split.name}"? Its weekly plan and exercises will also be removed.`)) return;
    setSaving(true);
    setError('');
    const result = await workoutService.deleteSplit(split.id);
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setNotice(`Deleted "${split.name}".`);
    closeSplit();
    await load();
  }

  // Saves the whole exercise list of the open split, then reloads.
  async function saveExerciseList(nextItems, message) {
    if (!selected) return false;
    setSaving(true);
    setError('');
    setNotice('');
    const result = await workoutService.setSplitExercises(selected.id, nextItems);
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return false;
    }
    setNotice(message);
    await load();
    return true;
  }

  function currentItems() {
    return (selected?.workout_split_exercises || []).map((item, index) => ({
      day_label: item.day_label,
      exercise_id: item.exercise_id,
      position: item.position ?? index,
    }));
  }

  async function addExercises(ids) {
    const day = pickerDay;
    const current = currentItems();
    const added = ids.map((exerciseId, i) => ({
      day_label: day,
      exercise_id: exerciseId,
      position: current.length + i,
    }));
    const ok = await saveExerciseList([...current, ...added], `Added to ${day}.`);
    if (ok) setPickerDay(null);
  }

  async function removeExercise(row) {
    const next = (selected?.workout_split_exercises || [])
      .filter((item) => item.id !== row.id)
      .map((item, index) => ({
        day_label: item.day_label,
        exercise_id: item.exercise_id,
        position: index,
      }));
    await saveExerciseList(next, `Removed ${row.exercises?.name || 'exercise'}.`);
  }

  // Values used inside the open split popup
  const planByDay = Object.fromEntries(selectedDays.map((d) => [d.day_name, d]));
  const restDay = selectedDays.find((d) => d.is_rest)?.day_name;
  const hasPlan = selectedDays.length === 7;
  const items = selected?.workout_split_exercises || [];
  const trainingDays = selectedDays.filter((d) => !d.is_rest).map((d) => d.day_name);
  const unassigned = items.filter((item) => !trainingDays.includes(item.day_label));

  return (
    <div className="ap-page">
      <div className="ap-head">
        <div>
          <h1 className="ap-title">Splits</h1>
          <p className="ap-sub">Create a split, then click its name to open the plan and add exercises.</p>
        </div>
      </div>

      {!selected && error && (
        <Alert type="error" title="Could not complete action">
          {error}
        </Alert>
      )}
      {!selected && notice && <Alert type="success">{notice}</Alert>}

      {/* Create split */}
      <form className="ap-card sp-create" onSubmit={createSplit}>
        <h2 className="sp-create__title">Create a split</h2>

        <div className="sp-grid">
          <label className="sp-field">
            Name
            <input className="ap-input" value={name} maxLength="120" onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="sp-field">
            Description
            <input
              className="ap-input"
              value={description}
              maxLength="1000"
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="sp-field">
            Start day of the week
            <select
              className="ap-input sp-select"
              value={startDay}
              onChange={(e) => setStartDay(e.target.value)}
              required
            >
              <option value="" disabled>
                Choose start day
              </option>
              {START_DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
        </div>

        {startDay ? (
          <div>
            <p className="sp-field__label">
              Weekly plan <span className="sp-hint">Set one rest day, then choose muscles for each training day.</span>
            </p>
            <ScheduleEditor
              startDay={startDay}
              restDay={createRest}
              groupsByDay={createGroups}
              onRestChange={setCreateRest}
              onGroupsChange={(day, selection) => setCreateGroups((current) => ({ ...current, [day]: selection }))}
            />
            {createProblem && <p className="sp-warn">{createProblem}</p>}
          </div>
        ) : (
          <p className="sp-muted">Choose a start day to see the 7-day plan.</p>
        )}

        <div>
          <button className="ap-btn ap-btn--solid" type="submit" disabled={saving || Boolean(createProblem)}>
            {saving ? 'Saving…' : 'Create split'}
          </button>
        </div>
      </form>

      {/* Split names */}
      <section className="ap-card">
        <h2 className="ap-card__title">Workout splits</h2>

        {loading ? (
          <Spinner label="Loading workout splits" />
        ) : splits.length === 0 ? (
          <p className="ap-empty">No workout splits have been created yet.</p>
        ) : (
          <div className="sn-grid">
            {splits.map((split) => (
              <button key={split.id} type="button" className="sn-card" onClick={() => openSplit(split.id)}>
                <span className="sn-card__name">{split.name}</span>
                <span className="sn-card__arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Split popup: full details */}
      {selected && (
        <Modal title={selected.name} onClose={closeSplit}>
          {error && (
            <Alert type="error" title="Could not complete action">
              {error}
            </Alert>
          )}
          {notice && <Alert type="success">{notice}</Alert>}

          <p className="sn-detail__meta">
            Starts {selected.start_day || 'Saturday'}
            {restDay ? ` · Rest day: ${restDay}` : ''}
            {selected.description ? ` · ${selected.description}` : ''}
          </p>

          <div className="sn-detail__actions">
            <button type="button" className="ap-btn" disabled={saving} onClick={() => setEditingSchedule(true)}>
              Edit weekly plan
            </button>
            <button className="sp-danger" type="button" disabled={saving} onClick={() => removeSplit(selected)}>
              Delete split
            </button>
          </div>

          {!hasPlan ? (
            <div className="sp-notice">
              No weekly plan yet. Click "Edit weekly plan" to choose the rest day and muscle groups.
            </div>
          ) : (
            <div className="sp-week">
              {daysFrom(selected.start_day).map((day) => {
                const plan = planByDay[day];
                if (!plan) return null;

                if (plan.is_rest) {
                  return (
                    <div key={day} className="sp-dayblock sp-dayblock--rest">
                      <p className="sp-dayblock__title">{day}</p>
                      <p className="sp-muted">Rest day</p>
                    </div>
                  );
                }

                const dayItems = items.filter((item) => item.day_label === day);
                return (
                  <div key={day} className="sp-dayblock">
                    <div className="sp-dayblock__head">
                      <div>
                        <p className="sp-dayblock__title">{day}</p>
                        <p className="sp-dayblock__groups">{plan.muscle_groups.map(muscleLabel).join(' + ')}</p>
                      </div>
                      <button type="button" className="ap-btn" disabled={saving} onClick={() => setPickerDay(day)}>
                        Add exercise
                      </button>
                    </div>

                    {dayItems.length === 0 ? (
                      <p className="sp-muted">No exercises yet.</p>
                    ) : (
                      dayItems.map((row) => (
                        <div key={row.id} className="sp-ex">
                          <div className="sp-ex__body">
                            <p className="sp-ex__name">{row.exercises?.name || 'Exercise'}</p>
                            <p className="sp-ex__meta">{muscleLabel(row.exercises?.muscle_group || '')}</p>
                          </div>
                          <button type="button" className="sp-remove" disabled={saving} onClick={() => removeExercise(row)}>
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {unassigned.length > 0 && (
            <div className="sp-unassigned">
              <p className="sp-dayblock__title">Needs a training day</p>
              <p className="sp-muted">
                These exercises do not match the current weekly plan. Remove them, then add them to the right day.
              </p>
              {unassigned.map((row) => (
                <div key={row.id} className="sp-ex">
                  <div className="sp-ex__body">
                    <p className="sp-ex__name">{row.exercises?.name || 'Exercise'}</p>
                    <p className="sp-ex__meta">Old day: {row.day_label}</p>
                  </div>
                  <button type="button" className="sp-remove" disabled={saving} onClick={() => removeExercise(row)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Nested popups for the open split */}
      {selected && editingSchedule && (
        <ScheduleModal
          split={selected}
          days={selectedDays}
          busy={saving}
          onClose={() => setEditingSchedule(false)}
          onSave={saveScheduleEdit}
        />
      )}

      {selected && pickerDay && (
        <ExercisePicker
          day={pickerDay}
          groups={planByDay[pickerDay]?.muscle_groups || []}
          exercises={exercises}
          takenIds={items.filter((item) => item.day_label === pickerDay).map((item) => item.exercise_id)}
          busy={saving}
          onAdd={addExercises}
          onClose={() => setPickerDay(null)}
        />
      )}
    </div>
  );
}