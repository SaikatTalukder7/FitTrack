import { supabase, isDevMode, unavailable } from './supabaseClient.js';
import { ok, fail, normalizeSupabaseError } from './serviceResult.js';
import * as sample from '../data/devDataProvider.js';

const devBlocked = (action) =>
  fail(
    `${action} requires a connected Supabase project. Development mode is active, so nothing was changed.`,
    'DEV_MODE'
  );

const origin = () => window.location.origin;

export async function signInSampleUser(role) {
  if (!isDevMode) {
    return fail('Sample sign-in is only available in development mode.', 'NOT_DEV_MODE');
  }
  const session = sample.sampleSignIn(role);
  return session ? ok(session) : fail(`Unknown sample role: ${role}`, 'INVALID_ROLE');
}

export async function signIn(email, password) {
  if (isDevMode) return devBlocked('Sign in');
  if (!supabase) return unavailable();
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? normalizeSupabaseError(error) : ok(data.session);
  } catch (err) {
    return normalizeSupabaseError(err);
  }
}

export async function signUp({ email, password, fullName }) {
  if (isDevMode) return devBlocked('Sign up');
  if (!supabase) return unavailable();
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${origin()}/verify-email`,
      },
    });
    return error ? normalizeSupabaseError(error) : ok(data);
  } catch (err) {
    return normalizeSupabaseError(err);
  }
}

export async function resendVerification(email) {
  if (isDevMode) return devBlocked('Resending the verification email');
  if (!supabase) return unavailable();
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${origin()}/verify-email` },
    });
    return error ? normalizeSupabaseError(error) : ok(null);
  } catch (err) {
    return normalizeSupabaseError(err);
  }
}

export async function resetPassword(email) {
  if (isDevMode) return devBlocked('Password reset');
  if (!supabase) return unavailable();
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin()}/reset-password`,
    });
    return error ? normalizeSupabaseError(error) : ok(null);
  } catch (err) {
    return normalizeSupabaseError(err);
  }
}

export async function updatePassword(newPassword) {
  if (isDevMode) return devBlocked('Changing the password');
  if (!supabase) return unavailable();
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? normalizeSupabaseError(error) : ok(null);
  } catch (err) {
    return normalizeSupabaseError(err);
  }
}

export async function signOut() {
  if (isDevMode) {
    sample.sampleSignOut();
    return ok(null);
  }
  if (!supabase) return unavailable();
  try {
    const { error } = await supabase.auth.signOut();
    return error ? normalizeSupabaseError(error) : ok(null);
  } catch (err) {
    return normalizeSupabaseError(err);
  }
}

export async function getSession() {
  if (isDevMode) return ok(sample.sampleGetSession());
  if (!supabase) return unavailable();
  try {
    const { data, error } = await supabase.auth.getSession();
    return error ? normalizeSupabaseError(error) : ok(data.session);
  } catch (err) {
    return normalizeSupabaseError(err);
  }
}

// Returns an unsubscribe function. In dev mode there is no external auth stream.
export function onAuthChange(callback) {
  if (isDevMode || !supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}
