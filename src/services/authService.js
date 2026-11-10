import { callApi } from './apiClient.js';

// Lets the AuthProvider react to sign-in and sign-out without a page reload.
const listeners = new Set();
function emit(event, session) {
  for (const listener of listeners) listener(event, session);
}

export async function signIn(email, password) {
  const result = await callApi('auth.signIn', { email, password });
  if (!result.error) emit('SIGNED_IN', result.data);
  return result;
}

export async function signUp({ email, password, fullName }) {
  const result = await callApi('auth.signUp', { email, password, fullName });
  if (!result.error && result.data?.session) emit('SIGNED_IN', result.data.session);
  return result;
}

export async function resendVerification(email) {
  return callApi('auth.resendVerification', { email });
}

export async function verifyEmail(token) {
  const result = await callApi('auth.verifyEmail', { token });
  if (!result.error) emit('SIGNED_IN', result.data);
  return result;
}

export async function resetPassword(email) {
  return callApi('auth.requestPasswordReset', { email });
}

export async function checkResetToken(token) {
  return callApi('auth.checkResetToken', { token });
}

export async function updatePasswordWithToken(token, newPassword) {
  const result = await callApi('auth.resetPassword', { token, password: newPassword });
  if (!result.error) emit('SIGNED_OUT', null);
  return result;
}

export async function signOut() {
  const result = await callApi('auth.signOut');
  if (!result.error) emit('SIGNED_OUT', null);
  return result;
}

export async function getSession() {
  return callApi('auth.session');
}

// Returns an unsubscribe function.
export function onAuthChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
