/**
 * @file src/app/(dashboard)/reports/new/page.tsx
 * @description Page for citizens to submit a new issue report.
 * Protected by RouteGuard.
 */

import Link from"next/link";
import { ReportForm } from"@/features/reports/components/report-form";
import { RouteGuard } from"@/features/auth/components/route-guard";

export const dynamic ="force-dynamic";

export default function NewReportPage() {
 return (
 <RouteGuard requireAuth={true}>
 <div className="flex min-h-screen flex-col bg-background text-foreground">
 {/* Navigation Bar */}
 <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
 <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
 <Link href="/" className="font-bold text-primary hover:opacity-90 transition-opacity">
 CivicMind
 </Link>
 <div className="flex items-center gap-4">
 <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors">
 Back to Dashboard
 </Link>
 </div>
 </div>
 </header>

 {/* Form Container */}
 <main className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
 <div className="w-full max-w-xl flex flex-col gap-4">
 <ReportForm />
 </div>
 </main>
 </div>
 </RouteGuard>
);
}
