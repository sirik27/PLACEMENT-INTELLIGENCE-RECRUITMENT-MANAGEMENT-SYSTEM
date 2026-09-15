import { useState, useEffect, useCallback } from 'react';
import { auth, onAuthStateChanged, signOut, db, doc, onSnapshot } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        // Real-time listener for user profile document
        profileUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setRole(data.role || null);
            setProfile(data);
          }
          setLoading(false);
        }, (err) => {
          console.warn('[useAuth] profile snapshot warning:', err);
          setLoading(false);
        });
      } else {
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
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
