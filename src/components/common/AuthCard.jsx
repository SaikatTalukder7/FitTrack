import './AuthCard.css';

// Centered card used by all public authentication pages.
export default function AuthCard({ title, description, children }) {
  return (
    <div className="ft-auth">
      <div className="ft-card ft-auth__card">
        <p className="ft-auth__brand" aria-hidden="true">
          fittrack<span>.</span>
        </p>
        <div className="ft-auth__head">
          <h1 className="ft-auth__title">{title}</h1>
          {description && <p className="ft-auth__desc">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}