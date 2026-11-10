import AppShell from './AppShell.jsx';

const NAV = [
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/exercises', label: 'Exercises' },
  { to: '/admin/splits', label: 'Splits' },
  { to: '/admin/equipment', label: 'Equipment' },
  { to: '/admin/memberships/plans', label: 'Plans' },
];

export default function AdminLayout() {
  return <AppShell area="Admin" navItems={NAV} />;
}