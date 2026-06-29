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
import dynamic from "next/dynamic";

// Load MapPicker dynamically to avoid SSR window issues
const MapPicker = dynamic(() => import("@/components/maps/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] bg-slate-900/40 animate-pulse rounded-2xl flex items-center justify-center border border-slate-800">
      <span className="text-xs text-slate-500">Initializing location picker...</span>
    </div>
  ),
});

export function CompleteProfileForm() {
  const router = useRouter();
  const { user, profile, loading, logout } = useAuth();
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
      preferredLanguage: "",
      homeLocation: undefined,
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
          xmlns="http://www.w3.org/2500/svg"
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
    // Custom role-based validation
    if (profile?.role === "citizen") {
      if (!data.homeLocation) {
        setGlobalError("Home/Community Location selection is required.");
        return;
      }
    } else if (profile?.role === "officer") {
      if (!data.state) {
        setGlobalError("State is required for Officer registration.");
        return;
      }
      if (!data.city?.trim()) {
        setGlobalError("City is required for Officer registration.");
        return;
      }
      if (!data.department) {
        setGlobalError("Department is required for Officer registration.");
        return;
      }
    } else if (profile?.role === "admin") {
      if (!data.state) {
        setGlobalError("State is required for Admin registration.");
        return;
      }
    }

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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full max-w-xl">
      {globalError && (
        <div
          className="p-3.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md font-medium"
          role="alert"
        >
          {globalError}
        </div>
      )}

      <Input
        label="Full Name *"
        placeholder="Jane Doe"
        error={errors.displayName?.message}
        {...register("displayName")}
      />

      <Input
        label="Phone Number (Optional)"
        placeholder="+919876543210"
        error={errors.phoneNumber?.message}
        {...register("phoneNumber")}
      />

      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-xs font-medium text-muted-foreground select-none">
          Preferred Language *
        </label>
        <select
          {...register("preferredLanguage")}
          className="w-full px-3.5 py-2.5 bg-background border border-border text-sm rounded-md transition-all duration-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
        >
          <option value="">Select language...</option>
          <option value="English">English</option>
          <option value="Hindi">Hindi</option>
          <option value="Telugu">Telugu</option>
          <option value="Tamil">Tamil</option>
          <option value="Kannada">Kannada</option>
          <option value="Malayalam">Malayalam</option>
          <option value="Marathi">Marathi</option>
          <option value="Gujarati">Gujarati</option>
          <option value="Punjabi">Punjabi</option>
          <option value="Bengali">Bengali</option>
          <option value="Odia">Odia</option>
          <option value="Urdu">Urdu</option>
        </select>
        {errors.preferredLanguage && (
          <span className="text-xs text-destructive font-medium mt-0.5" role="alert">
            {errors.preferredLanguage.message}
          </span>
        )}
      </div>

      {/* Citizen role gets MapPicker */}
      {profile?.role === "citizen" && (
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs font-medium text-muted-foreground select-none">
            Home/Community Location *
          </label>
          <MapPicker
            onLocationChange={(location) => {
              setValue("homeLocation", location, { shouldValidate: true });
            }}
          />
          {errors.homeLocation && (
            <span className="text-xs text-destructive font-medium mt-0.5" role="alert">
              {errors.homeLocation.message || "Location selection is required"}
            </span>
          )}
        </div>
      )}

      {/* Officer and Admin roles require State selection */}
      {(profile?.role === "officer" || profile?.role === "admin") && (
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs font-medium text-muted-foreground select-none">
            Jurisdiction State *
          </label>
          <select
            {...register("state")}
            className="w-full px-3.5 py-2.5 bg-background border border-border text-sm rounded-md transition-all duration-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
          >
            <option value="">Select State...</option>
            <option value="Andhra Pradesh">Andhra Pradesh</option>
            <option value="Telangana">Telangana</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Delhi">Delhi</option>
          </select>
          {errors.state && (
            <span className="text-xs text-destructive font-medium mt-0.5" role="alert">
              {errors.state.message}
            </span>
          )}
        </div>
      )}

      {/* Officer role also requires City and Department */}
      {profile?.role === "officer" && (
        <>
          <Input
            label="Jurisdiction City *"
            placeholder="e.g. Hyderabad"
            error={errors.city?.message}
            {...register("city")}
          />

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-medium text-muted-foreground select-none">
              Department *
            </label>
            <select
              {...register("department")}
              className="w-full px-3.5 py-2.5 bg-background border border-border text-sm rounded-md transition-all duration-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
            >
              <option value="">Select Department...</option>
              <option value="Roads">Roads</option>
              <option value="Sanitation">Sanitation</option>
              <option value="Electrical">Electrical</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Drainage">Drainage</option>
              <option value="Parks">Parks</option>
              <option value="Traffic">Traffic</option>
            </select>
            {errors.department && (
              <span className="text-xs text-destructive font-medium mt-0.5" role="alert">
                {errors.department.message}
              </span>
            )}
          </div>
        </>
      )}

      <Button type="submit" isLoading={isLoading} className="w-full mt-2">
        Complete Registration
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          try {
            await logout();
            router.push("/login");
          } catch (err) {
            console.error("Failed to sign out:", err);
          }
        }}
        className="w-full border-white/10 hover:bg-zinc-900 text-zinc-400 mt-1"
      >
        Sign Out / Cancel
      </Button>
    </form>
  );
}
export default CompleteProfileForm;
