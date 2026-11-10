import { callApi } from './apiClient.js';
import { fail } from './serviceResult.js';

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export async function getMyProfile() {
  const result = await callApi('profile.me');
  if (!result.error && !result.data) {
    return fail('Your profile was not found. Ask an administrator to check your account setup.', 'PROFILE_MISSING');
  }
  return result;
}

// Users may change only their own full name.
export async function updateMyProfile(_userId, { fullName }) {
  return callApi('profile.update', { fullName });
}

// Returns the user's photo as an image link, or null when no photo is set.
export async function getMyAvatarUrl(avatarPath) {
  if (!avatarPath) return { data: null, error: null };
  return callApi('profile.avatarUrl', { avatarPath });
}

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      resolve(value.slice(value.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadMyAvatar(_userId, file) {
  if (!file) return fail('Choose an image first.', 'VALIDATION_ERROR');
  if (!AVATAR_TYPES.includes(file.type)) return fail('Use a JPG, PNG, or WebP image.', 'VALIDATION_ERROR');
  if (file.size > AVATAR_MAX_BYTES) return fail('Images must be 2 MB or smaller.', 'VALIDATION_ERROR');
  const base64 = await readAsBase64(file);
  return callApi('profile.uploadAvatar', { contentType: file.type, base64 });
}

export async function removeMyAvatar() {
  return callApi('profile.removeAvatar');
}

// Admin-only customer directory.
export async function listCustomers({ search = '' } = {}) {
  return callApi('customers.list', { search });
}

export async function getCustomerDetails(customerId) {
  if (!customerId) return fail('A customer is required.', 'VALIDATION_ERROR');
  return callApi('customers.details', { customerId });
}

// Admin: a customer's photo as an image link, or null when no photo is set.
export async function getCustomerAvatarUrl(customerId) {
  if (!customerId) return { data: null, error: null };
  return callApi('profile.avatarUrl', { userId: customerId });
}