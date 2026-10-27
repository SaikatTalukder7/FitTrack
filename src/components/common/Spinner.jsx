import './Spinner.css';

export default function Spinner({ label = 'Loading' }) {
  return (
    <div role="status" className="ft-spinner">
      <span aria-hidden="true" className="ft-spinner__ring" />
      <span>{label}…</span>
    </div>
  );
}