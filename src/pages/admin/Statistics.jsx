import { useEffect, useMemo, useState } from 'react';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import * as profileService from '../../services/profileService.js';
import * as attendanceService from '../../services/attendanceService.js';
import * as membershipService from '../../services/membershipService.js';
import * as paymentService from '../../services/paymentService.js';
import {
  PeriodControls,
  ColumnChart,
  buildBuckets,
  getRange,
  toYmd,
  UNIT_LABEL,
} from './ReportParts.jsx';
import './AdminPage.css';
import './PeriodReport.css';
import './Statistics.css';

const money = (n) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

export default function AdminStatistics() {
  const [period, setPeriod] = useState('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [data, setData] = useState({ customers: [], attendance: [], memberships: [], payments: [] });
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
      const [customers, attendance, memberships, payments] = await Promise.all([
        profileService.listCustomers(),
        attendanceService.listAttendance({ fromDate, toDate }),
        membershipService.listMemberships(),
        paymentService.listPayments({ status: 'paid' }),
      ]);
      if (cancelled) return;
      const failed = [customers, attendance, memberships, payments].find((r) => r.error);
      setError(failed ? failed.error.message || 'Some statistics could not be loaded.' : '');
      setData({
        customers: customers.data || [],
        attendance: attendance.data || [],
        memberships: memberships.data || [],
        payments: payments.data || [],
      });
      setLoading(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate]);

  const inRange = (ymd) => Boolean(ymd) && ymd >= fromDate && ymd <= toDate;

  const newCustomers = useMemo(
    () => data.customers.filter((c) => c.created_at && inRange(toYmd(new Date(c.created_at)))),
    [data.customers, fromDate, toDate]
  );
  const newMemberships = useMemo(
    () => data.memberships.filter((m) => inRange(m.start_date)),
    [data.memberships, fromDate, toDate]
  );
  // Payments are counted by the date they were marked paid.
  const paidPayments = useMemo(
    () => data.payments.filter((p) => p.paid_at && inRange(toYmd(new Date(p.paid_at)))),
    [data.payments, fromDate, toDate]
  );

  const collected = paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const checkinBuckets = useMemo(
    () =>
      buildBuckets(
        period,
        anchor,
        data.attendance.map((row) => ({
          ymd: row.check_date,
          hour: row.checked_in_at ? new Date(row.checked_in_at).getHours() : null,
          value: 1,
        }))
      ),
    [period, anchor, data.attendance]
  );

  const moneyBuckets = useMemo(
    () =>
      buildBuckets(
        period,
        anchor,
        paidPayments.map((p) => {
          const paidAt = new Date(p.paid_at);
          return { ymd: toYmd(paidAt), hour: paidAt.getHours(), value: Number(p.amount || 0) };
        })
      ),
    [period, anchor, paidPayments]
  );

  const unit = UNIT_LABEL[period];

  return (
    <div className="ap-page">
      <div className="ap-head">
        <div>
          <h1 className="ap-title">Statistics</h1>
          <p className="ap-sub">Gym activity for the selected day, week, month or year.</p>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Could not load statistics">
          {error}
        </Alert>
      )}

      <section className="ap-card">
        <PeriodControls
          period={period}
          anchor={anchor}
          onPeriodChange={setPeriod}
          onAnchorChange={setAnchor}
        />
      </section>

      {loading ? (
        <section className="ap-card">
          <Spinner label="Loading statistics" />
        </section>
      ) : (
        <>
          <section className="ap-stats">
            <div className="ap-stat">
              <p className="ap-stat__label">New customers</p>
              <p className="ap-stat__value">{newCustomers.length}</p>
            </div>
            <div className="ap-stat">
              <p className="ap-stat__label">Check-ins</p>
              <p className="ap-stat__value">{data.attendance.length}</p>
            </div>
            <div className="ap-stat">
              <p className="ap-stat__label">New memberships</p>
              <p className="ap-stat__value">{newMemberships.length}</p>
            </div>
            <div className="ap-stat">
              <p className="ap-stat__label">Collected</p>
              <p className="ap-stat__value">{money(collected)}</p>
            </div>
          </section>

          <section className="ap-card">
            <h2 className="ap-card__title">Check-ins by {unit}</h2>
            <ColumnChart buckets={checkinBuckets} ariaLabel={`Check-ins by ${unit}`} />
          </section>

          <section className="ap-card">
            <h2 className="ap-card__title">Collected by {unit}</h2>
            <ColumnChart buckets={moneyBuckets} format={money} ariaLabel={`Payments collected by ${unit}`} />
          </section>

          <p className="st-note">
            Payments are counted on the date they were marked paid. Memberships are counted on their start date.
          </p>
        </>
      )}
    </div>
  );
}