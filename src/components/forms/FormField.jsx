import './FormField.css';

// Wraps a single input with a visible label, optional hint, and an error message.
// The child input must use id={id}, and aria-describedby pointing to `${id}-error` when there is an error.
export default function FormField({ id, label, hint, error, children }) {
  return (
    <div className="ft-field">
      <label htmlFor={id} className="ft-label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="ft-field__hint">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="ft-field__error">
          {error}
        </p>
      )}
    </div>
  );
}