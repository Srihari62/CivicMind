/**
 * @file src/components/admin/DepartmentWorkload.tsx
 * @description Department Workload visualizer for SPRINT 10.
 * Summarizes operational queues, pending, assigned, and resolution SLAs per city division.
 */

"use client";

import React from"react";
import { Landmark, Clock, Activity } from "lucide-react";
import { CivicReport } from"@/types";

interface DepartmentWorkloadProps {
 reports: CivicReport[];
}

export default function DepartmentWorkload({ reports }: DepartmentWorkloadProps) {
 // Target departments
 const targetDepartments = [
 { key:"Roads", label:"Roads & Highways" },
 { key:"Sanitation", label:"Sanitation & Waste" },
 { key:"Electrical", label:"Electrical & Lighting" },
 { key:"Water Supply", label:"Water & Utilities" },
 { key:"Traffic", label:"Traffic Signals" },
 { key:"Parks", label:"Parks & Recreation" },
 { key:"Drainage", label:"Drainage & Sewerage" },
 ];

 const deptMetrics = targetDepartments.map((dept) => {
 // Filter reports by department
 const deptReports = reports.filter((r) => {
 const assignedDept = r.ai?.assignment?.department || r.ai?.verification?.assignedDepartment ||"";
 return assignedDept.toLowerCase() === dept.key.toLowerCase();
 });

 const pending = deptReports.filter((r) => r.status ==="submitted").length;
 const assigned = deptReports.filter((r) => ["investigating","in_progress","accepted"].includes(r.status)).length;
 const resolved = deptReports.filter((r) => r.status ==="resolved").length;

 // Current Workload = active outstanding cases
 const currentWorkload = pending + assigned;

 // Average resolution time in hours
 let avgHours = 0;
 const resolvedReports = deptReports.filter((r) => r.status ==="resolved");
 if (resolvedReports.length > 0) {
 const totalHours = resolvedReports.reduce((sum, r) => {
 const start = new Date(r.timestamps.createdAt).getTime();
 const end = new Date(r.timestamps.updatedAt).getTime();
 return sum + Math.max(0, (end - start) / (1000 * 60 * 60));
 }, 0);
 avgHours = totalHours / resolvedReports.length;
 }

 return {
 name: dept.label,
 pending,
 assigned,
 resolved,
 currentWorkload,
 avgHours,
 };
 });

 return (
 <div className="w-full clay-card p-6 space-y-6">
 {/* Title */}
 <div className="flex items-center justify-between border-b border-slate-200 pb-4">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
 <Landmark className="w-5 h-5 text-emerald-400" />
 </div>
 <div>
 <h3 className="text-lg font-bold text-slate-800">Department Division Workloads</h3>
 <span className="text-xs text-slate-500">Operational distribution and pending backlog overview</span>
 </div>
 </div>
 </div>

  <div className="grid grid-cols-1 gap-4">
  {deptMetrics.map((dept) => {
  return (
  <div 
  key={dept.name} 
  className="clay-card p-4 hover:border-slate-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-4 bg-white/60 relative overflow-hidden group"
  >
  {/* Dept Title & Total Workload */}
  <div className="flex flex-col gap-1.5 md:w-1/3 shrink-0">
    <span className="font-extrabold text-slate-800 text-[13px] leading-tight">{dept.name}</span>
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 whitespace-nowrap inline-flex items-center gap-1 shadow-sm w-fit">
        <Activity className="w-3 h-3 text-indigo-500"/> 
        {dept.currentWorkload} Active
      </span>
    </div>
  </div>

  {/* Stacked Workload Bar */}
  <div className="w-full md:w-1/4 shrink-0 flex items-center">
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
      {dept.pending > 0 && (
      <div 
      style={{ width: `${(dept.pending / Math.max(dept.currentWorkload, 1)) * 100}%` }}
      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500" 
      title={`Pending: ${dept.pending}`}
      />
      )}
      {dept.assigned > 0 && (
      <div 
      style={{ width: `${(dept.assigned / Math.max(dept.currentWorkload, 1)) * 100}%` }}
      className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500" 
      title={`Assigned: ${dept.assigned}`}
      />
      )}
    </div>
  </div>

  {/* Grid of details */}
  <div className="grid grid-cols-4 gap-2 text-center text-slate-500 w-full">
    <div className="flex flex-col items-center justify-center gap-0.5 bg-slate-50/80 rounded-lg py-1.5 border border-slate-100/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <span className="text-amber-550 font-black font-mono text-[11px]">{dept.pending}</span>
      <span className="uppercase font-bold tracking-widest text-[7px] text-slate-400">Pend</span>
    </div>
    <div className="flex flex-col items-center justify-center gap-0.5 bg-slate-50/80 rounded-lg py-1.5 border border-slate-100/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <span className="text-blue-550 font-black font-mono text-[11px]">{dept.assigned}</span>
      <span className="uppercase font-bold tracking-widest text-[7px] text-slate-400">Actv</span>
    </div>
    <div className="flex flex-col items-center justify-center gap-0.5 bg-slate-50/80 rounded-lg py-1.5 border border-slate-100/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <span className="text-emerald-550 font-black font-mono text-[11px]">{dept.resolved}</span>
      <span className="uppercase font-bold tracking-widest text-[7px] text-slate-400">Done</span>
    </div>
    <div className="flex flex-col items-center justify-center gap-0.5 bg-slate-50/80 rounded-lg py-1.5 border border-slate-100/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <span className="text-indigo-550 font-black font-mono text-[11px] flex items-center justify-center gap-0.5">
        {dept.avgHours > 0 ? `${dept.avgHours.toFixed(1)}h` :"—"}
      </span>
      <span className="uppercase font-bold tracking-widest text-[7px] text-slate-400">SLA</span>
    </div>
  </div>

  </div>
  );
  })}
  </div>
 </div>
);
}
