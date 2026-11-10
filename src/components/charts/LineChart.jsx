import { useId } from 'react';
import './LineChart.css';

export default function LineChart({ title, description, points, unit = '', color = '#0d4b3c' }) {
  const id = useId();
  const values = (points || []).filter((point) => Number.isFinite(Number(point.value)));

  if (!values.length) {
    return (
      <div className="ft-chart__empty">
        {description || `Add records to see your ${title.toLowerCase()} trend.`}
      </div>
    );
  }

  const width = 720;
  const height = 260;
  const left = 54;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const numericValues = values.map((point) => Number(point.value));
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const span = max - min || Math.max(Math.abs(max) * 0.1, 1);
  const plotMin = min - span * 0.05;
  const plotMax = max + span * 0.05;
  const plotRange = plotMax - plotMin;

  const x = (index) =>
    left +
    (values.length === 1 ? (width - left - right) / 2 : (index * (width - left - right)) / (values.length - 1));
  const y = (value) => top + ((plotMax - Number(value)) * (height - top - bottom)) / plotRange;
  const path = values.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.value)}`).join(' ');
  const gridValues = [plotMax, (plotMax + plotMin) / 2, plotMin];

  const label = (point) => {
    const parsed = new Date(`${String(point.date).slice(0, 10)}T12:00:00`);
    return Number.isNaN(parsed.getTime())
      ? String(point.date || '')
      : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="ft-chart">
      <p className="ft-visually-hidden" id={`line-chart-description-${id}`}>
        {description || `${title} history from ${values.length} recorded measurements.`}
      </p>
      <div className="ft-chart__scroll">
        <svg
          className="ft-chart__svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={`line-chart-title-${id} line-chart-description-${id}`}
        >
          <title id={`line-chart-title-${id}`}>{title}</title>

          {gridValues.map((value, index) => {
            const yy = y(value);
            return (
              <g key={index}>
                <line x1={left} x2={width - right} y1={yy} y2={yy} stroke="#cfdad5" strokeDasharray="4 5" />
                <text x={left - 8} y={yy + 4} textAnchor="end" fill="#3d4742" fontSize="11">
                  {Number(value).toFixed(1)}
                  {unit}
                </text>
              </g>
            );
          })}

          <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {values.map((point, index) => (
            <circle
              key={`${point.date}-${index}`}
              cx={x(index)}
              cy={y(point.value)}
              r="4.5"
              fill="#ffffff"
              stroke={color}
              strokeWidth="2"
            >
              <title>{`${label(point)}: ${point.value}${unit}`}</title>
            </circle>
          ))}

          <text x={left} y={height - 12} fill="#3d4742" fontSize="11">
            {label(values[0])}
          </text>
          {values.length > 1 && (
            <text x={width - right} y={height - 12} textAnchor="end" fill="#3d4742" fontSize="11">
              {label(values[values.length - 1])}
            </text>
          )}
        </svg>
      </div>

      <p className="ft-chart__count">
        {values.length} recorded point{values.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}