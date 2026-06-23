/**
 * @file src/features/reports/schemas/report.schema.ts
 * @description Zod validation schema for pre-AI Civic Issue Report creations.
 */

import { z } from "zod";

export const reportFormSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title cannot exceed 100 characters")
    .trim(),
  description: z
    .string()
    .min(15, "Description must be at least 15 characters")
    .max(1000, "Description cannot exceed 1000 characters")
    .trim(),
  category: z
    .string()
    .min(1, "Please select an issue category"),
  location: z
    .string()
    .min(3, "Location description is required")
    .trim(),
  latitude: z
    .number({ message: "Latitude must be a number" })
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z
    .number({ message: "Longitude must be a number" })
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});

export type ReportFormInput = z.infer<typeof reportFormSchema>;
