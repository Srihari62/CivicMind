/**
 * @file src/providers/auth-provider.tsx
 * @description Centralized React Context Provider for Authentication.
 * Exposes active session states, role helper flags, and methods to sign in,
 * log out, or refresh user profile states from Firestore.
 */

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/services/firebase/auth";
import { AuthService } from "@/features/auth/services/auth.service";
import { FirestoreUserProfile } from "@/features/auth/repositories/user.repository";

interface AuthContextType {
  // Required fields by Objective 2
  firebaseUser: User | null;
  profile: FirestoreUserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isCitizen: boolean;
  isOfficer: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  // Backwards compatibility fallbacks for existing code
  user: User | null;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  profile: null,
  loading: true,
  isAuthenticated: false,
  isCitizen: false,
  isOfficer: false,
  isAdmin: false,
  login: async () => { throw new Error("AuthProvider not initialized"); },
  logout: async () => { throw new Error("AuthProvider not initialized"); },
  refreshProfile: async () => { throw new Error("AuthProvider not initialized"); },
  user: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FirestoreUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Expose status helper flags
  const isAuthenticated = !!firebaseUser;
  const isCitizen = profile?.role === "citizen";
  const isOfficer = profile?.role === "officer";
  const isAdmin = profile?.role === "admin";

  const refreshProfile = async () => {
    if (firebaseUser) {
      try {
        const userProfile = await AuthService.getProfile(firebaseUser.uid);
        setProfile(userProfile);
      } catch (error) {
        console.error("Auth Provider Error: Failed to refresh user profile from Firestore:", error);
      }
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const fbUser = await AuthService.login({ email, password });
      setFirebaseUser(fbUser);
      const userProfile = await AuthService.getProfile(fbUser.uid);
      setProfile(userProfile);
      return fbUser;
    } catch (error) {
      console.error("Auth Provider Error: Failed to sign in:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await AuthService.logout();
      setFirebaseUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Auth Provider Error: Failed to sign out:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (userState) => {
      setFirebaseUser(userState);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (userState) {
        const { doc, onSnapshot } = await import("firebase/firestore");
        const { db, COLLECTIONS } = await import("@/services/firebase/firestore");

        unsubscribeProfile = onSnapshot(
          doc(db, COLLECTIONS.USERS, userState.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data() as FirestoreUserProfile);
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Auth Provider Error: Failed to listen to user profile:", error);
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        isAuthenticated,
        isCitizen,
        isOfficer,
        isAdmin,
        login,
        logout,
        refreshProfile,
        user: firebaseUser, // Fallback for backwards compatibility
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthProvider;
