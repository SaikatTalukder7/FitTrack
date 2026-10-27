import useAuth from '../hooks/useAuth.js';
import Alert from '../components/common/Alert.jsx';
import { ROLES } from '../utils/constants.js';
import '../routes/Guards.css';

// Update 1 placeholder. The real admin and customer dashboards are added in Update 2 and Update 3.
export default function RoleHome({ role }) {
  const { profile, signOut } = useAuth();
  const isAdmin = role === ROLES.ADMIN;

  return (
    <div className="ft-guard">
      <Alert type="success" title={isAdmin ? 'Admin sign-in successful' : 'Customer sign-in successful'}>
        Welcome, {profile?.full_name || 'FitTrack user'}. Your role is "{profile?.role}".
        This dashboard will be built in the next update.
      </Alert>
      <div>
        <button type="button" className="ft-btn ft-btn--secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </div>
  );
}
