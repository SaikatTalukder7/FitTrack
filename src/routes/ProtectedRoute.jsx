import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Spinner from '../components/common/Spinner.jsx';
import Alert from '../components/common/Alert.jsx';
import './Guards.css';

export default function ProtectedRoute() {
  const { status, profile, error, signOut } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="ft-loading-screen ft-loading-screen--full">
        <Spinner label="Loading your session" />
      </div>
    );
  }

  if (status === 'signed_out') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
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