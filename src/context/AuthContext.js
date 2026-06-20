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
});

// Provide context
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Logout method mapping to Firebase signOut
  const logout = async () => {
    try {
      await signOut(auth);
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
    <AuthContext.Provider value={{ user, loading, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to consume AuthContext
export function useAuth() {
  return useContext(AuthContext);
}
