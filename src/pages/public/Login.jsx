import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as authService from '../../services/authService.js';
import useAuth from '../../hooks/useAuth.js';
import Alert from '../../components/common/Alert.jsx';
import AuthCard from '../../components/common/AuthCard.jsx';
import DevSampleSignIn from '../../components/common/DevSampleSignIn.jsx';
import FormField from '../../components/forms/FormField.jsx';
import { validateEmail, validateRequired } from '../../utils/validators.js';
import './Login.css';
import PasswordInput from '../../components/forms/PasswordInput.jsx';

export default function Login() {
  const { isDevMode } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const notice = location.state?.notice ?? null;

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    const nextErrors = {
      email: validateEmail(email),
      password: validateRequired(password, 'Password'),
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setSubmitting(true);
    const { error } = await authService.signIn(email.trim(), password);
    if (error) {
      setSubmitting(false);
      setFormError(error);
      return;
    }
    // On success, AuthProvider updates the session and GuestRoute redirects the user.
  }

  return (
    <>
      <AuthCard title="Log in" description="Access your FitTrack account.">
        {!isDevMode && (
          <p className="ft-note">
            Use the same login form for every account. FitTrack opens the Admin or Customer area automatically based on
            the role saved for your account.
          </p>
        )}
        {notice && <Alert type="success">{notice}</Alert>}
        {isDevMode && (
          <Alert type="warning" title="Development mode">
            Email and password sign-in is disabled. Use the sample accounts below.
          </Alert>
        )}
        {formError && (
          <Alert type="error" title="Sign-in failed">
            {formError.message}
          </Alert>
        )}

        <form noValidate onSubmit={handleSubmit} className="ft-form" aria-label="Log in form">
          <FormField id="login-email" label="Email" error={errors.email}>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              className="ft-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              disabled={isDevMode || submitting}
            />
          </FormField>

          <FormField id="login-password" label="Password" error={errors.password}>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              className="ft-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              disabled={isDevMode || submitting}
            />
          </FormField>

          <button type="submit" className="ft-btn ft-btn--primary ft-btn--full" disabled={isDevMode || submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <div className="ft-auth-links">
          <Link to="/forgot-password" className="ft-link">
            Forgot password?
          </Link>
          <Link to="/signup" className="ft-link">
            Create an account
          </Link>
        </div>
      </AuthCard>

      {isDevMode && (
        <div className="ft-login-sample">
          <DevSampleSignIn />
        </div>
      )}
    </>
  );
}