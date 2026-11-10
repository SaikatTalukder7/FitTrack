import { useEffect, useMemo, useState } from 'react';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import * as attendanceService from '../../services/attendanceService.js';
import {
  PeriodControls,
  ColumnChart,
  buildBuckets,
  getRange,
  toYmd,
  peakOf,
  UNIT_LABEL,
} from './ReportParts.jsx';
import './AdminPage.css';
import './PeriodReport.css';
import './Attendance.css';

export default function AdminAttendance() {
  const [period, setPeriod] = useState('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { start, end } = getRange(period, anchor);
  const fromDate = toYmd(start);
  const toDate = toYmd(end);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError('');
      const result = await attendanceService.listAttendance({ fromDate, toDate });
      if (cancelled) return;
      setError(result.error?.message || '');
      setRecords(result.data || []);
      setLoading(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate]);

  const items = useMemo(
    () =>
      records.map((row) => ({
        ymd: row.check_date,
        hour: row.checked_in_at ? new Date(row.checked_in_at).getHours() : null,
        value: 1,
      })),
    [records]
  );

  const buckets = useMemo(() => buildBuckets(period, anchor, items), [period, anchor, items]);
  const peak = peakOf(buckets);
  const unit = UNIT_LABEL[period];
  const uniqueCustomers = new Set(records.map((r) => r.customer_id)).size;

  return (
    <div className="ap-page">
      <div className="ap-head">
        <div>
          <h1 className="ap-title">Attendance</h1>
          <p className="ap-sub">Check-ins for the selected day, week, month or year.</p>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Could not load attendance">
          {error}
        </Alert>
      )}

      <section className="ap-card at-controls">
        <PeriodControls
          period={period}
          anchor={anchor}
          onPeriodChange={setPeriod}
          onAnchorChange={setAnchor}
        />
      </section>

      {loading ? (
        <section className="ap-card">
          <Spinner label="Loading attendance" />
        </section>
      ) : (
        <>
          <section className="ap-stats">
            <div className="ap-stat">
              <p className="ap-stat__label">Total check-ins</p>
              <p className="ap-stat__value">{records.length}</p>
            </div>
            <div className="ap-stat">
              <p className="ap-stat__label">Unique customers</p>
              <p className="ap-stat__value">{uniqueCustomers}</p>
            </div>
            <div className="ap-stat">
              <p className="ap-stat__label">Busiest {unit}</p>
              <p className="ap-stat__value">{peak ? `${peak.label} (${peak.value})` : '—'}</p>
            </div>
          </section>

          <section className="ap-card">
            <h2 className="ap-card__title">Check-ins by {unit}</h2>
            <ColumnChart buckets={buckets} ariaLabel={`Check-ins by ${unit}`} />
          </section>

          <section className="ap-card">
            <h2 className="ap-card__title">Details</h2>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Check-ins</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((b) => (
                    <tr key={b.key}>
                      <td>{b.label}</td>
                      <td className={`at-count${b.count === 0 ? ' at-muted' : ''}`}>{b.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}