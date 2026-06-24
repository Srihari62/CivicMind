/**
 * @file src/app/(dashboard)/admin/page.tsx
 * @description Admin Dashboard page.
 * Displays real-time statistics (Pending, Assigned, Resolved Today, Average Resolution Time)
 * and an interactive table of all submitted municipal reports.
 */

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { Button } from "@/components/ui/button";
import { ReportService } from "@/features/reports/services/report.service";
import { CivicReport } from "@/types";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Shield,
  Users,
  Edit,
} from "lucide-react";
import Link from "next/link";
import { FirestoreUserProfile } from "@/features/auth/repositories/user.repository";
import { OfficerService } from "@/features/reports/services/officer.service";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  const { profile, logout } = useAuth();
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Tab State & Users States (Sprint 7)
  const [activeTab, setActiveTab] = useState<"incidents" | "officers">("incidents");
  const [users, setUsers] = useState<FirestoreUserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  
  // Edit Form State (Sprint 7)
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

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ReportService.getAllReports();
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await OfficerService.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (activeTab === "officers") {
      loadUsers();
    }
  }, [activeTab]);

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
        photoURL: "",
        isProfileComplete: true,
      });
      setIsEditing(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save profile changes.");
    } finally {
      setUsersLoading(false);
    }
  };

  // 1. Calculate Stats
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

  // 2. Filter Reports List
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.metadata.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.metadata.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || r.metadata.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <RouteGuard allowedRoles={["admin"]}>
      <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100">
        {/* Navigation Bar */}
        <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-500 text-lg">
                CIVICMIND
              </span>
              <span className="text-xs bg-red-500/20 text-red-300 font-mono px-2 py-0.5 rounded border border-red-500/30">
                Admin Console
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400 font-medium hidden md:inline">
                {profile?.email} ({profile?.role})
              </span>
              <Button variant="outline" size="sm" onClick={() => logout()} className="border-slate-800 hover:bg-slate-900 text-slate-300">
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 to-slate-300 bg-clip-text text-transparent">
                Administrator Console: {profile?.displayName}
              </h1>
              <p className="text-sm text-slate-400">
                Configure municipal parameters, audit system incidents, monitor automated dispatches, and review metrics.
              </p>
            </div>
            <Button
              onClick={loadReports}
              disabled={loading}
              variant="outline"
              size="sm"
              className="self-start md:self-auto border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300 flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Sync Feeds
            </Button>
          </div>

          {/* Tabs Navigation (Sprint 7) */}
          <div className="flex border-b border-slate-800 gap-4 mb-2">
            <button
              onClick={() => setActiveTab("incidents")}
              className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all px-2 ${
                activeTab === "incidents"
                  ? "border-rose-500 text-rose-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Incidents Registry
            </button>
            <button
              onClick={() => setActiveTab("officers")}
              className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all px-2 ${
                activeTab === "officers"
                  ? "border-rose-500 text-rose-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Officer Management
            </button>
          </div>

          {activeTab === "incidents" ? (
            <>
              {/* 4 Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stat Card 1: Pending */}
                <div className="relative group overflow-hidden border border-slate-800/80 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.05)]">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500 group-hover:opacity-20 transition-opacity">
                    <Clock className="h-16 w-16" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Pending Reports
                    </span>
                    <span className="text-4xl font-black text-slate-50">
                      {loading ? "..." : pendingCount}
                    </span>
                    <span className="text-xs text-slate-400">Awaiting initial review</span>
                  </div>
                </div>

                {/* Stat Card 2: Assigned */}
                <div className="relative group overflow-hidden border border-slate-800/80 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.05)]">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-500 group-hover:opacity-20 transition-opacity">
                    <UserCheck className="h-16 w-16" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                      Assigned Reports
                    </span>
                    <span className="text-4xl font-black text-slate-50">
                      {loading ? "..." : assignedCount}
                    </span>
                    <span className="text-xs text-slate-400">Under active resolution</span>
                  </div>
                </div>

                {/* Stat Card 3: Resolved Today */}
                <div className="relative group overflow-hidden border border-slate-800/80 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500 group-hover:opacity-20 transition-opacity">
                    <CheckCircle2 className="h-16 w-16" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Resolved Today
                    </span>
                    <span className="text-4xl font-black text-slate-50">
                      {loading ? "..." : resolvedTodayCount}
                    </span>
                    <span className="text-xs text-slate-400">Closed in the last 24h</span>
                  </div>
                </div>

                {/* Stat Card 4: Average Resolution Time */}
                <div className="relative group overflow-hidden border border-slate-800/80 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.05)]">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-500 group-hover:opacity-20 transition-opacity">
                    <AlertCircle className="h-16 w-16" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Avg Resolution Time
                    </span>
                    <span className="text-4xl font-black text-slate-50">
                      {loading ? "..." : avgResolutionTime}
                    </span>
                    <span className="text-xs text-slate-400">Incident resolution cycle</span>
                  </div>
                </div>
              </div>

              {/* Interactive Incident Table */}
              <div className="border border-slate-800/80 rounded-2xl bg-slate-950/20 backdrop-blur-md overflow-hidden flex flex-col">
                {/* Table Header Filter Area */}
                <div className="border-b border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40">
                  <span className="font-bold text-lg text-slate-100 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-rose-400" />
                    Live Incident Registry
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search incident ID, title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 w-64 transition-all"
                      />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5">
                      <Filter className="h-3.5 w-3.5 text-slate-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer"
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
                    <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5">
                      <Filter className="h-3.5 w-3.5 text-slate-400" />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer"
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
                  <div className="py-24 text-center text-slate-400 text-sm animate-pulse">
                    Synchronizing data registries...
                  </div>
                ) : error ? (
                  <div className="py-24 text-center text-rose-400 text-sm">{error}</div>
                ) : filteredReports.length === 0 ? (
                  <div className="py-24 text-center text-slate-500 text-sm">
                    No incidents match the search criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 font-medium">
                          <th className="px-6 py-4">Incident ID</th>
                          <th className="px-6 py-4">Title / Category</th>
                          <th className="px-6 py-4">Severity / Priority</th>
                          <th className="px-6 py-4">Assigned Dept</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Submitted</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredReports.map((report) => (
                          <tr
                            key={report.id}
                            className="hover:bg-slate-900/20 transition-colors"
                          >
                            <td className="px-6 py-4 font-mono text-xs text-indigo-400">
                              #{report.id.slice(0, 8)}
                            </td>
                            <td className="px-6 py-4 flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-200 line-clamp-1">
                                {report.metadata.title}
                              </span>
                              <span className="text-xs text-slate-500 capitalize">
                                {report.metadata.category.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                {(() => {
                                  const severity = report.ai?.assistant?.severity || "medium";
                                  return (
                                    <span
                                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded self-start ${
                                        severity === "critical"
                                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                          : severity === "high"
                                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                            : severity === "medium"
                                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                              : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                                      }`}
                                    >
                                      {severity}
                                    </span>
                                  );
                                })()}
                                {report.ai?.verification?.priority && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    Priority:
                                    <strong className="capitalize text-slate-300 font-semibold">
                                      {report.ai.verification.priority}
                                    </strong>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-300">
                              {report.ai?.assignment?.department || report.ai?.verification?.assignedDepartment || "Pending Audit"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block ${
                                  report.status === "resolved"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : report.status === "in_progress"
                                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                      : report.status === "investigating"
                                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                        : report.status === "rejected"
                                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                          : "bg-slate-800 text-slate-400 border border-slate-700/50"
                                }`}
                              >
                                {report.status === "in_progress"
                                  ? "In Progress"
                                  : report.status === "investigating"
                                    ? "Investigating"
                                    : report.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-400">
                              {new Date(report.timestamps.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link href={`/officer/reports/${report.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 gap-1.5"
                                >
                                  Inspect
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
          ) : (
            <div className="flex flex-col gap-6">
              {isEditing && selectedUser ? (
                /* Edit Form */
                <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-md max-w-2xl w-full mx-auto">
                  <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <Edit className="h-5 w-5 text-rose-400" />
                    Configure User Profile: {selectedUser.email}
                  </h2>
                  <form onSubmit={handleSaveUser} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Display Name</label>
                        <input
                          type="text"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Email</label>
                        <input
                          type="email"
                          value={formEmail}
                          disabled
                          className="w-full px-3 py-2 bg-slate-900/40 border border-slate-800 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Phone</label>
                        <input
                          type="text"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">System Role</label>
                        <select
                          value={formRole}
                          onChange={(e) => setFormRole(e.target.value as "officer" | "citizen" | "admin")}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                        >
                          <option value="citizen">Citizen</option>
                          <option value="officer">Officer</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>
                    </div>

                    {formRole === "officer" && (
                      <div className="border border-slate-800/80 rounded-xl bg-slate-900/20 p-4 flex flex-col gap-4 mt-2">
                        <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                          Officer Specific Settings
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-slate-400 block mb-1">Assigned Department</label>
                            <select
                              value={formDepartment}
                              onChange={(e) => setFormDepartment(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500"
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
                            <label className="text-xs font-semibold text-slate-400 block mb-1">Zone / Sector</label>
                            <input
                              type="text"
                              value={formZone}
                              onChange={(e) => setFormZone(e.target.value)}
                              placeholder="e.g. Zone A, North Sector"
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-400 block mb-1">Availability Status</label>
                            <select
                              value={formAvailability}
                              onChange={(e) => setFormAvailability(e.target.value as "available" | "busy" | "offline")}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                            >
                              <option value="available">Available</option>
                              <option value="busy">Busy</option>
                              <option value="offline">Offline</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-400 block mb-1">Active Cases</label>
                            <input
                              type="number"
                              value={formActiveCases}
                              onChange={(e) => setFormActiveCases(parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500"
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
                          className="rounded border-slate-800 bg-slate-900 text-rose-500 focus:ring-rose-500"
                        />
                        <span className="text-xs font-semibold text-slate-300">Account Active (isActive)</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-4 border-t border-slate-800 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedUser(null);
                        }}
                        className="text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={usersLoading}
                        className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-slate-100 border-none"
                      >
                        {usersLoading ? "Saving..." : "Save Settings"}
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                /* User/Officer Registry Table */
                <div className="border border-slate-800/80 rounded-2xl bg-slate-950/20 backdrop-blur-md overflow-hidden flex flex-col">
                  <div className="border-b border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40">
                    <span className="font-bold text-lg text-slate-100 flex items-center gap-2">
                      <Users className="h-5 w-5 text-rose-400" />
                      Municipal User Directory
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search users name, email..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="pl-9 pr-4 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 w-64 transition-all"
                        />
                      </div>
                      {/* Role Filter */}
                      <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5">
                        <Filter className="h-3.5 w-3.5 text-slate-400" />
                        <select
                          value={userRoleFilter}
                          onChange={(e) => setUserRoleFilter(e.target.value)}
                          className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer"
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
                    <div className="py-24 text-center text-slate-400 text-sm animate-pulse">
                      Synchronizing user directories...
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 font-medium">
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">System Role</th>
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4">Zone / Sector</th>
                            <th className="px-6 py-4">Availability</th>
                            <th className="px-6 py-4">Active Cases</th>
                            <th className="px-6 py-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {users
                            .filter((u) => {
                              const matchesSearch =
                                (u.displayName || "").toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                (u.email || "").toLowerCase().includes(userSearchTerm.toLowerCase());
                              const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
                              return matchesSearch && matchesRole;
                            })
                            .map((u) => (
                              <tr key={u.uid} className="hover:bg-slate-900/20 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs overflow-hidden">
                                    {u.photoURL || u.photo ? (
                                      /* eslint-disable-next-line @next/next/no-img-element */
                                      <img src={u.photoURL || u.photo} alt={u.displayName} className="h-full w-full object-cover" />
                                    ) : (
                                      (u.displayName || u.email || "?").charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-200">{u.displayName || "No Name Set"}</span>
                                    <span className="text-xs text-slate-500">{u.email}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                      u.role === "admin"
                                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                        : u.role === "officer"
                                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                          : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                                    }`}
                                  >
                                    {u.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-semibold text-slate-300">
                                  {u.role === "officer" ? u.department || "Unassigned" : "—"}
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-400">
                                  {u.role === "officer" ? u.zone || "No Zone" : "—"}
                                </td>
                                <td className="px-6 py-4">
                                  {u.role === "officer" ? (
                                    <span
                                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                        u.availability === "available"
                                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                          : u.availability === "busy"
                                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                            : "bg-slate-800 text-slate-500 border border-slate-700/50"
                                      }`}
                                    >
                                      {u.availability || "offline"}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="px-6 py-4 text-xs font-mono font-bold text-slate-300">
                                  {u.role === "officer" ? u.activeCases ?? 0 : "—"}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditForm(u)}
                                    className="border-slate-800 hover:bg-slate-900 text-rose-400 hover:text-rose-350"
                                  >
                                    Configure
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
