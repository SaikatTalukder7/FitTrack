import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import * as workoutService from '../../services/workoutService.js';
import './MyRoutine.css';

export default function MyRoutine() {
  const { profile, isDevMode } = useAuth();
  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRoutine = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const result = await workoutService.getActiveRoutine(profile.id);
    setRoutine(result.data || null);
    setError(result.error?.message || '');
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    loadRoutine();
  }, [loadRoutine]);

  const exercises = routine?.routine_exercises || [];
  const groupedExercises = exercises.reduce((groups, item) => {
    const day = item.day_label || 'General';
    if (!groups[day]) groups[day] = [];
    groups[day].push(item);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="mr-page">
        <section className="mr-card mr-card--center">
          <Spinner label="Loading your workout routine" />
        </section>
      </div>
    );
  }

  return (
    <div className="mr-page">
      <header className="mr-head">
        <div>
          <h1 className="mr-title">My Routine</h1>
          <p className="mr-sub">Your saved workout plan and exercises.</p>
        </div>
        <div className="mr-actions">
          {routine && (
            <Link className="mr-btn mr-btn--solid" to="/app/session">
              Start workout
            </Link>
          )}
          {routine && (
            <Link className="mr-btn mr-btn--outline" to="/app/routine/customize">
              Customize routine
            </Link>
          )}
          <button type="button" onClick={loadRoutine} className="mr-btn mr-btn--outline">
            Refresh
          </button>
        </div>
      </header>

      {isDevMode && (
        <Alert type="warning" title="Development mode">
          Could not load your saved workout routine. Check that the server is running.
        </Alert>
      )}
      {error && (
        <Alert type="error" title="Routine error">
          {error}
        </Alert>
      )}

      {error ? (
        <section className="mr-card mr-card--center">
          <p className="mr-muted">Your routine could not be loaded.</p>
          <button type="button" onClick={loadRoutine} className="mr-btn mr-btn--solid">
            Try again
          </button>
        </section>
      ) : !routine ? (
        <section className="mr-card mr-card--center">
          <h2 className="mr-card__title">No active routine yet</h2>
          <p className="mr-muted mr-narrow">Create a routine to start planning and tracking your workouts.</p>
          <Link className="mr-btn mr-btn--solid" to="/app/routine/customize">
            Set up my routine
          </Link>
        </section>
      ) : (
        <>
          <section className="mr-card">
            <div className="mr-plan">
              <div>
                <p className="mr-eyebrow">Active workout plan</p>
                <h2 className="mr-plan__name">{routine.name || 'My Workout Routine'}</h2>
              </div>
              <span className="mr-tag">Active</span>
            </div>

            <div className="mr-stats">
              <div className="mr-stat">
                <p className="mr-stat__label">Training days</p>
                <p className="mr-stat__value">{Object.keys(groupedExercises).length}</p>
              </div>
              <div className="mr-stat">
                <p className="mr-stat__label">Exercises</p>
                <p className="mr-stat__value">{exercises.length}</p>
              </div>
              <div className="mr-stat">
                <p className="mr-stat__label">Routine status</p>
                <p className="mr-stat__value mr-stat__value--live">Active</p>
              </div>
            </div>
          </section>

          {exercises.length === 0 ? (
            <section className="mr-card mr-card--center">
              <p className="mr-muted">
                Your routine exists, but no exercises have been added yet. Please contact your gym administrator.
              </p>
            </section>
          ) : (
            Object.entries(groupedExercises).map(([day, items]) => (
              <section key={day} className="mr-card">
                <div className="mr-day__head">
                  <h2 className="mr-card__title">{day}</h2>
                  <span className="mr-pill">{items.length} exercises</span>
                </div>

                <div className="mr-list">
                  {items.map((item, index) => (
                    <div key={item.id} className="mr-ex">
                      <div className="mr-ex__num">{index + 1}</div>
                      <div className="mr-ex__body">
                        <h3 className="mr-ex__name">{item.exercises?.name || 'Exercise'}</h3>
                        <p className="mr-ex__meta">
                          {item.exercises?.muscle_group || 'General'}
                          {item.exercises?.difficulty ? ` · ${item.exercises.difficulty}` : ''}
                        </p>
                        <div className="mr-chips">
                          <span className="mr-chip">{item.sets} sets</span>
                          <span className="mr-chip">{item.reps} reps</span>
                          {item.target_weight_kg != null && (
                            <span className="mr-chip">{item.target_weight_kg} kg</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}