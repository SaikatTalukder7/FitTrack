import { supabase, isDevMode, unavailable } from './supabaseClient.js';
import { ok, fail, normalizeSupabaseError } from './serviceResult.js';
import * as sample from '../data/devDataProvider.js';

const PROFILE_COLUMNS = 'id, full_name, role, created_at';

// Returns the signed-in user's profile (used by AuthContext to read the role).
export async function getMyProfile(userId) {
  if (isDevMode) {
    const profile = sample.sampleGetProfile(userId);
    return profile ? ok(profile) : fail('No sample profile exists for this session.', 'NOT_FOUND');
  }
  if (!supabase) return unavailable();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
    if (error) return normalizeSupabaseError(error);
    if (!data) {
      return fail(
        'Your profile was not found. Ask an administrator to check your account setup.',
        'PROFILE_MISSING'
      );
    }
    return ok(data);
  } catch (err) {
    return normalizeSupabaseError(err);
  }
}