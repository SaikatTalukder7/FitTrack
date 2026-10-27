// DEVELOPMENT SAMPLE DATA ONLY. Held in memory; cleared on page refresh.
// Nothing here is written to a database.
import { ROLES } from '../utils/constants.js';

export const SAMPLE_USERS = {
  [ROLES.ADMIN]: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin.sample@fittrack.local',
    full_name: 'Sample Admin',
    role: ROLES.ADMIN,
  },
  [ROLES.CUSTOMER]: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'customer.sample@fittrack.local',
    full_name: 'Sample Customer',
    role: ROLES.CUSTOMER,
  },
};

let currentSampleUser = null;

function buildSession(user) {
  return { is_sample: true, user: { id: user.id, email: user.email } };
}

export function sampleSignIn(role) {
  const user = SAMPLE_USERS[role];
  if (!user) return null;
  currentSampleUser = user;
  return buildSession(user);
}

export function sampleSignOut() {
  currentSampleUser = null;
}

export function sampleGetSession() {
  return currentSampleUser ? buildSession(currentSampleUser) : null;
}

export function sampleGetProfile(userId) {
  const user = Object.values(SAMPLE_USERS).find((u) => u.id === userId);
  if (!user) return null;
  return {
    id: user.id,
    full_name: user.full_name,
    role: user.role,
    created_at: '2026-01-01T00:00:00Z',
    is_sample: true,
  };
}
