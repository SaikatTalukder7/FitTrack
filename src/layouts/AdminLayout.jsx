import { useEffect, useState } from 'react';
import AppShell from './AppShell.jsx';
import { listAllPurchaseRequests } from '../services/purchaseService.js';

// How often the admin sidebar refreshes the pending count.
const POLL_MS = 30000;

// Dark badge: visible both on the active (lime) link and on the normal navy sidebar.
const BADGE_STYLE = {
  marginLeft: 8,
  minWidth: 22,
  padding: '0 6px',
  borderRadius: 999,
  background: '#0b1120',
  color: '#a3e635',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: '20px',
  textAlign: 'center',
  display: 'inline-block',
};

const BASE_NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/routines', label: 'Assign Routines' },
  { to: '/admin/exercises', label: 'Exercises' },
  { to: '/admin/splits', label: 'Splits' },
  { to: '/admin/equipment', label: 'Equipment' },
  { to: '/admin/memberships/plans', label: 'Plans' },
  { to: '/admin/memberships', label: 'Memberships' },
  { to: '/admin/payments', label: 'Payments' },
  { to: '/admin/payment-requests', label: 'Payment requests' },
  { to: '/admin/attendance', label: 'Attendance' },
  { to: '/admin/statistics', label: 'Statistics' },
];

export default function AdminLayout() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPendingCount() {
      const result = await listAllPurchaseRequests({ status: 'pending' });
      if (cancelled) return;
      // On error, keep the last known count instead of showing a wrong number.
      if (!result.error) {
        setPendingCount(Array.isArray(result.data) ? result.data.length : 0);
      }
    }

    loadPendingCount();
    const timer = window.setInterval(loadPendingCount, POLL_MS);
    window.addEventListener('focus', loadPendingCount);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', loadPendingCount);
    };
  }, []);

  const navItems = BASE_NAV.map((item) => {
    if (item.to !== '/admin/payment-requests') return item;
    return {
      ...item,
      label: (
        <span>
          {item.label}
          {pendingCount > 0 && (
            <span style={BADGE_STYLE} aria-label={`${pendingCount} pending requests`}>
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </span>
      ),
    };
  });

  return <AppShell area="Admin" navItems={navItems} />;
}