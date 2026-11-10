import './PeriodReport.css';

export const PERIODS = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export const UNIT_LABEL = { day: 'hour', week: 'day', month: 'day', year: 'month' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n) => String(n).padStart(2, '0');

// Local calendar date as YYYY-MM-DD (avoids time-zone shifts)
export function toYmd(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromYmd(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getRange(period, anchor) {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const d = anchor.getDate();
  if (period === 'day') return { start: new Date(y, m, d), end: new Date(y, m, d) };
  if (period === 'week') {
    const offset = (anchor.getDay() + 6) % 7; // Monday = 0
    return { start: new Date(y, m, d - offset), end: new Date(y, m, d - offset + 6) };
  }
  if (period === 'month') return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
  return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
}

export function shiftAnchor(anchor, period, dir) {
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  if (period === 'day') d.setDate(d.getDate() + dir);
  if (period === 'week') d.setDate(d.getDate() + 7 * dir);
  if (period === 'month') {
    d.setDate(1);
    d.setMonth(d.getMonth() + dir);
  }
  if (period === 'year') d.setFullYear(d.getFullYear() + dir);
  return d;
}

function formatDate(date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function rangeLabel(period, anchor) {
  const { start, end } = getRange(period, anchor);
  return period === 'day' ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;
}

// items: [{ ymd: 'YYYY-MM-DD', hour: 0-23 or null, value: number }]
export function buildBuckets(period, anchor, items) {
  const { start, end } = getRange(period, anchor);

  if (period === 'day') {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ key: h, label: `${pad(h)}:00`, value: 0, count: 0 }));
    items.forEach((item) => {
      if (item.hour == null) return;
      buckets[item.hour].value += item.value;
      buckets[item.hour].count += 1;
    });
    return buckets;
  }

  if (period === 'year') {
    const buckets = MONTHS.map((label, m) => ({ key: m, label, value: 0, count: 0 }));
    items.forEach((item) => {
      const m = Number(item.ymd.slice(5, 7)) - 1;
      buckets[m].value += item.value;
      buckets[m].count += 1;
    });
    return buckets;
  }

  const buckets = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    buckets.push({
      key: toYmd(cursor),
      label:
        period === 'week'
          ? cursor.toLocaleDateString('en-GB', { weekday: 'short' })
          : String(cursor.getDate()),
      value: 0,
      count: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  const index = new Map(buckets.map((b) => [b.key, b]));
  items.forEach((item) => {
    const bucket = index.get(item.ymd);
    if (!bucket) return;
    bucket.value += item.value;
    bucket.count += 1;
  });
  return buckets;
}

export function peakOf(buckets) {
  let best = null;
  buckets.forEach((b) => {
    if (b.value > 0 && (!best || b.value > best.value)) best = b;
  });
  return best;
}

export function PeriodControls({ period, anchor, onPeriodChange, onAnchorChange }) {
  return (
    <div className="pr-controls">
      <div className="pr-tabs" role="tablist" aria-label="Report period">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={period === p.key}
            className={`pr-tab${period === p.key ? ' is-active' : ''}`}
            onClick={() => onPeriodChange(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="pr-nav">
        <button
          type="button"
          className="pr-nav__btn"
          aria-label="Previous period"
          onClick={() => onAnchorChange(shiftAnchor(anchor, period, -1))}
        >
          ‹
        </button>
        <input
          type="date"
          className="pr-date"
          aria-label="Choose a date"
          value={toYmd(anchor)}
          onChange={(e) => e.target.value && onAnchorChange(fromYmd(e.target.value))}
        />
        <button
          type="button"
          className="pr-nav__btn"
          aria-label="Next period"
          onClick={() => onAnchorChange(shiftAnchor(anchor, period, 1))}
        >
          ›
        </button>
        <button type="button" className="pr-today" onClick={() => onAnchorChange(new Date())}>
          Today
        </button>
      </div>

      <p className="pr-range">{rangeLabel(period, anchor)}</p>
    </div>
  );
}

export function ColumnChart({ buckets, format = (v) => v, ariaLabel }) {
  const max = Math.max(0, ...buckets.map((b) => b.value));
  const dense = buckets.length > 12;
  return (
    <div className={`pr-chart${dense ? ' pr-chart--dense' : ''}`} role="img" aria-label={ariaLabel}>
      <div className="pr-chart__cols">
        {buckets.map((b) => {
          const height = max && b.value ? Math.max((b.value / max) * 100, 3) : 0;
          return (
            <div className="pr-col" key={b.key} title={`${b.label}: ${format(b.value)}`}>
              <div className="pr-col__track">
                <span className="pr-col__bar" style={{ height: `${height}%` }} />
              </div>
              <span className="pr-col__label">{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}