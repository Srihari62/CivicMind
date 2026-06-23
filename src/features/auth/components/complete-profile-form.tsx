/**
 * @file src/features/auth/components/complete-profile-form.tsx
 * @description Complete Profile Form component.
 * Allows registered users to set up their name, phone number, and system role.
 */

"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { completeProfileSchema, CompleteProfileInput } from "../schemas/auth.schema";
import { AuthService } from "../services/auth.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CompleteProfileForm() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      displayName: "",
      phoneNumber: "",
    },
  });

  // Prefill name and details if they exist on the Firebase user object
  useEffect(() => {
    if (user) {
      if (user.displayName) {
        setValue("displayName", user.displayName);
      }
      if (user.phoneNumber) {
        setValue("phoneNumber", user.phoneNumber);
      }
    }
  }, [user, setValue]);

  // Handle routing if user sessions are unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && profile?.isProfileComplete) {
      const redirectPath = profile.role === "admin" ? "/admin" : profile.role === "officer" ? "/officer" : "/dashboard";
      router.push(redirectPath);
    }
  }, [user, profile, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center p-8">
        <svg
          className="animate-spin h-6 w-6 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  const onSubmit = async (data: CompleteProfileInput) => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      await AuthService.completeProfile(user.uid, data);
      
      const updatedProfile = await AuthService.getProfile(user.uid);
      const redirectPath = updatedProfile?.role === "admin" ? "/admin" : updatedProfile?.role === "officer" ? "/officer" : "/dashboard";
      window.location.href = redirectPath;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update profile. Please try again.";
      setGlobalError(errorMsg);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full max-w-sm">
      {globalError && (
        <div
          className="p-3.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md font-medium"
          role="alert"
        >
          {globalError}
        </div>
      )}

      <Input
        label="Full Name"
        placeholder="Jane Doe"
        error={errors.displayName?.message}
        {...register("displayName")}
      />

      <Input
        label="Phone Number (Optional)"
        placeholder="+15551234567"
        error={errors.phoneNumber?.message}
        {...register("phoneNumber")}
      />

      <Button type="submit" isLoading={isLoading} className="w-full mt-2">
        Complete Registration
      </Button>
    </form>
  );
}
export default CompleteProfileForm;
