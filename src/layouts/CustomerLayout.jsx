import AppShell from './AppShell.jsx';

const CUSTOMER_NAV = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/routine', label: 'My Routine' },
  { to: '/app/session', label: 'Workout' },
  { to: '/app/history', label: 'History' },
  { to: '/app/progress', label: 'Progress' },
  { to: '/app/measurements', label: 'Measurements' },
  { to: '/app/membership', label: 'Membership' },
  { to: '/app/payments', label: 'Payments' },
  { to: '/app/attendance', label: 'Attendance' },
  { to: '/app/profile', label: 'Profile' },
];

export default function CustomerLayout() {
  return <AppShell area="Member" navItems={CUSTOMER_NAV} disableNavigation />;
}
