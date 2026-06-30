/**
 * @file eslint.config.mjs
 * @description ESLint Flat Configuration file for CivicMind platform.
 * Integrates Next.js core web vitals, TypeScript rules, and defines custom rules
 * and directories to ignore during static analysis.
 */

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// FlatCompat utility permits loading legacy ESLint configs/plugins (like next/core-web-vitals)
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  // Load official rules for Next.js and TypeScript
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  
  // Custom directory exclusions and formatting rule integrations
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/**",
      "scripts/**",
    ],
  },
  
  // Custom project rules (production guidelines)
  {
    rules: {
      // Allow unused variables prefix with underscore for cleaner development
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      
      // Warn against console.logs in production builds
      "no-console": ["warn", { "allow": ["warn", "error", "info"] }],
      
      // Enforce clean import structure
      "react/self-closing-comp": "warn",
      
      // Disable strict type checks for explicit any and unescaped entities
      "@typescript-eslint/no-explicit-any": "off",
      "react/no-unescaped-entities": "off"
    }
  }
];

export default eslintConfig;
