import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as authService from '../services/authService.js';
import * as profileService from '../services/profileService.js';

export const AuthContext = createContext(null);

// The sample-data development mode from the old app is gone: everything runs against MongoDB.
const isDevMode = false;

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'signed_in' | 'signed_out'
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  // Tracks which user's profile is already loaded, so repeated session events do not reload it.
  const loadedUserId = useRef(null);

  // The role shown here is for navigation only. The server checks the role on every request.
  const loadProfile = useCallback(async (userId) => {
    const { data, error: profileError } = await profileService.getMyProfile(userId);
    if (profileError) {
      loadedUserId.current = null;
      setProfile(null);
      setError(profileError);
      return;
    }
    loadedUserId.current = userId;
    setProfile(data);
    setError(null);
  }, []);

  const applySession = useCallback(
    async (nextSession) => {
      setSession(nextSession);
      if (loadedUserId.current !== nextSession.user.id) {
        await loadProfile(nextSession.user.id);
      }
      setStatus('signed_in');
    },
    [loadProfile]
  );

  const clearSession = useCallback(() => {
    loadedUserId.current = null;
    setSession(null);
    setProfile(null);
    setError(null);
    setStatus('signed_out');
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      const { data, error: sessionError } = await authService.getSession();
      if (!active) return;
      if (sessionError) {
        setError(sessionError);
        setStatus('signed_out');
        return;
      }
      if (!data) {
        setStatus('signed_out');
        return;
      }
      await applySession(data);
    }

    init();

    const unsubscribe = authService.onAuthChange((_event, nextSession) => {
      if (!active) return;
      if (!nextSession) {
        clearSession();
        return;
      }
      applySession(nextSession);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [applySession, clearSession]);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await authService.signOut();
    if (signOutError) return { error: signOutError };
    clearSession();
    return { error: null };
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    loadedUserId.current = null;
    await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const value = useMemo(
    () => ({
      status,
      session,
      profile,
      error,
      role: profile?.role ?? null,
      isDevMode,
      signOut,
      refreshProfile,
    }),
    [status, session, profile, error, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
