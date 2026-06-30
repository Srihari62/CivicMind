/**
 * @file src/components/dashboard/VerificationProgress.tsx
 * @description Real-time verification progress tracker for background pipelines.
 * Reflects authentic stages from database fields (authenticity check, duplicates, department, etc.)
 */

"use client";

import { motion } from"framer-motion";
import { CheckCircle2, Loader2, Sparkles, AlertCircle } from"lucide-react";
import { CivicReport } from"@/types";

interface VerificationProgressProps {
 report: CivicReport;
}

export default function VerificationProgress({ report }: VerificationProgressProps) {
 const verification = report.ai?.verification;
 const assistant = report.ai?.assistant;
 const assignment = report.ai?.assignment;

 const isProcessing = !verification || verification.status ==="processing";

 // Derive stages from Firestore properties
 const stepUploadingEvidence = true; // Always complete once doc is submitted
 const stepDetectObjects = !!assistant || !isProcessing;
 const stepCheckAuthenticity = (verification?.fakeMediaProbability !== undefined && verification?.fakeMediaProbability !== null) || !isProcessing;
 const stepSearchDuplicates = (verification?.duplicateProbability !== undefined && verification?.duplicateProbability !== null) || !isProcessing;
 const stepCalculateTrust = (verification?.trustScore !== undefined && verification?.trustScore !== null) || !isProcessing;
 const stepRouteDepartment = !!verification?.assignedDepartment || !isProcessing;
 const stepSelectOfficer = !!assignment?.officerId || !isProcessing;

 const stages = [
 { id:"uploading", label:"Uploading Evidence", isCompleted: stepUploadingEvidence },
 { id:"detecting", label:"Detecting objects", isCompleted: stepDetectObjects },
 { id:"authenticity", label:"Checking authenticity", isCompleted: stepCheckAuthenticity },
 { id:"duplicates", label:"Searching duplicate incidents", isCompleted: stepSearchDuplicates },
 { id:"trust", label:"Calculating trust score", isCompleted: stepCalculateTrust },
 { id:"routing", label:"Routing department", isCompleted: stepRouteDepartment },
 { id:"officer", label:"Selecting officer", isCompleted: stepSelectOfficer },
 ];

 // Number of completed stages
 const completedCount = stages.filter((s) => s.isCompleted).length;
 const progressPercent = Math.round((completedCount / stages.length) * 100);

 return (
 <div className="w-full rounded-2xl clay-card p-6 space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
 <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
 </div>
 <div>
 <h3 className="text-lg font-bold text-slate-800">Live Verification Pipeline</h3>
 <span className="text-xs text-slate-500">Verifying civic integrity matches</span>
 </div>
 </div>
 <span className="text-sm font-mono font-bold text-blue-400">{progressPercent}%</span>
 </div>

 {/* Progress Bar */}
 <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
 <motion.div
 className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"
 initial={{ width: 0 }}
 animate={{ width: `${progressPercent}%` }}
 transition={{ duration: 0.5, ease:"easeOut" }}
 />
 </div>

 {/* Stages List */}
 <div className="space-y-3.5">
 {stages.map((stage, idx) => {
 const isCurrent = !stage.isCompleted && stages.findIndex((s) => !s.isCompleted) === idx;
 
 return (
 <div
 key={stage.id}
 className="flex items-center justify-between text-sm py-1 border-b border-slate-200 last:border-0"
 >
 <div className="flex items-center gap-3">
 {stage.isCompleted ? (
 <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
) : isCurrent ? (
 <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
) : (
 <div className="w-4 h-4 rounded-full border border-slate-200 shrink-0" />
)}
 <span className={`${stage.isCompleted ?"text-slate-500" : isCurrent ?"text-blue-400 font-medium" :"text-slate-500"}`}>
 {stage.label}
 </span>
 </div>
 <div>
 {stage.isCompleted ? (
 <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Completed</span>
) : isCurrent ? (
 <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider animate-pulse">Running...</span>
) : (
 <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Pending</span>
)}
 </div>
 </div>
);
 })}
 </div>

 {/* Failure Status Banner if AI fails */}
 {verification?.status ==="failed" && (
 <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
 <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
 <div className="space-y-1">
 <span className="font-bold">Pipeline Verification Failure</span>
 <p className="text-slate-600 leading-relaxed">
 {verification.failureReason ||"The pipeline faced an error evaluating metadata authenticity."}
 </p>
 </div>
 </div>
)}
 </div>
);
}
