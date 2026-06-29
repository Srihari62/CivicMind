/**
 * @file src/features/auth/schemas/auth.schema.ts
 * @description Zod validation schemas for login, register, and profile completion forms.
 */

import { z } from "zod";

/**
 * Login form validation schema.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Registration form validation schema.
 */
export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(1, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Profile completion validation schema.
 */
export const completeProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters")
    .trim(),
  phoneNumber: z
    .string()
    .optional()
    .refine((val) => !val || /^\+?[1-9]\d{1,14}$/.test(val), {
      message: "Please enter a valid phone number (E.164 format)",
    }),
  preferredLanguage: z
    .string()
    .min(1, "Preferred language is required"),
  homeLocation: z.object({
    latitude: z.number({ message: "Latitude is required" }),
    longitude: z.number({ message: "Longitude is required" }),
    formattedAddress: z.string().min(1, "Address is required"),
    placeId: z.string().optional(),
    locality: z.string().optional(),
    subLocality: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }, { message: "Home/Community location is required" }).optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  department: z.string().optional(),
});

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
