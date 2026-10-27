import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as authService from '../../services/authService.js';
import useAuth from '../../hooks/useAuth.js';
import Alert from '../../components/common/Alert.jsx';
import AuthCard from '../../components/common/AuthCard.jsx';
import FormField from '../../components/forms/FormField.jsx';
import { validateEmail } from '../../utils/validators.js';
import { HOME_BY_ROLE } from '../../utils/constants.js';
import './VerifyEmail.css';

const STEPS = [
  'Open the inbox of the email address you signed up with.',
  'Click the verification link in the message.',
  'If the link opens FitTrack, you are signed in and can continue.',
];

export default function VerifyEmail() {
  const { status, role, isDevMode } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email ?? '');
  const [emailError, setEmailError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);

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

  // Opening the verification link signs the user in, so a signed-in user is already verified.
  const verifiedAndSignedIn = status === 'signed_in' && role;

  return (
    <AuthCard title="Verify your email" description="Confirm your email address before you log in.">
      <div className="ft-verify">
        {isDevMode && (
          <Alert type="warning" title="Development mode">
            Email verification needs a connected Supabase project.
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
          {resent && <Alert type="success">A new verification email was requested. Check your inbox.</Alert>}
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
                disabled={isDevMode || submitting}
              />
            </FormField>
            <button type="submit" className="ft-btn ft-btn--outline-brand ft-btn--full" disabled={isDevMode || submitting}>
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