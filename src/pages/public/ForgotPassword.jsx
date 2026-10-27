import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as authService from '../../services/authService.js';
import useAuth from '../../hooks/useAuth.js';
import Alert from '../../components/common/Alert.jsx';
import AuthCard from '../../components/common/AuthCard.jsx';
import FormField from '../../components/forms/FormField.jsx';
import { validateEmail } from '../../utils/validators.js';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const { isDevMode } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    const validationError = validateEmail(email);
    setEmailError(validationError);
    if (validationError) return;

    setSubmitting(true);
    const { error } = await authService.resetPassword(email.trim());
    setSubmitting(false);
    if (error) {
      setFormError(error);
      return;
    }
    setSent(true);
  }

  return (
    <AuthCard
      title="Forgot password"
      description="Enter your account email. We will send a link to choose a new password."
    >
      {isDevMode && (
        <Alert type="warning" title="Development mode">
          Password reset needs a connected Supabase project.
        </Alert>
      )}
      {sent && (
        <Alert type="success" title="Check your email">
          If an account exists for this address, a reset link is on its way. The link expires after a short time.
        </Alert>
      )}
      {formError && (
        <Alert type="error" title="Request failed">
          {formError.message}
        </Alert>
      )}

      {!sent && (
        <form noValidate onSubmit={handleSubmit} className="ft-form" aria-label="Forgot password form">
          <FormField id="forgot-email" label="Email" error={emailError}>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              className="ft-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'forgot-email-error' : undefined}
              disabled={isDevMode || submitting}
            />
          </FormField>
          <button type="submit" className="ft-btn ft-btn--primary ft-btn--full" disabled={isDevMode || submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="ft-switch">
        <Link to="/login" className="ft-link">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}