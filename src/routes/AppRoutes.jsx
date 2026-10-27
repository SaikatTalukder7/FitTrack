import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import PublicLayout from '../layouts/PublicLayout.jsx';
import Spinner from '../components/common/Spinner.jsx';

import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';
import GuestRoute from './GuestRoute.jsx';
import './Guards.css';

import { ROLES } from '../utils/constants.js';

const NotFound = lazy(() => import('../pages/NotFound.jsx'));
const Landing = lazy(() => import('../pages/public/Landing.jsx'));
const Login = lazy(() => import('../pages/public/Login.jsx'));
const Signup = lazy(() => import('../pages/public/Signup.jsx'));
const ForgotPassword = lazy(() => import('../pages/public/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/public/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('../pages/public/VerifyEmail.jsx'));
const RoleHome = lazy(() => import('../pages/RoleHome.jsx'));

export default function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="ft-loading-screen">
          <Spinner label="Loading FitTrack" />
        </div>
      }
    >
      <Routes>
        {/* Public pages (with Navbar and Footer) */}
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />

          <Route element={<GuestRoute />}>
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
          </Route>

          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="verify-email" element={<VerifyEmail />} />

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Protected pages: sign-in required, then the role decides which home is shown */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowed={ROLES.ADMIN} />}>
            <Route path="admin" element={<RoleHome role={ROLES.ADMIN} />} />
          </Route>

          <Route element={<RoleRoute allowed={ROLES.CUSTOMER} />}>
            <Route path="app" element={<RoleHome role={ROLES.CUSTOMER} />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
