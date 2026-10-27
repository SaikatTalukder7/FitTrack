import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Spinner from '../components/common/Spinner.jsx';
import Alert from '../components/common/Alert.jsx';
import { HOME_BY_ROLE } from '../utils/constants.js';
import './Guards.css';

export default function GuestRoute() {
  const { status, role, error, signOut } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="ft-loading-screen">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (status === 'signed_in') {
    if (role) {
      // Return the user to the page they originally requested, if ProtectedRoute saved it.
      const from = location.state?.from;
      const target = typeof from === 'string' ? from : (HOME_BY_ROLE[role] ?? '/');
      return <Navigate to={target} replace />;
    }
    // Signed in, but the profile could not be loaded. Do not show the login form.
    return (
      <div className="ft-guard">
        <Alert type="error" title="Profile unavailable">
          {error?.message ?? 'Your profile could not be loaded.'}
        </Alert>
        <div>
          <button type="button" className="ft-btn ft-btn--secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}