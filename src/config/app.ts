/**
 * @file src/config/app.ts
 * @description Global app configurations.
 * Contains branding parameters, version configurations, and platform information.
 */

export const appConfig = {
  name: "CivicMind",
  tagline: "AI-Powered Civic Engagement & Incident Resolution Platform",
  description: "A production-grade platform connecting citizens and municipalities using AI-orchestrated dispatch systems.",
  version: "1.0.0",
  company: "CivicMind Group",
  supportEmail: "support@civicmind.gov",
  routes: {
    home: "/",
    login: "/login",
    register: "/register",
    dashboard: "/dashboard",
    admin: "/admin",
    officer: "/officer",
  },
  roles: {
    citizen: "citizen",
    officer: "officer",
    admin: "admin",
  },
} as const;

export type AppConfig = typeof appConfig;
export default appConfig;
