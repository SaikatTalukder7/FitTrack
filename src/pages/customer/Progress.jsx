import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import LineChart from '../../components/charts/LineChart.jsx';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import * as progressService from '../../services/progressService.js';
import './Progress.css';

const METRICS = [
  ['body_weight_kg', 'Body weight', ' kg'],
  ['chest_cm', 'Chest', ' cm'],
  ['waist_cm', 'Waist', ' cm'],
  ['hips_cm', 'Hips', ' cm'],
  ['arm_cm', 'Arm', ' cm'],
  ['thigh_cm', 'Thigh', ' cm'],
];

export default function Progress() {
  const { profile } = useAuth();
  const [metric, setMetric] = useState('body_weight_kg');
  const [series, setSeries] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      setError('Your account information is not ready. Refresh the page and try again.');
      return;
    }
    setLoading(true);
    setError('');
    const [measurements, logs] = await Promise.all([
      progressService.getProgressSeries(profile.id, metric),
      progressService.getExercisePerformance(profile.id, { limit: 500 }),
    ]);
    const failed = [measurements, logs].find((result) => result.error);
    setSeries(measurements.data || []);
    setPerformance(logs.data || []);
    setError(failed?.error?.message || '');
    setLoading(false);
  }, [profile?.id, metric]);

  useEffect(() => {
    load();
  }, [load]);

  const exercises = useMemo(() => {
    const unique = new Map();
    for (const log of performance) unique.set(log.exercise_id, log.exercises?.name || 'Exercise');
    return [...unique.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [performance]);

  const [exerciseId, setExerciseId] = useState('');

  useEffect(() => {
    if (exercises.length && !exercises.some(([id]) => id === exerciseId)) setExerciseId(exercises[0][0]);
  }, [exercises, exerciseId]);

  const selectedExercise = performance.filter((log) => log.exercise_id === exerciseId && log.weight_kg != null);
  const performanceByDay = new Map();
  for (const log of selectedExercise) {
    const date = log.workout_sessions?.started_at?.slice(0, 10) || log.created_at?.slice(0, 10);
    const value = Number(log.weight_kg);
    if (!date) continue;
    const current = performanceByDay.get(date);
    if (!current || value > current.value) performanceByDay.set(date, { date, value });
  }

  const metricInfo = METRICS.find(([key]) => key === metric);

  return (
    <div className="pg-page">
      <header className="pg-head">
        <div>
          <p className="pg-eyebrow">FitTrack / Member</p>
          <h1 className="pg-title">Fitness progress</h1>
          <p className="pg-sub">Charts use your actual saved measurements and completed workout set logs.</p>
        </div>
        <Link className="pg-btn pg-btn--outline" to="/app/measurements">
          Record a measurement
        </Link>
      </header>

      {error && (
        <Alert type="error" title="Could not load progress">
          {error}
        </Alert>
      )}

      {/* Body measurements */}
      <section className="pg-card">
        <div className="pg-card__head">
          <div>
            <h2 className="pg-card__title">Body measurements</h2>
            <p className="pg-muted">Choose a measurement to see its history.</p>
          </div>
          <label className="pg-field">
            Measurement
            <select
              className="pg-select"
              value={metric}
              onChange={(event) => setMetric(event.target.value)}
            >
              {METRICS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="pg-chart">
          {loading ? (
            <Spinner label="Loading progress" />
          ) : (
            <LineChart
              title={`${metricInfo?.[1] || 'Measurement'} over time`}
              description={`Recorded ${metricInfo?.[1]?.toLowerCase() || 'measurement'} values over time.`}
              points={series}
              unit={metricInfo?.[2] || ''}
              color="#0d4b3c"
            />
          )}
        </div>
      </section>

      {/* Exercise performance */}
      <section className="pg-card">
        <div className="pg-card__head">
          <div>
            <h2 className="pg-card__title">Exercise performance</h2>
            <p className="pg-muted">Highest logged weight per completed workout day for the selected exercise.</p>
          </div>
          {exercises.length > 0 && (
            <label className="pg-field">
              Exercise
              <select
                className="pg-select"
                value={exerciseId}
                onChange={(event) => setExerciseId(event.target.value)}
              >
                {exercises.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="pg-chart">
          {loading ? (
            <Spinner label="Loading workout performance" />
          ) : !performance.length ? (
            <div className="pg-empty">
              Complete a workout and log sets with weights to see exercise performance.
            </div>
          ) : (
            <LineChart
              title={`${exercises.find(([id]) => id === exerciseId)?.[1] || 'Exercise'} logged weight`}
              description="Maximum logged weight per completed training date."
              points={[...performanceByDay.values()].sort((a, b) => a.date.localeCompare(b.date))}
              unit=" kg"
              color="#0d4b3c"
            />
          )}
        </div>
      </section>
    </div>
  );
}