/**
 * @file src/features/auth/components/login-form.tsx
 * @description Login Form component.
 * Integrates React Hook Form, Zod schema validation, loading state buttons,
 * and handles login routing logic.
 */

"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { loginSchema, LoginInput } from "../schemas/auth.schema";
import { AuthService } from "../services/auth.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      // 1. Trigger Firebase Sign In
      const user = await AuthService.login(data);

      // 2. Fetch User Profile to check completion
      const profile = await AuthService.getProfile(user.uid);

      if (profile && profile.isProfileComplete) {
        const redirectPath = profile.role === "admin" ? "/admin" : profile.role === "officer" ? "/officer" : "/dashboard";
        router.push(redirectPath);
      } else {
        router.push("/complete-profile");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Invalid email or password combination.";
      setGlobalError(errorMsg);
    } finally {
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
        label="Email address"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register("email")}
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" isLoading={isLoading} className="w-full mt-2">
        Sign In
      </Button>
    </form>
  );
}
export default LoginForm;
