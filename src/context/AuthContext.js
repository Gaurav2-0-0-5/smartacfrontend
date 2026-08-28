"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/utils/firebaseClient";

// Create context
const AuthContext = createContext({
  user: null,
  loading: true,
  logout: async () => {},
  getToken: async () => null,
  refreshUserClaims: async () => {},
});

// Provide context
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const parseAndSetUser = async (firebaseUser) => {
    if (firebaseUser) {
      try {
        // Fetch JWT claims, forcing refresh if needed
        const tokenResult = await firebaseUser.getIdTokenResult();
        const isStaff = tokenResult.claims.isStaff || false;
        const staffRole = tokenResult.claims.staffRole || null;

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          isStaff,
          staffRole,
          rawUser: firebaseUser
        });
      } catch (err) {
        console.error("Error retrieving user claims:", err);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          isStaff: false,
          staffRole: null,
          rawUser: firebaseUser
        });
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      await parseAndSetUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Force refreshes custom claims from Firebase servers
  const refreshUserClaims = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const tokenResult = await auth.currentUser.getIdTokenResult(true);
      const isStaff = tokenResult.claims.isStaff || false;
      const staffRole = tokenResult.claims.staffRole || null;

      setUser(prev => prev ? {
        ...prev,
        isStaff,
        staffRole
      } : null);
    } catch (err) {
      console.error("Error refreshing claims:", err);
    } finally {
      setLoading(false);
    }
  };

  // Logout method mapping to Firebase signOut
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Firebase Signout Error:", error);
      throw error;
    }
  };

  // Helper to fetch latest Firebase ID Token
  const getToken = async (forceRefresh = false) => {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken(forceRefresh);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, getToken, refreshUserClaims }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to consume AuthContext
export function useAuth() {
  return useContext(AuthContext);
}
