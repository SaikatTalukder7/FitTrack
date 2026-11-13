import AppShell from './AppShell.jsx';

const CUSTOMER_NAV = [
  { to: '/app/routine', label: 'My Routine' },
  { to: '/app/session', label: 'Workout' },
  { to: '/app/history', label: 'History' },
  { to: '/app/measurements', label: 'Measurements' },
  { to: '/app/attendance', label: 'Attendance' },
  { to: '/app/profile', label: 'Profile' },
];

export default function CustomerLayout() {
  return <AppShell area="Member" navItems={CUSTOMER_NAV} />;
}
