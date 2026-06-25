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

import { collection, query, onSnapshot } from "firebase/firestore";
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
  const [activeTab, setActiveTab] = useState<"command_center" | "incidents" | "officers" | "assistant">("command_center");

  // original Search & Filter State (retained for Registry tab)
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // original User management lists (retained for Officers tab)
  const [users, setUsers] = useState<FirestoreUserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");

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

  // Edit User profile States (Sprint 7)
  const [selectedUser, setSelectedUser] = useState<FirestoreUserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDepartment, setFormDepartment] = useState("Roads");
  const [formZone, setFormZone] = useState("");
  const [formAvailability, setFormAvailability] = useState<"available" | "busy" | "offline">("available");
  const [formActiveCases, setFormActiveCases] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formRole, setFormRole] = useState<"officer" | "citizen" | "admin">("officer");

  useEffect(() => {
    // 1. Subscribe to reports
    setLoading(true);
    const reportsQuery = query(collection(db, COLLECTIONS.REPORTS));
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
  }, []);

  const openEditForm = (u: FirestoreUserProfile) => {
    setSelectedUser(u);
    setFormName(u.displayName || "");
    setFormEmail(u.email || "");
    setFormPhone(u.phone || u.phoneNumber || "");
    setFormDepartment(u.department || "Roads");
    setFormZone(u.zone || "");
    setFormAvailability(u.availability || "available");
    setFormActiveCases(u.activeCases || 0);
    setFormIsActive(u.isActive ?? true);
    setFormRole(u.role || "officer");
    setIsEditing(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setUsersLoading(true);
    try {
      await OfficerService.updateProfile(selectedUser.uid, {
        displayName: formName,
        phone: formPhone,
        department: formDepartment,
        zone: formZone,
        availability: formAvailability,
        activeCases: formActiveCases,
        isActive: formIsActive,
        role: formRole,
        photoURL: selectedUser.photoURL || "",
        isProfileComplete: true,
      });
      setIsEditing(false);
      setSelectedUser(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save profile changes.");
    } finally {
      setUsersLoading(false);
    }
  };

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

  // 2. Filter Reports List (Registry tab)
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.metadata.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.metadata.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || r.metadata.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

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
    <RouteGuard allowedRoles={["admin"]}>
      <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-900 to-black text-slate-100 pb-16">
        {/* Navigation Bar */}
        <header className="border-b border-white/5 bg-black/60 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-500 text-lg">
                CIVICMIND
              </span>
              <span className="text-[10px] bg-red-500/10 text-red-400 font-mono px-2 py-0.5 rounded border border-red-500/20 font-black uppercase tracking-widest">
                Municipal Command Center
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-400 font-semibold hidden md:inline">
                {profile?.email} ({profile?.role})
              </span>
              <Button variant="outline" size="sm" onClick={() => logout()} className="border-white/10 hover:bg-zinc-900 text-zinc-300">
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
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
              onClick={() => setActiveTab("incidents")}
              className={`pb-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all px-1 flex items-center gap-1.5 ${
                activeTab === "incidents"
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Incidents Registry
            </button>
            <button
              onClick={() => setActiveTab("officers")}
              className={`pb-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all px-1 flex items-center gap-1.5 ${
                activeTab === "officers"
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Officer Directory
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
          ) : activeTab === "incidents" ? (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="relative group overflow-hidden border border-white/10 rounded-2xl bg-zinc-950/40 p-6 backdrop-blur-sm transition-all duration-300">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Pending Reports
                    </span>
                    <span className="text-4xl font-black text-slate-50 font-mono">
                      {loading ? "..." : pendingCount}
                    </span>
                  </div>
                </div>

                <div className="relative group overflow-hidden border border-white/10 rounded-2xl bg-zinc-950/40 p-6 backdrop-blur-sm transition-all duration-300">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                      Assigned Reports
                    </span>
                    <span className="text-4xl font-black text-slate-50 font-mono">
                      {loading ? "..." : assignedCount}
                    </span>
                  </div>
                </div>

                <div className="relative group overflow-hidden border border-white/10 rounded-2xl bg-zinc-950/40 p-6 backdrop-blur-sm transition-all duration-300">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Resolved Today
                    </span>
                    <span className="text-4xl font-black text-slate-50 font-mono">
                      {loading ? "..." : resolvedTodayCount}
                    </span>
                  </div>
                </div>

                <div className="relative group overflow-hidden border border-white/10 rounded-2xl bg-zinc-950/40 p-6 backdrop-blur-sm transition-all duration-300">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Avg Resolution Time
                    </span>
                    <span className="text-4xl font-black text-slate-50 font-mono">
                      {loading ? "..." : avgResolutionTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Incident Table */}
              <div className="border border-white/10 rounded-2xl bg-black/40 backdrop-blur-md overflow-hidden flex flex-col shadow-lg">
                {/* Table Header Filter Area */}
                <div className="border-b border-white/5 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/40">
                  <span className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-400" />
                    Live Incident Registry
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search incident ID, title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-red-500 w-64 transition-all"
                      />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5">
                      <Filter className="h-3.5 w-3.5 text-zinc-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-350 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Statuses</option>
                        <option value="submitted">Submitted</option>
                        <option value="investigating">Investigating</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5">
                      <Filter className="h-3.5 w-3.5 text-zinc-400" />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-350 focus:outline-none cursor-pointer"
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
                  </div>
                </div>

                {/* Table / List Container */}
                {loading ? (
                  <div className="py-24 text-center text-zinc-500 text-xs animate-pulse">
                    Synchronizing data registries...
                  </div>
                ) : error ? (
                  <div className="py-24 text-center text-rose-450 text-xs">{error}</div>
                ) : filteredReports.length === 0 ? (
                  <div className="py-24 text-center text-zinc-550 text-xs">
                    No incidents match the search criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-zinc-900/10 text-zinc-400 font-bold uppercase tracking-wider">
                          <th className="px-6 py-4">Incident ID</th>
                          <th className="px-6 py-4">Title / Category</th>
                          <th className="px-6 py-4">Severity / Priority</th>
                          <th className="px-6 py-4">Assigned Dept</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Submitted</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredReports.map((report) => (
                          <tr
                            key={report.id}
                            className="hover:bg-white/[0.01] transition-colors"
                          >
                            <td className="px-6 py-4.5 font-mono text-indigo-400">
                              #{report.id.slice(0, 8)}
                            </td>
                            <td className="px-6 py-4.5 flex flex-col gap-0.5">
                              <span className="font-extrabold text-zinc-200 line-clamp-1">
                                {report.metadata.title}
                              </span>
                              <span className="text-[10px] text-zinc-500 capitalize font-medium">
                                {report.metadata.category.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="flex flex-col gap-1">
                                {(() => {
                                  const severity = report.ai?.assistant?.severity || "medium";
                                  return (
                                    <span
                                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded self-start border ${
                                        severity === "critical"
                                          ? "bg-red-500/15 text-red-400 border-red-500/25"
                                          : severity === "high"
                                            ? "bg-orange-500/15 text-orange-400 border-orange-500/25"
                                            : severity === "medium"
                                              ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                                              : "bg-zinc-800 text-zinc-400 border-white/5"
                                      }`}
                                    >
                                      {severity}
                                    </span>
                                  );
                                })()}
                                {report.ai?.verification?.priority && (
                                  <span className="text-[9px] text-zinc-500 flex items-center gap-1 font-semibold">
                                    Priority:
                                    <strong className="capitalize text-zinc-300 font-extrabold">
                                      {report.ai.verification.priority}
                                    </strong>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4.5 font-bold text-zinc-300">
                              {report.ai?.assignment?.department || report.ai?.verification?.assignedDepartment || "Pending Triage"}
                            </td>
                            <td className="px-6 py-4.5">
                              <span
                                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-block border ${
                                  report.status === "resolved"
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                                    : report.status === "in_progress"
                                      ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                                      : report.status === "investigating"
                                        ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                                        : report.status === "rejected"
                                          ? "bg-rose-500/15 text-rose-400 border-rose-500/25"
                                          : "bg-zinc-800 text-zinc-500 border-white/5"
                                }`}
                              >
                                {report.status === "in_progress"
                                  ? "In Progress"
                                  : report.status === "investigating"
                                    ? "Investigating"
                                    : report.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 text-zinc-400 font-mono">
                              {new Date(report.timestamps.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <Link href={`/officer/reports/${report.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/5 gap-1.5 font-bold"
                                >
                                  Inspect Details
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === "assistant" ? (
            <MunicipalAssistant reports={reports} users={users} />
          ) : (
            <div className="flex flex-col gap-6">
              {isEditing && selectedUser ? (
                /* Edit Form */
                <div className="border border-white/10 rounded-2xl bg-black/40 p-6 backdrop-blur-md max-w-2xl w-full mx-auto shadow-2xl">
                  <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                    <Edit className="h-5 w-5 text-red-400" />
                    Configure User Profile: {selectedUser.email}
                  </h2>
                  <form onSubmit={handleSaveUser} className="flex flex-col gap-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Display Name</label>
                        <input
                          type="text"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Email</label>
                        <input
                          type="email"
                          value={formEmail}
                          disabled
                          className="w-full px-3 py-2 bg-zinc-900/40 border border-white/5 rounded-lg text-zinc-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Phone</label>
                        <input
                          type="text"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">System Role</label>
                        <select
                          value={formRole}
                          onChange={(e) => setFormRole(e.target.value as "officer" | "citizen" | "admin")}
                          className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
                        >
                          <option value="citizen">Citizen</option>
                          <option value="officer">Officer</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>
                    </div>

                    {formRole === "officer" && (
                      <div className="border border-white/5 rounded-xl bg-white/[0.01] p-4 flex flex-col gap-4 mt-2 shadow-inner">
                        <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                          Officer Specific Settings
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Assigned Department</label>
                            <select
                              value={formDepartment}
                              onChange={(e) => setFormDepartment(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
                            >
                              <option value="Roads">Roads</option>
                              <option value="Sanitation">Sanitation</option>
                              <option value="Electrical">Electrical</option>
                              <option value="Water Supply">Water Supply</option>
                              <option value="Drainage">Drainage</option>
                              <option value="Parks">Parks</option>
                              <option value="Traffic">Traffic</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Zone / Sector</label>
                            <input
                              type="text"
                              value={formZone}
                              onChange={(e) => setFormZone(e.target.value)}
                              placeholder="e.g. Zone A, North Sector"
                              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Availability Status</label>
                            <select
                              value={formAvailability}
                              onChange={(e) => setFormAvailability(e.target.value as "available" | "busy" | "offline")}
                              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
                            >
                              <option value="available">Available</option>
                              <option value="busy">Busy</option>
                              <option value="offline">Offline</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Active Cases</label>
                            <input
                              type="number"
                              value={formActiveCases}
                              onChange={(e) => setFormActiveCases(parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formIsActive}
                          onChange={(e) => setFormIsActive(e.target.checked)}
                          className="rounded border-white/10 bg-zinc-900 text-red-500 focus:ring-red-500/40 w-4 h-4"
                        />
                        <span className="font-bold text-zinc-350">Account Active (isActive)</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-4 border-t border-white/5 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedUser(null);
                        }}
                        className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={usersLoading}
                        className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-650 hover:to-rose-650 text-white border-none font-bold"
                      >
                        {usersLoading ? "Saving Settings..." : "Save Configured Profile"}
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                /* User/Officer Registry Table */
                <div className="border border-white/10 rounded-2xl bg-black/45 backdrop-blur-md overflow-hidden flex flex-col shadow-lg">
                  <div className="border-b border-white/5 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/40">
                    <span className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                      <Users className="h-5 w-5 text-red-400" />
                      Municipal User Directory
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search users name, email..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="pl-9 pr-4 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-red-500 w-64 transition-all"
                        />
                      </div>
                      {/* Role Filter */}
                      <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5">
                        <Filter className="h-3.5 w-3.5 text-zinc-400" />
                        <select
                          value={userRoleFilter}
                          onChange={(e) => setUserRoleFilter(e.target.value)}
                          className="bg-transparent text-xs font-bold text-slate-350 focus:outline-none cursor-pointer"
                        >
                          <option value="all">All Roles</option>
                          <option value="officer">Officers Only</option>
                          <option value="citizen">Citizens Only</option>
                          <option value="admin">Admins Only</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {usersLoading ? (
                    <div className="py-24 text-center text-zinc-500 text-xs animate-pulse">
                      Synchronizing user directories...
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/5 bg-zinc-900/10 text-zinc-400 font-bold uppercase tracking-wider">
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">System Role</th>
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4">Zone / Sector</th>
                            <th className="px-6 py-4">Availability</th>
                            <th className="px-6 py-4">Active Cases</th>
                            <th className="px-6 py-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {users
                            .filter((u) => {
                              const matchesSearch =
                                (u.displayName || "").toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                (u.email || "").toLowerCase().includes(userSearchTerm.toLowerCase());
                              const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
                              return matchesSearch && matchesRole;
                            })
                            .map((u) => (
                              <tr key={u.uid} className="hover:bg-white/[0.01] transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-zinc-300 text-xs overflow-hidden">
                                    {u.photoURL || u.photo ? (
                                      /* eslint-disable-next-line @next/next/no-img-element */
                                      <img src={u.photoURL || u.photo} alt={u.displayName} className="h-full w-full object-cover" />
                                    ) : (
                                      (u.displayName || u.email || "?").charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-extrabold text-zinc-200">{u.displayName || "No Name Set"}</span>
                                    <span className="text-zinc-500 font-mono text-[10px]">{u.email}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                                      u.role === "admin"
                                        ? "bg-red-500/15 text-red-400 border-red-500/25"
                                        : u.role === "officer"
                                          ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                                          : "bg-zinc-800 text-zinc-500 border-white/5"
                                    }`}
                                  >
                                    {u.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-zinc-300 font-bold">
                                  {u.role === "officer" ? u.department || "Unassigned" : "—"}
                                </td>
                                <td className="px-6 py-4 text-zinc-400">
                                  {u.role === "officer" ? u.zone || "No Zone" : "—"}
                                </td>
                                <td className="px-6 py-4">
                                  {u.role === "officer" ? (
                                    <span
                                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                                        u.availability === "available"
                                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                                          : u.availability === "busy"
                                            ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                                            : "bg-zinc-850 text-zinc-500 border-white/5"
                                      }`}
                                    >
                                      {u.availability || "offline"}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-zinc-350">
                                  {u.role === "officer" ? u.activeCases ?? 0 : "—"}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditForm(u)}
                                    className="border-white/10 hover:bg-zinc-900 text-red-400 hover:text-red-300 font-bold text-[10px] py-1 h-7"
                                  >
                                    Configure User
                                  </Button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </RouteGuard>
  );
}
