import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authService from '../../services/authService.js';
import useAuth from '../../hooks/useAuth.js';
import Alert from '../../components/common/Alert.jsx';
import AuthCard from '../../components/common/AuthCard.jsx';
import FormField from '../../components/forms/FormField.jsx';
import {
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validatePassword,
} from '../../utils/validators.js';
import './Signup.css';
import PasswordInput from '../../components/forms/PasswordInput.jsx';

export default function Signup() {
  const { isDevMode } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    const nextErrors = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    const cleanEmail = email.trim();
    const { data, error } = await authService.signUp({
      email: cleanEmail,
      password,
      fullName: fullName.trim(),
    });
    setSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }
    // With email confirmation on, Supabase returns a user with no identities when the email is already registered.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setFormError({ message: 'An account with this email already exists. Try logging in instead.', code: 'EXISTING_USER' });
      return;
    }
    // With email confirmation off, a session exists and GuestRoute redirects the user.
    if (data?.session) return;
    // Otherwise the user must confirm their email first.
    navigate('/verify-email', { state: { email: cleanEmail } });
  }

  return (
    <>
      <AuthCard title="Create account" description="Sign up as a FitTrack member.">
        {isDevMode && (
          <Alert type="warning" title="Development mode">
            Sign-up needs a connected Supabase project. Nothing will be created here.
          </Alert>
        )}
        {formError && (
          <Alert type="error" title="Sign-up failed">
            {formError.message}
          </Alert>
        )}

        <form noValidate onSubmit={handleSubmit} className="ft-form" aria-label="Sign up form">
          <FormField id="signup-name" label="Full name" error={errors.fullName}>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              className="ft-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'signup-name-error' : undefined}
              disabled={isDevMode || submitting}
            />
          </FormField>

          <FormField id="signup-email" label="Email" error={errors.email}>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              className="ft-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'signup-email-error' : undefined}
              disabled={isDevMode || submitting}
            />
          </FormField>

          <FormField id="signup-password" label="Password" hint="At least 8 characters." error={errors.password}>
            <PasswordInput
              id="signup-password"
              autoComplete="new-password"
              className="ft-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'signup-password-error' : undefined}
              disabled={isDevMode || submitting}
            />
          </FormField>

          <FormField id="signup-confirm" label="Confirm password" error={errors.confirmPassword}>
            <PasswordInput
              id="signup-confirm"
              autoComplete="new-password"
              className="ft-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? 'signup-confirm-error' : undefined}
              disabled={isDevMode || submitting}
            />
          </FormField>

          <button type="submit" className="ft-btn ft-btn--primary ft-btn--full" disabled={isDevMode || submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="ft-switch">
          Already have an account?{' '}
          <Link to="/login" className="ft-link">
            Log in
          </Link>
        </p>
      </AuthCard>
    </>
  );
}