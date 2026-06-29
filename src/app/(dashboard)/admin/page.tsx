/**
 * @file src/app/(dashboard)/admin/page.tsx
 * @description Admin Dashboard transformed into an AI-Powered Municipal Command Center.
 * Consumes real-time reports and user datasets to plot smart insights and spatial analytics.
 */

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { Button } from "@/components/ui/button";
import { ReportService } from "@/features/reports/services/report.service";
import { CivicReport } from "@/types";
import {
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Shield,
  Users,
  Edit,
  SlidersHorizontal,
  X,
  Sparkles,
  BarChart4
} from "lucide-react";
import Link from "next/link";
import { FirestoreUserProfile } from "@/features/auth/repositories/user.repository";
import { OfficerService } from "@/features/reports/services/officer.service";

import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";

// SPRINT 10 Component Imports
import ExecutiveOverview from "@/components/admin/ExecutiveOverview";
import CityHealthScore from "@/components/admin/CityHealthScore";
import ExecutiveSummary from "@/components/admin/ExecutiveSummary";
import AnalyticsCharts from "@/components/admin/AnalyticsCharts";
import dynamicComponent from "next/dynamic";
const IncidentHeatmap = dynamicComponent(
  () => import("@/components/admin/IncidentHeatmap"),
  { ssr: false }
);
import OfficerPerformance from "@/components/admin/OfficerPerformance";
import DepartmentWorkload from "@/components/admin/DepartmentWorkload";
import PredictiveInsights from "@/components/admin/PredictiveInsights";
import TrendAnalysis from "@/components/admin/TrendAnalysis";
import MunicipalAssistant from "@/components/admin/assistant/MunicipalAssistant";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  const { profile, logout } = useAuth();
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // General tab switcher state
  const [activeTab, setActiveTab] = useState<"command_center" | "assistant">("command_center");

  // original User management lists
  const [users, setUsers] = useState<FirestoreUserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Smart Filters State for the Command Center tab
  const [showFilters, setShowFilters] = useState(false);
  const [smartStartDate, setSmartStartDate] = useState("");
  const [smartEndDate, setSmartEndDate] = useState("");
  const [smartCategory, setSmartCategory] = useState("all");
  const [smartDept, setSmartDept] = useState("all");
  const [smartPriority, setSmartPriority] = useState("all");
  const [smartVerificationStatus, setSmartVerificationStatus] = useState("all");
  const [smartOfficer, setSmartOfficer] = useState("all");
  const [smartLocation, setSmartLocation] = useState("");

  useEffect(() => {
    if (!profile?.uid || !profile?.state) return;

    // 1. Subscribe to reports (filtered by admin's state)
    setLoading(true);
    const reportsQuery = query(
      collection(db, COLLECTIONS.REPORTS),
      where("state", "==", profile.state)
    );
    const unsubscribeReports = onSnapshot(
      reportsQuery,
      (snapshot: any) => {
        const list: CivicReport[] = [];
        snapshot.forEach((docSnap: any) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as CivicReport);
        });
        setReports(list);
        setLoading(false);
      },
      (err: any) => {
        console.error("Failed to stream reports for admin CC:", err);
        setError("Failed to load reports stream.");
        setLoading(false);
      }
    );

    // 2. Subscribe to users / officers
    setUsersLoading(true);
    const usersQuery = query(collection(db, COLLECTIONS.USERS));
    const unsubscribeUsers = onSnapshot(
      usersQuery,
      (snapshot: any) => {
        const list: FirestoreUserProfile[] = [];
        snapshot.forEach((docSnap: any) => {
          list.push({ uid: docSnap.id, ...docSnap.data() } as FirestoreUserProfile);
        });
        setUsers(list);
        setUsersLoading(false);
      },
      (err: any) => {
        console.error("Failed to stream users/officers for admin CC:", err);
        setUsersLoading(false);
      }
    );

    return () => {
      unsubscribeReports();
      unsubscribeUsers();
    };
  }, [profile?.uid, profile?.state]);



  // Clean filters button helper
  const handleClearSmartFilters = () => {
    setSmartStartDate("");
    setSmartEndDate("");
    setSmartCategory("all");
    setSmartDept("all");
    setSmartPriority("all");
    setSmartVerificationStatus("all");
    setSmartOfficer("all");
    setSmartLocation("");
  };

  // Compute officers metrics
  const officers = users.filter((u) => u.role === "officer");
  const busyOfficersCount = officers.filter((o) => o.availability === "busy" || (o.activeCases && o.activeCases > 0)).length;

  // 1. Calculate general stats for Registry Registry
  const pendingCount = reports.filter((r) => r.status === "submitted").length;
  
  const assignedCount = reports.filter(
    (r) => r.status === "investigating" || r.status === "in_progress"
  ).length;

  const resolvedTodayCount = reports.filter((r) => {
    if (r.status !== "resolved") return false;
    const updatedAt = new Date(r.timestamps.updatedAt);
    const today = new Date();
    return (
      updatedAt.getDate() === today.getDate() &&
      updatedAt.getMonth() === today.getMonth() &&
      updatedAt.getFullYear() === today.getFullYear()
    );
  }).length;

  const calculateAverageResolutionTime = () => {
    const resolved = reports.filter((r) => r.status === "resolved");
    if (resolved.length === 0) return "N/A";

    const totalDurationMs = resolved.reduce((sum, r) => {
      const start = new Date(r.timestamps.createdAt).getTime();
      const end = new Date(r.timestamps.updatedAt).getTime();
      const diff = end - start;
      return sum + (diff > 0 ? diff : 0);
    }, 0);

    const averageMs = totalDurationMs / resolved.length;
    const averageHours = averageMs / (1000 * 60 * 60);

    if (averageHours < 24) {
      return `${averageHours.toFixed(1)} hrs`;
    }
    const averageDays = averageHours / 24;
    return `${averageDays.toFixed(1)} days`;
  };

  const avgResolutionTime = calculateAverageResolutionTime();



  // 3. Smart Filters Logic for Command Center Dashboard
  const dashboardFilteredReports = reports.filter((r) => {
    // A. Start Date
    if (smartStartDate) {
      const start = new Date(smartStartDate).getTime();
      const created = new Date(r.timestamps.createdAt).getTime();
      if (created < start) return false;
    }
    // B. End Date
    if (smartEndDate) {
      const end = new Date(smartEndDate).getTime() + 24 * 60 * 60 * 1000;
      const created = new Date(r.timestamps.createdAt).getTime();
      if (created > end) return false;
    }
    // C. Category
    if (smartCategory !== "all" && r.metadata.category !== smartCategory) {
      return false;
    }
    // D. Department
    if (smartDept !== "all") {
      const dept = r.ai?.assignment?.department || r.ai?.verification?.assignedDepartment || "";
      if (dept.toLowerCase() !== smartDept.toLowerCase()) return false;
    }
    // E. Priority
    if (smartPriority !== "all") {
      const priority = r.ai?.verification?.priority || r.ai?.assistant?.initialPriority || "";
      if (priority.toLowerCase() !== smartPriority.toLowerCase()) return false;
    }
    // F. Verification Status
    if (smartVerificationStatus !== "all") {
      const vStatus = r.ai?.verification?.status || "";
      if (vStatus.toLowerCase() !== smartVerificationStatus.toLowerCase()) return false;
    }
    // G. Officer
    if (smartOfficer !== "all" && r.ai?.assignment?.officerId !== smartOfficer) {
      return false;
    }
    // H. Location
    if (smartLocation) {
      const locStr = `${r.location.formattedAddress} ${r.location.locality || ""} ${r.location.subLocality || ""}`.toLowerCase();
      if (!locStr.includes(smartLocation.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Command Administration: {profile?.displayName}
              </h1>
              <p className="text-xs text-zinc-400">
                System telemetry dashboard: configure municipal workflows, audit AI categorization agents, track dispatch SLA times, and analyze trends.
              </p>
            </div>
            <Button
              onClick={() => {
                window.location.reload();
              }}
              disabled={loading || usersLoading}
              variant="outline"
              size="sm"
              className="self-start md:self-auto border-white/10 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading || usersLoading ? "animate-spin" : ""}`} />
              Sync Command Center
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 gap-6 mb-2">
            <button
              onClick={() => setActiveTab("command_center")}
              className={`pb-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all px-1 flex items-center gap-1.5 ${
                activeTab === "command_center"
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <BarChart4 className="w-3.5 h-3.5" /> Intelligence Center
            </button>
            <button
              onClick={() => setActiveTab("assistant")}
              className={`pb-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all px-1 flex items-center gap-1.5 ${
                activeTab === "assistant"
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Municipal Assistant
            </button>
          </div>

          {/* Render Tab Contents */}
          {activeTab === "command_center" ? (
            <div className="space-y-8">
              {/* Smart Filters Header Controls */}
              <div className="w-full border border-white/10 rounded-2xl bg-black/30 p-4 backdrop-blur-md shadow-lg flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Smart Operational Filters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowFilters(!showFilters)} 
                      className="text-zinc-400 hover:text-white"
                    >
                      {showFilters ? "Collapse Panel" : "Expand Filter Panel"}
                    </Button>
                    {(smartStartDate || smartEndDate || smartCategory !== "all" || smartDept !== "all" || smartPriority !== "all" || smartVerificationStatus !== "all" || smartOfficer !== "all" || smartLocation) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSmartFilters}
                        className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Reset Filters
                      </Button>
                    )}
                  </div>
                </div>

                {/* Filters Input Grid */}
                {(showFilters || (smartStartDate || smartEndDate || smartCategory !== "all" || smartDept !== "all" || smartPriority !== "all" || smartVerificationStatus !== "all" || smartOfficer !== "all" || smartLocation)) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-white/5 text-xs text-zinc-300">
                    {/* Date inputs */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Start Date</label>
                      <input
                        type="date"
                        value={smartStartDate}
                        onChange={(e) => setSmartStartDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">End Date</label>
                      <input
                        type="date"
                        value={smartEndDate}
                        onChange={(e) => setSmartEndDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-red-500"
                      />
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Category</label>
                      <select
                        value={smartCategory}
                        onChange={(e) => setSmartCategory(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-red-500 cursor-pointer"
                      >
                        <option value="all">All Categories</option>
                        <option value="road_damage">Road Damage</option>
                        <option value="garbage">Garbage</option>
                        <option value="water_leakage">Water Leakage</option>
                        <option value="street_light">Street Light</option>
                        <option value="drainage">Drainage</option>
                        <option value="illegal_dumping">Illegal Dumping</option>
                        <option value="traffic_signal">Traffic Signal</option>
                        <option value="public_safety">Public Safety</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Department Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Assigned Department</label>
                      <select
                        value={smartDept}
                        onChange={(e) => setSmartDept(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-red-500 cursor-pointer"
                      >
                        <option value="all">All Departments</option>
                        <option value="Roads">Roads</option>
                        <option value="Sanitation">Sanitation</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Water Supply">Water Supply</option>
                        <option value="Drainage">Drainage</option>
                        <option value="Parks">Parks</option>
                        <option value="Traffic">Traffic</option>
                      </select>
                    </div>

                    {/* Priority Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Severity / Priority</label>
                      <select
                        value={smartPriority}
                        onChange={(e) => setSmartPriority(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-red-500 cursor-pointer"
                      >
                        <option value="all">All Priorities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    {/* Verification Status Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">AI Triage Status</label>
                      <select
                        value={smartVerificationStatus}
                        onChange={(e) => setSmartVerificationStatus(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-red-500 cursor-pointer"
                      >
                        <option value="all">All Triage Results</option>
                        <option value="verified">Verified</option>
                        <option value="requires_review">Requires Review</option>
                        <option value="rejected">Rejected</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>

                    {/* Officer Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Assigned Officer</label>
                      <select
                        value={smartOfficer}
                        onChange={(e) => setSmartOfficer(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-red-500 cursor-pointer"
                      >
                        <option value="all">All Officers</option>
                        {officers.map((o) => (
                          <option key={o.uid} value={o.uid}>
                            {o.displayName || o.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Location Sector match */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Location / Zone Sector</label>
                      <input
                        type="text"
                        value={smartLocation}
                        onChange={(e) => setSmartLocation(e.target.value)}
                        placeholder="Search address or zone..."
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 1: Executive Overview KPIs */}
              <ExecutiveOverview 
                reports={dashboardFilteredReports} 
                officersCount={officers.length} 
                busyOfficersCount={busyOfficersCount} 
              />

              {/* SECTION 2: City Health Score & AI Executive Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 flex">
                  <CityHealthScore reports={dashboardFilteredReports} />
                </div>
                <div className="lg:col-span-2 flex">
                  <ExecutiveSummary reports={dashboardFilteredReports} avgResolutionTime={avgResolutionTime} />
                </div>
              </div>

              {/* SECTION 3: Geospatial Incident Heatmap Map */}
              <IncidentHeatmap reports={dashboardFilteredReports} />

              {/* SECTION 4: AI Predictive Insights & Trend Analysis */}
              <PredictiveInsights reports={dashboardFilteredReports} />
              <TrendAnalysis reports={dashboardFilteredReports} />

              {/* SECTION 5: Division Workloads & Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 flex">
                  <DepartmentWorkload reports={dashboardFilteredReports} />
                </div>
                <div className="lg:col-span-2">
                  <AnalyticsCharts reports={dashboardFilteredReports} />
                </div>
              </div>

              {/* SECTION 6: Officer Performance Dashboard */}
              <OfficerPerformance officers={officers} reports={dashboardFilteredReports} />
            </div>
          ) : (
            <MunicipalAssistant reports={reports} users={users} />
          )}
    </>
  );
}
