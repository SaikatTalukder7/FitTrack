import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import { HOME_BY_ROLE } from '../utils/constants.js';

// Usability guard only. Authorization is enforced by RLS and secure database functions.
export default function RoleRoute({ allowed }) {
  const { role } = useAuth();
  if (role !== allowed) {
    return <Navigate to={HOME_BY_ROLE[role] ?? '/login'} replace />;
  }
  return <Outlet />;
}
