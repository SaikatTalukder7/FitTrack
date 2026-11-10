import { useEffect, useState } from 'react';
import { MUSCLE_GROUPS } from '../../utils/constants.js';
import './Splits.css';

export const START_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const MAX_GROUPS_PER_DAY = 2;

export const muscleLabel = (value) => value.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// The seven days, starting from the chosen start day.
export function daysFrom(startDay) {
  const start = Math.max(0, START_DAYS.indexOf(startDay || 'Saturday'));
  return [...START_DAYS.slice(start), ...START_DAYS.slice(0, start)];
}

// Builds the 7-day plan that is saved to the database.
export function buildDays(startDay, restDay, groupsByDay) {
  return daysFrom(startDay).map((day) => ({
    day_name: day,
    is_rest: day === restDay,
    muscle_groups: day === restDay ? [] : groupsByDay[day] || [],
  }));
}

// Returns a message if the plan is not valid yet, otherwise null.
export function scheduleProblem(days) {
  const rests = days.filter((d) => d.is_rest).length;
  if (rests !== 1) return 'Choose exactly one rest day.';
  for (const d of days) {
    if (!d.is_rest && (d.muscle_groups.length < 1 || d.muscle_groups.length > MAX_GROUPS_PER_DAY)) {
      return `Choose 1 or 2 muscle groups for ${d.day_name}.`;
    }
  }
  return null;
}

