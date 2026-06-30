/**
 * @file src/app/(dashboard)/officer/reports/[reportId]/page.tsx
 * @description Redirects to the unified officer investigation workspace.
 */

"use client";

import React, { useEffect } from"react";
import { useParams, useRouter } from"next/navigation";
import { Loader2 } from"lucide-react";

export default function OfficerReportDetailsPage() {
 const params = useParams();
 const router = useRouter();
 const reportId = params?.reportId as string;

 useEffect(() => {
 if (reportId) {
 router.replace(`/officer/reports/${reportId}/investigate`);
 }
 }, [reportId, router]);

 return (
 <div className="min-h-screen bg-slate-50 flex items-center justify-center">
 <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
 </div>
);
}
