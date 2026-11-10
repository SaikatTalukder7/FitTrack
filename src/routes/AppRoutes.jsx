import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import PublicLayout from '../layouts/PublicLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import CustomerLayout from '../layouts/CustomerLayout.jsx';
import Spinner from '../components/common/Spinner.jsx';

import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';
import GuestRoute from './GuestRoute.jsx';
import './Guards.css';

import { ROLES } from '../utils/constants.js';

const NotFound = lazy(() => import('../pages/NotFound.jsx'));
const Landing = lazy(() => import('../pages/public/Landing.jsx'));
const HowItWorks = lazy(() => import('../pages/public/HowItWorks.jsx'));
const Faq = lazy(() => import('../pages/public/Faq.jsx'));
const Login = lazy(() => import('../pages/public/Login.jsx'));
const Signup = lazy(() => import('../pages/public/Signup.jsx'));
const ForgotPassword = lazy(() => import('../pages/public/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/public/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('../pages/public/VerifyEmail.jsx'));
const Profile = lazy(() => import('../pages/customer/Profile.jsx'));
const AdminCustomers = lazy(() => import('../pages/admin/Customers.jsx'));
const AdminCustomerDetail = lazy(() => import('../pages/admin/CustomerDetail.jsx'));
const AdminExercises = lazy(() => import('../pages/admin/Exercises.jsx'));
const AdminSplits = lazy(() => import('../pages/admin/Splits.jsx'));
const AdminOperations = lazy(() => import('../pages/admin/Operations.jsx'));

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
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="faq" element={<Faq />} />

          <Route element={<GuestRoute />}>
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
          </Route>

          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowed={ROLES.ADMIN} />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="customers" replace />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="customers/:id" element={<AdminCustomerDetail />} />
              <Route path="exercises" element={<AdminExercises />} />
              <Route path="exercises/new" element={<AdminExercises />} />
              <Route path="exercises/:id/edit" element={<AdminExercises />} />
              <Route path="splits" element={<AdminSplits />} />
              <Route path="equipment" element={<AdminOperations page="equipment" />} />
              <Route path="memberships/plans" element={<AdminOperations page="plans" />} />
            </Route>
          </Route>

          <Route element={<RoleRoute allowed={ROLES.CUSTOMER} />}>
            <Route path="app" element={<CustomerLayout />}>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}