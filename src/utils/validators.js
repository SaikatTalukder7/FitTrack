export const PASSWORD_MIN_LENGTH = 8;
export const FULL_NAME_MAX_LENGTH = 120;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRequired(value, label) {
  if (!value || !String(value).trim()) return `${label} is required.`;
  return null;
}

export function validateEmail(value) {
  const email = (value ?? '').trim();
  if (!email) return 'Email is required.';
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(value) {
  if (!value) return 'Password is required.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}

export function validateConfirmPassword(password, confirmation) {
  if (!confirmation) return 'Please confirm your password.';
  if (password !== confirmation) return 'Passwords do not match.';
  return null;
}

export function validateFullName(value) {
  const name = (value ?? '').trim();
  if (!name) return 'Full name is required.';
  if (name.length > FULL_NAME_MAX_LENGTH) {
    return `Full name must be ${FULL_NAME_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}
