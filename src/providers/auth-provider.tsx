/**
 * @file src/providers/auth-provider.tsx
 * @description React Context Provider for Firebase Authentication.
 * Listens to authentication state changes, retrieves matching profiles from Firestore,
 * and exposes reactive session variables to client views.
 */

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth } from "@/services/firebase/auth";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { UserProfile, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Listen to Firebase authentication state modifications
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Retrieve matching citizen/official profile details from Firestore
          const docRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Fallback for newly registered users whose profiles are not written yet
            setProfile(null);
          }
        } catch (error) {
          console.error("Auth Provider Error: Failed to fetch Firestore user profile:", error);
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
