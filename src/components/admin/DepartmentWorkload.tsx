/**
 * @file src/components/admin/DepartmentWorkload.tsx
 * @description Department Workload visualizer for SPRINT 10.
 * Summarizes operational queues, pending, assigned, and resolution SLAs per city division.
 */

"use client";

import React from "react";
import { Landmark, Clock } from "lucide-react";
import { CivicReport } from "@/types";

interface DepartmentWorkloadProps {
  reports: CivicReport[];
}

export default function DepartmentWorkload({ reports }: DepartmentWorkloadProps) {
  // Target departments
  const targetDepartments = [
    { key: "Roads", label: "Roads & Highways" },
    { key: "Sanitation", label: "Sanitation & Waste" },
    { key: "Electrical", label: "Electrical & Lighting" },
    { key: "Water Supply", label: "Water & Utilities" },
    { key: "Traffic", label: "Traffic Signals" },
    { key: "Parks", label: "Parks & Recreation" },
    { key: "Drainage", label: "Drainage & Sewerage" },
  ];

  const deptMetrics = targetDepartments.map((dept) => {
    // Filter reports by department
    const deptReports = reports.filter((r) => {
      const assignedDept = r.ai?.assignment?.department || r.ai?.verification?.assignedDepartment || "";
      return assignedDept.toLowerCase() === dept.key.toLowerCase();
    });

    const pending = deptReports.filter((r) => r.status === "submitted").length;
    const assigned = deptReports.filter((r) => ["investigating", "in_progress", "accepted"].includes(r.status)).length;
    const resolved = deptReports.filter((r) => r.status === "resolved").length;

    // Current Workload = active outstanding cases
    const currentWorkload = pending + assigned;

    // Average resolution time in hours
    let avgHours = 0;
    const resolvedReports = deptReports.filter((r) => r.status === "resolved");
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
    <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md shadow-2xl space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Landmark className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Department Division Workloads</h3>
            <span className="text-xs text-zinc-400">Operational distribution and pending backlog overview</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {deptMetrics.map((dept) => {
          return (
            <div 
              key={dept.name} 
              className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-white/15 transition-all space-y-3.5"
            >
              {/* Dept Title & Total Workload */}
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-white text-sm">{dept.name}</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-300">
                  Active Cases: {dept.currentWorkload}
                </span>
              </div>

              {/* Stacked Workload Bar */}
              <div className="space-y-1">
                <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden flex border border-white/5">
                  {dept.pending > 0 && (
                    <div 
                      style={{ width: `${(dept.pending / Math.max(dept.currentWorkload, 1)) * 100}%` }}
                      className="h-full bg-amber-500" 
                      title={`Pending: ${dept.pending}`}
                    />
                  )}
                  {dept.assigned > 0 && (
                    <div 
                      style={{ width: `${(dept.assigned / Math.max(dept.currentWorkload, 1)) * 100}%` }}
                      className="h-full bg-blue-500" 
                      title={`Assigned: ${dept.assigned}`}
                    />
                  )}
                </div>
              </div>

              {/* Grid of details */}
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] text-zinc-400 border-t border-white/5 pt-3 mt-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-amber-400 font-black font-mono text-xs">{dept.pending}</span>
                  <span className="uppercase font-bold tracking-wider text-[8px]">Pending</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-blue-400 font-black font-mono text-xs">{dept.assigned}</span>
                  <span className="uppercase font-bold tracking-wider text-[8px]">Assigned</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-emerald-400 font-black font-mono text-xs">{dept.resolved}</span>
                  <span className="uppercase font-bold tracking-wider text-[8px]">Resolved</span>
                </div>
                <div className="flex flex-col gap-0.5 border-l border-white/5 pl-2">
                  <span className="text-zinc-300 font-black font-mono text-xs flex items-center justify-center gap-0.5">
                    <Clock className="w-2.5 h-2.5 text-zinc-500" />
                    {dept.avgHours > 0 ? `${dept.avgHours.toFixed(1)}h` : "—"}
                  </span>
                  <span className="uppercase font-bold tracking-wider text-[8px]">Avg SLA</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
