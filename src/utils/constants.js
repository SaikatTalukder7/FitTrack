export const ROLES = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
};

export const HOME_BY_ROLE = {
  [ROLES.ADMIN]: '/admin',
  [ROLES.CUSTOMER]: '/app',
};

export const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'legs', 'glutes', 'core', 'full_body', 'cardio',
];

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
export const EQUIPMENT_STATUSES = ['available', 'busy', 'maintenance'];
export const MEMBERSHIP_STATUSES = ['active', 'expired', 'cancelled'];
export const PAYMENT_STATUSES = ['paid', 'pending', 'overdue', 'waived'];

// Default recovery rule. Configurable by admin in a later step.
export const DEFAULT_REST_HOURS = 48;