// Converts saved plan rows into the editor's state.
export function planToState(days) {
  const restDay = days.find((d) => d.is_rest)?.day_name || '';
  const groupsByDay = {};
  days.forEach((d) => {
    groupsByDay[d.day_name] = d.muscle_groups || [];
  });
  return { restDay, groupsByDay };
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="sp-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sp-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sp-dialog__head">
          <h3 className="sp-dialog__title">{title}</h3>
          <button type="button" className="sp-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Popup with large tiles to choose one or two muscle groups for a training day.
export function MusclePicker({ day, initial, onSave, onClose }) {
  const [selected, setSelected] = useState(initial);

  function toggle(value) {
    setSelected((current) => {
      if (current.includes(value)) return current.filter((m) => m !== value);
      if (current.length >= MAX_GROUPS_PER_DAY) return current;
      return [...current, value];
    });
  }

  return (
    <Modal title={`Muscle groups · ${day}`} onClose={onClose}>
      <p className="sp-muted">Pick one or two groups for this training day.</p>

      <div className="mp-grid">
        {MUSCLE_GROUPS.map((value) => {
          const on = selected.includes(value);
          const locked = !on && selected.length >= MAX_GROUPS_PER_DAY;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              disabled={locked}
              className={`mp-tile${on ? ' is-on' : ''}`}
              onClick={() => toggle(value)}
            >
              <span className="mp-tile__name">{muscleLabel(value)}</span>
              {on && <span className="mp-tile__check" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>

      <div className="mp-footer">
        <span className="mp-count">
          {selected.length} of {MAX_GROUPS_PER_DAY} selected
        </span>
        <div className="sp-dialog__actions">
          <button
            className="ap-btn ap-btn--solid"
            type="button"
            disabled={selected.length === 0}
            onClick={() => onSave(selected)}
          >
            Save muscles
          </button>
          <button className="ap-btn" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

// The 7-day plan as boxes: one card per day, in a grid.
export function ScheduleEditor({ startDay, restDay, groupsByDay, onRestChange, onGroupsChange }) {
  const [pickerDay, setPickerDay] = useState(null);
  const days = daysFrom(startDay);
  const trainingDays = days.filter((day) => day !== restDay);
  const plannedCount = trainingDays.filter((day) => (groupsByDay[day] || []).length > 0).length;

  return (
    <>
      <div className="wp-summary">
        <span>
          Rest day: <strong>{restDay || 'not chosen'}</strong>
        </span>
        <span>
          Training days with muscles: <strong>{plannedCount}</strong> of {trainingDays.length}
        </span>
      </div>

      <div className="wp-week">
        {days.map((day, index) => {
          const isRest = day === restDay;
          const groups = groupsByDay[day] || [];
          return (
            <div key={day} className={`wp-day${isRest ? ' is-rest' : ''}`}>
              <div className="wp-day__top">
                <span className="wp-day__index">{index + 1}</span>
                <span className="wp-day__name">{day}</span>
              </div>

              {isRest ? (
                <div className="wp-day__rest">Rest and recovery</div>
              ) : (
                <div className="wp-day__body">
                  <div className="wp-pills">
                    {groups.length ? (
                      groups.map((g) => (
                        <span key={g} className="wp-pill">
                          {muscleLabel(g)}
                        </span>
                      ))
                    ) : (
                      <span className="wp-empty">No muscles chosen</span>
                    )}
                  </div>
                  <button type="button" className="wp-btn" onClick={() => setPickerDay(day)}>
                    {groups.length ? 'Change muscles' : 'Choose muscles'}
                  </button>
                </div>
              )}

              <button
                type="button"
                className={`wp-rest${isRest ? ' is-on' : ''}`}
                aria-pressed={isRest}
                onClick={() => onRestChange(day)}
              >
                {isRest ? 'Rest day ✓' : 'Set as rest day'}
              </button>
            </div>
          );
        })}
      </div>

      {pickerDay && (
        <MusclePicker
          day={pickerDay}
          initial={groupsByDay[pickerDay] || []}
          onClose={() => setPickerDay(null)}
          onSave={(selection) => {
            onGroupsChange(pickerDay, selection);
            setPickerDay(null);
          }}
        />
      )}
    </>
  );
}

// Edit an existing split's start day and weekly plan.
export function ScheduleModal({ split, days, busy, onClose, onSave }) {
  const initial = planToState(days);
  const [startDay, setStartDay] = useState(split.start_day || 'Saturday');
  const [restDay, setRestDay] = useState(initial.restDay);
  const [groupsByDay, setGroupsByDay] = useState(initial.groupsByDay);
  const problem = scheduleProblem(buildDays(startDay, restDay, groupsByDay));

  return (
    <Modal title={`Weekly plan · ${split.name}`} onClose={onClose}>
      <label className="sp-field">
        Start day of the week
        <select className="ap-input sp-select" value={startDay} onChange={(e) => setStartDay(e.target.value)}>
          {START_DAYS.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </label>

      <ScheduleEditor
        startDay={startDay}
        restDay={restDay}
        groupsByDay={groupsByDay}
        onRestChange={setRestDay}
        onGroupsChange={(day, selection) => setGroupsByDay((current) => ({ ...current, [day]: selection }))}
      />

      {problem && <p className="sp-warn">{problem}</p>}

      <div className="sp-dialog__actions">
        <button
          className="ap-btn ap-btn--solid"
          type="button"
          disabled={busy || Boolean(problem)}
          onClick={() => onSave(startDay, restDay, groupsByDay)}
        >
          {busy ? 'Saving…' : 'Save weekly plan'}
        </button>
        <button className="ap-btn" type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// Popup to add exercises to one training day, from that day's muscle groups.
export function ExercisePicker({ day, groups, exercises, takenIds, busy, onAdd, onClose }) {
  const [filter, setFilter] = useState('all');
  const [picked, setPicked] = useState([]);

  const list = exercises.filter(
    (e) =>
      groups.includes(e.muscle_group) &&
      !takenIds.includes(e.id) &&
      (filter === 'all' || e.muscle_group === filter)
  );

  function togglePick(id) {
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  return (
    <Modal title={`Add exercises · ${day}`} onClose={onClose}>
      <div className="sp-chips">
        <button
          type="button"
          aria-pressed={filter === 'all'}
          className={`sp-chip${filter === 'all' ? ' is-on' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={filter === g}
            className={`sp-chip${filter === g ? ' is-on' : ''}`}
            onClick={() => setFilter(g)}
          >
            {muscleLabel(g)}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="sp-muted">
          No more active exercises for these muscle groups. Add exercises in the Exercises page first.
        </p>
      ) : (
        <div className="sp-pick-list">
          {list.map((e) => (
            <label key={e.id} className="sp-pick">
              <input type="checkbox" checked={picked.includes(e.id)} onChange={() => togglePick(e.id)} />
              <span>
                {e.name} <em>({muscleLabel(e.muscle_group)})</em>
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="sp-dialog__actions">
        <button
          className="ap-btn ap-btn--solid"
          type="button"
          disabled={busy || picked.length === 0}
          onClick={() => onAdd(picked)}
        >
          {busy ? 'Adding…' : `Add ${picked.length || ''} exercise${picked.length === 1 ? '' : 's'}`}
        </button>
        <button className="ap-btn" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}