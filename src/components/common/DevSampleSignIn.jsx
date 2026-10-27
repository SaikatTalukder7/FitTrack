import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import Alert from './Alert.jsx';
import { HOME_BY_ROLE, ROLES } from '../../utils/constants.js';
import './DevSampleSignIn.css';

// Development-only sample sign-in. Works on any page that renders it (Landing or Login).
export default function DevSampleSignIn() {
  const { signInSample } = useAuth();
  const navigate = useNavigate();
  const [busyRole, setBusyRole] = useState(null);
  const [error, setError] = useState(null);

  async function handleSignIn(role) {
    setBusyRole(role);
    setError(null);
    const { error: signInError } = await signInSample(role);

    if (signInError) {
      setBusyRole(null);
      setError(signInError);
      return;
    }
    navigate(HOME_BY_ROLE[role] ?? '/', { replace: true });
  }

  return (
    <section className="ft-card ft-sample" aria-labelledby="sample-signin-title">
      <div>
        <h2 id="sample-signin-title" className="ft-sample__title">
          Sample sign-in (development only)
        </h2>
        <p className="ft-sample__text">
          Opens the app with in-memory sample accounts. No password is checked and nothing is saved to a database.
        </p>
      </div>
      {error && (
        <Alert type="error" title="Sample sign-in failed">
          {error.message}
        </Alert>
      )}
      <div className="ft-sample__actions">
        <button
          type="button"
          className="ft-btn ft-btn--primary"
          disabled={busyRole !== null}
          onClick={() => handleSignIn(ROLES.ADMIN)}
        >
          {busyRole === ROLES.ADMIN ? 'Opening…' : 'Open as sample admin'}
        </button>
        <button
          type="button"
          className="ft-btn ft-btn--secondary"
          disabled={busyRole !== null}
          onClick={() => handleSignIn(ROLES.CUSTOMER)}
        >
          {busyRole === ROLES.CUSTOMER ? 'Opening…' : 'Open as sample customer'}
        </button>
      </div>
    </section>
  );
}