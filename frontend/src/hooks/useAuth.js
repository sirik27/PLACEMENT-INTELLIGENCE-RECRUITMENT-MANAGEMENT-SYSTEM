import { useState, useEffect, useCallback } from 'react';
import { auth, onAuthStateChanged, signOut, db, doc, getDoc } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            setRole(data.role);
            setProfile(data);
          } else {
            const tokenResult = await firebaseUser.getIdTokenResult();
            setRole(tokenResult.claims.role || null);
          }
        } catch (err) {
          console.error('[useAuth] profile fetch failed:', err);
        }
      } else {
        setUser(null);
        setRole(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      const data = snap.data();
      setRole(data.role);
      setProfile(data);
    }
  }, [user]);

  return { user, role, profile, loading, logout, refreshProfile };
}
