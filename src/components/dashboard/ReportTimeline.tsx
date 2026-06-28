/**
 * @file src/components/dashboard/ReportTimeline.tsx
 * @description Premium lifecycle tracker for citizen reports.
 * Displays submitted, AI verification, department, officer, investigation, media, and resolved stages.
 */

"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Loader2, FileText, Cpu, Building2, ShieldAlert, Wrench, CheckCircle, Image as ImageIcon } from "lucide-react";
import { CivicReport } from "@/types";

interface ReportTimelineProps {
  report: CivicReport;
}

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isCompleted: boolean;
  isCurrent: boolean;
}

export default function ReportTimeline({ report }: ReportTimelineProps) {
  const status = report.status || "submitted";
  const verification = report.ai?.verification;
  const assignment = report.ai?.assignment;

  // Determine completion states
  const isSubmitted = true; // Always true for viewed reports
  const isAiVerified = (verification?.status && ["verified", "requires_review", "rejected", "failed"].includes(verification.status)) || !["submitted", "processing"].includes(status);
  const isDeptAssigned = !!verification?.assignedDepartment;
  const isOfficerAssigned = !!assignment?.officerId && !["submitted", "processing", "waiting_assignment"].includes(status);
  const isInvestigationStarted = ["in_progress", "resolved"].includes(status);
  
  // Before / After Uploaded
  const hasRepairEvidence = !!(report.repairEvidence?.after?.length || report.resolution?.repairEvidence?.after?.length);
  const isResolved = status === "resolved";
  const isBeforeAfterUploaded = isResolved && hasRepairEvidence;

  const stepsData = [
    {
      id: "submitted",
      label: "Report Submitted",
      description: "Successfully recorded in municipal queue.",
      icon: FileText,
      isCompleted: isSubmitted,
    },
    {
      id: "ai_verification",
      label: "AI Verification",
      description: verification?.status === "processing" 
        ? "AI Triage analysis in progress..."
        : verification?.status === "failed"
        ? "AI triage analysis failed."
        : "Autocategorization & duplicate verification complete.",
      icon: Cpu,
      isCompleted: isAiVerified,
    },
    {
      id: "dept_assigned",
      label: "Department Assigned",
      description: isDeptAssigned 
        ? `Routed to ${verification?.assignedDepartment} Department.`
        : "Pending department assignment.",
      icon: Building2,
      isCompleted: isDeptAssigned,
    },
    {
      id: "officer_assigned",
      label: "Officer Assigned",
      description: isOfficerAssigned
        ? "Municipal officer assigned & dispatch confirmed."
        : "Awaiting field officer assignment.",
      icon: ShieldAlert,
      isCompleted: isOfficerAssigned,
    },
    {
      id: "investigation_started",
      label: "Investigation Started",
      description: status === "in_progress" || isResolved
        ? "Officer initiated active field investigation."
        : "Awaiting investigator dispatch.",
      icon: Wrench,
      isCompleted: isInvestigationStarted,
    },
    {
      id: "evidence_uploaded",
      label: "Before / After Media",
      description: isBeforeAfterUploaded
        ? "Officer uploaded resolved proof photos."
        : isResolved
        ? "No media evidence uploaded."
        : "Awaiting resolution photos.",
      icon: ImageIcon,
      isCompleted: isBeforeAfterUploaded,
      optional: true,
    },
    {
      id: "resolved",
      label: "Resolved",
      description: isResolved 
        ? "Incident successfully resolved and closed."
        : "Awaiting final resolution.",
      icon: CheckCircle,
      isCompleted: isResolved,
    },
  ];

  // If the step is not completed, and it is the first non-completed step, it is the current step.
  let foundCurrent = false;
  const steps: Step[] = stepsData.map((step) => {
    let isCurrent = false;
    if (!step.isCompleted && !foundCurrent) {
      isCurrent = true;
      foundCurrent = true;
    }
    return {
      ...step,
      isCurrent,
    };
  });

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md shadow-2xl">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        Live Report Timeline
      </h3>

      <div className="relative flex flex-col gap-8 pl-8 md:pl-0 md:flex-row md:justify-between md:gap-4 md:items-start">
        {/* Connection Lines (Desktop) */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-800 -translate-y-1/2 hidden md:block z-0" />

        {/* Progress Fill Line (Desktop) */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 hidden md:block z-0 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-blue-500"
            initial={{ width: "0%" }}
            animate={{ 
              width: `${(steps.filter(s => s.isCompleted).length / steps.length) * 100}%` 
            }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </div>

        {/* Connection Line (Mobile) */}
        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-zinc-800 md:hidden z-0" />
        
        {/* Progress Fill Line (Mobile) */}
        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 md:hidden z-0 overflow-hidden">
          <motion.div 
            className="w-full bg-gradient-to-b from-emerald-500 via-emerald-400 to-blue-500"
            initial={{ height: "0%" }}
            animate={{ 
              height: `${(steps.filter(s => s.isCompleted).length / steps.length) * 100}%` 
            }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </div>

        {/* Steps */}
        {steps.map((step) => {
          const Icon = step.icon;
          
          return (
            <div 
              key={step.id} 
              className="relative z-10 flex flex-row gap-4 items-start md:flex-col md:items-center md:text-center md:flex-1 min-w-0"
            >
              {/* Step Circle indicator */}
              <div className="relative">
                {step.isCompleted ? (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                  </motion.div>
                ) : step.isCurrent ? (
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
                    <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-blue-400 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.6)]">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                    <Icon className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Step Details Text */}
              <div className="flex flex-col gap-1 md:items-center">
                <span className={`text-sm font-bold ${step.isCompleted ? "text-emerald-400" : step.isCurrent ? "text-blue-400 font-extrabold" : "text-zinc-500"}`}>
                  {step.label}
                </span>
                <span className="text-xs text-zinc-400 max-w-[150px] leading-snug md:line-clamp-2">
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
