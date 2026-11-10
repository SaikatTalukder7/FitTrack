const STYLES = {
  error: 'bg-red-50 text-red-800 ring-red-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
};

export default function Alert({ type = 'info', title, children }) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`rounded-lg p-4 text-sm ring-1 ${STYLES[type] ?? STYLES.info}`}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
