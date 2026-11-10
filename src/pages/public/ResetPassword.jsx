import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authService from '../../services/authService.js';
import Alert from '../../components/common/Alert.jsx';
import AuthCard from '../../components/common/AuthCard.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import FormField from '../../components/forms/FormField.jsx';
import { validateConfirmPassword, validatePassword } from '../../utils/validators.js';
import PasswordInput from '../../components/forms/PasswordInput.jsx';
import './ResetPassword.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [linkStatus, setLinkStatus] = useState('checking'); // 'checking' | 'valid' | 'invalid'
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // The emailed link carries a one-time token in the address (?token=...).
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('token');
    setToken(value);
    if (!value) {
      setLinkStatus('invalid');
      return;
    }
    let cancelled = false;
    authService.checkResetToken(value).then(({ data, error }) => {
      if (cancelled) return;
      setLinkStatus(!error && data?.valid ? 'valid' : 'invalid');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (linkStatus === 'checking') {
    return (
      <AuthCard title="Reset password">
        <Spinner label="Checking your reset link" />
      </AuthCard>
    );
  }

  if (linkStatus === 'invalid') {
    return (
      <AuthCard title="Reset password">
        <Alert type="error" title="This reset link is invalid or has expired.">
          Request a new reset link to continue.
        </Alert>
        <div className="ft-reset__actions">
          <Link to="/forgot-password" className="ft-btn ft-btn--primary ft-btn--full">
            Request a new link
          </Link>
        </div>
      </AuthCard>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    const nextErrors = {
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };
    setErrors(nextErrors);
    if (nextErrors.password || nextErrors.confirmPassword) return;

    setSubmitting(true);
    const { error } = await authService.updatePasswordWithToken(token, password);
    if (error) {
      setSubmitting(false);
      setFormError(error);
      return;
    }
    navigate('/login', {
      replace: true,
      state: { notice: 'Your password was updated. Log in with your new password.' },
    });
  }

  return (
    <AuthCard title="Choose a new password" description="Enter and confirm your new password.">
      {formError && (
        <Alert type="error" title="Password not updated">
          {formError.message}
        </Alert>
      )}

      <form noValidate onSubmit={handleSubmit} className="ft-form" aria-label="Reset password form">
        <FormField id="reset-password" label="New password" hint="At least 8 characters." error={errors.password}>
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            className="ft-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'reset-password-error' : undefined}
            disabled={submitting}
          />
        </FormField>

        <FormField id="reset-confirm" label="Confirm new password" error={errors.confirmPassword}>
          <PasswordInput
            id="reset-confirm"
            autoComplete="new-password"
            className="ft-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined}
            disabled={submitting}
          />
        </FormField>

        <button type="submit" className="ft-btn ft-btn--primary ft-btn--full" disabled={submitting}>
          {submitting ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </AuthCard>
  );
}
