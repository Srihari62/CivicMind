/**
 * @file src/providers/auth-provider.tsx
 * @description React Context Provider for Firebase Authentication.
 * Listens to authentication state changes, retrieves profiles via AuthService,
 * and exposes reactive session variables to client views.
 */

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/services/firebase/auth";
import { AuthService } from "@/features/auth/services/auth.service";
import { FirestoreUserProfile } from "@/features/auth/repositories/user.repository";
import { UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  profile: FirestoreUserProfile | null;
  loading: boolean;
  role: UserRole | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  role: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FirestoreUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Listen to Firebase authentication state modifications
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Retrieve profile details through the service layer
          const userProfile = await AuthService.getProfile(firebaseUser.uid);
          setProfile(userProfile);
        } catch (error) {
          console.error("Auth Provider Error: Failed to fetch user profile via AuthService:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        role: profile?.role || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to consume the AuthContext safely.
 */
export const useAuth = () => useContext(AuthContext);
export default AuthProvider;
