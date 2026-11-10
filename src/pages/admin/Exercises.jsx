import { useCallback, useEffect, useState } from 'react';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import * as exerciseService from '../../services/exerciseService.js';
import * as equipmentService from '../../services/equipmentService.js';
import { MUSCLE_GROUPS, DIFFICULTIES } from '../../utils/constants.js';
import './AdminPage.css';
import './Exercises.css';

const empty = { name: '', muscle_group: 'chest', difficulty: 'beginner', description: '' };

export default function AdminExercises() {
  const [items, setItems] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [equipmentIds, setEquipmentIds] = useState([]);
  const [equipmentLoadError, setEquipmentLoadError] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [exerciseResult, equipmentResult] = await Promise.all([
      exerciseService.listExercises({ includeInactive: true }),
      equipmentService.listEquipment(),
    ]);
    setItems(exerciseResult.data || []);
    setEquipment(equipmentResult.data || []);
    setError(exerciseResult.error?.message || equipmentResult.error?.message || '');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (equipmentLoadError) {
      setError('Equipment links could not be loaded. Cancel and reopen this exercise before saving.');
      return;
    }
    setSaving(true);
    const r = editing
      ? await exerciseService.updateExercise(editing, form)
      : await exerciseService.createExercise(form);
    if (r.error) {
      setError(r.error.message);
    } else {
      const id = editing || r.data.id;
      const equipmentResult = await equipmentService.setExerciseEquipment(id, equipmentIds);
      if (equipmentResult.error) {
        setError(`Exercise was saved, but its equipment links were not saved: ${equipmentResult.error.message}`);
        setSaving(false);
        await load();
        return;
      }
      setNotice(editing ? 'Exercise and equipment links updated.' : 'Exercise created.');
      setForm(empty);
      setEditing(null);
      setEquipmentIds([]);
      await load();
    }
    setSaving(false);
  }

  async function edit(item) {
    setEditing(item.id);
    setForm({
      name: item.name,
      muscle_group: item.muscle_group,
      difficulty: item.difficulty,
      description: item.description || '',
      is_active: item.is_active,
    });
    setEquipmentIds([]);
    setEquipmentLoadError(true);
    setError('');
    const linked = await equipmentService.listExerciseEquipment(item.id);
    if (linked.error) {
      setEquipmentLoadError(true);
      setError(linked.error.message);
    } else {
      setEquipmentIds((linked.data || []).map((relation) => relation.equipment_id));
      setEquipmentLoadError(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(empty);
    setEquipmentIds([]);
    setEquipmentLoadError(false);
  }

  async function toggle(item) {
    setError('');
    const r = await exerciseService.updateExercise(item.id, { is_active: !item.is_active });
    if (r.error) setError(r.error.message);
    else setNotice(item.is_active ? 'Exercise deactivated.' : 'Exercise activated.');
    await load();
  }

  return (
    <div className="ap-page">
      <div className="ap-head">
        <div>
          <h1 className="ap-title">Exercise Library</h1>
          <p className="ap-sub">Add and maintain exercises used in workout splits.</p>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Something went wrong">
          {error}
        </Alert>
      )}
      {notice && <Alert type="success">{notice}</Alert>}

      <form className="ap-card ex-form" onSubmit={submit}>
        <h2 className="ex-form__title">{editing ? 'Edit exercise' : 'Add exercise'}</h2>

        <div className="ex-grid">
          <label className="ex-field">
            Exercise name
            <input
              className="ap-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              minLength={2}
              maxLength={120}
              required
            />
          </label>

          <label className="ex-field">
            Muscle group
            <select
              className="ap-input ex-select"
              value={form.muscle_group}
              onChange={(e) => setForm({ ...form, muscle_group: e.target.value })}
            >
              {MUSCLE_GROUPS.map((x) => (
                <option key={x} value={x}>
                  {x.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>

          <label className="ex-field">
            Difficulty
            <select
              className="ap-input ex-select"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            >
              {DIFFICULTIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>

          <label className="ex-field ex-field--wide">
            Description
            <textarea
              className="ap-input ex-textarea"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={2000}
            />
          </label>
        </div>

        <fieldset className="ex-fieldset">
          <legend className="ex-legend">Required equipment</legend>
          <p className="ex-hint">
            Customer alternatives will only include exercises whose required equipment is marked available.
          </p>
          {equipment.length ? (
            <div className="ex-checks">
              {equipment.map((item) => (
                <label className="ex-check" key={item.id}>
                  <input
                    type="checkbox"
                    checked={equipmentIds.includes(item.id)}
                    onChange={(event) =>
                      setEquipmentIds((ids) =>
                        event.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id)
                      )
                    }
                  />
                  <span>
                    {item.name} <span className="ex-status">· {item.status}</span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="ex-hint">Add equipment records before linking equipment to exercises.</p>
          )}
        </fieldset>

        <div className="ex-actions">
          <button className="ap-btn ap-btn--solid" disabled={saving || equipmentLoadError}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create exercise'}
          </button>
          {editing && (
            <button className="ap-btn" type="button" onClick={cancelEdit}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <section className="ap-card">
        <h2 className="ap-card__title">Exercises</h2>
        {loading ? (
          <Spinner label="Loading exercises" />
        ) : !items.length ? (
          <p className="ap-empty">No exercises found.</p>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Muscle</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((x) => (
                  <tr key={x.id}>
                    <td className="ex-name">{x.name}</td>
                    <td>{x.muscle_group}</td>
                    <td>{x.difficulty}</td>
                    <td>
                      <span className={`ex-tag ${x.is_active ? 'ex-tag--on' : 'ex-tag--off'}`}>
                        {x.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="ex-row-actions">
                        <button className="ex-btn" onClick={() => edit(x)} type="button">
                          Edit
                        </button>
                        <button className="ex-btn" onClick={() => toggle(x)} type="button">
                          {x.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
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