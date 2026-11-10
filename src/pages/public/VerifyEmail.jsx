import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as authService from '../../services/authService.js';
import useAuth from '../../hooks/useAuth.js';
import Alert from '../../components/common/Alert.jsx';
import AuthCard from '../../components/common/AuthCard.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import FormField from '../../components/forms/FormField.jsx';
import { validateEmail } from '../../utils/validators.js';
import { HOME_BY_ROLE } from '../../utils/constants.js';
import './VerifyEmail.css';

const STEPS = [
  'Open the inbox of the email address you signed up with.',
  'Click the verification link in the message.',
  'The link opens FitTrack and signs you in.',
];

export default function VerifyEmail() {
  const { status, role } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email ?? '');
  const [emailError, setEmailError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const started = useRef(false);

  // The emailed link carries a one-time token (?token=...). Confirm it once when the page opens.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) return;
    setVerifying(true);
    authService.verifyEmail(token).then(({ error }) => {
      setVerifying(false);
      if (error) setLinkError(error);
      window.history.replaceState(window.history.state, '', '/verify-email');
    });
  }, []);

  async function handleResend(event) {
    event.preventDefault();
    setFormError(null);
    setResent(false);
    const validationError = validateEmail(email);
    setEmailError(validationError);
    if (validationError) return;

    setSubmitting(true);
    const { error } = await authService.resendVerification(email.trim());
    setSubmitting(false);
    if (error) {
      setFormError(error);
      return;
    }
    setResent(true);
  }

  if (verifying) {
    return (
      <AuthCard title="Verify your email">
        <Spinner label="Confirming your email" />
      </AuthCard>
    );
  }

  const verifiedAndSignedIn = status === 'signed_in' && role;

  return (
    <AuthCard title="Verify your email" description="Confirm your email address before you log in.">
      <div className="ft-verify">
        {linkError && (
          <Alert type="error" title="Verification failed">
            {linkError.message} Request a new link below.
          </Alert>
        )}

        {verifiedAndSignedIn ? (
          <>
            <Alert type="success" title="Your email is verified.">
              You are signed in.
            </Alert>
            <Link to={HOME_BY_ROLE[role] ?? '/'} className="ft-btn ft-btn--primary ft-btn--full">
              Continue to FitTrack
            </Link>
          </>
        ) : (
          <>
            <ol className="ft-verify__steps">
              {STEPS.map((text, index) => (
                <li key={text} className="ft-verify__step">
                  <span className="ft-verify__num">{index + 1}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
            <p className="ft-verify__hint">
              Check your spam folder if the email does not arrive within a few minutes.
            </p>
          </>
        )}
      </div>

      {!verifiedAndSignedIn && (
        <>
          {resent && <Alert type="success">If this account still needs verification, a new email is on its way.</Alert>}
          {formError && (
            <Alert type="error" title="Could not resend">
              {formError.message}
            </Alert>
          )}

          <form noValidate onSubmit={handleResend} className="ft-form" aria-label="Resend verification form">
            <FormField id="verify-email" label="Email" error={emailError}>
              <input
                id="verify-email"
                type="email"
                autoComplete="email"
                className="ft-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'verify-email-error' : undefined}
                disabled={submitting}
              />
            </FormField>
            <button type="submit" className="ft-btn ft-btn--outline-brand ft-btn--full" disabled={submitting}>
              {submitting ? 'Sending…' : 'Resend verification email'}
            </button>
          </form>

          <p className="ft-switch">
            <Link to="/login" className="ft-link">
              Back to log in
            </Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}
