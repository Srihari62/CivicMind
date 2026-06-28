/**
 * @file src/app/(dashboard)/officer/completed/page.tsx
 * @description Displays resolved and closed cases for the logged-in officer.
 */

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { CivicReport } from "@/types";
import { CheckCircle2, RefreshCw, Search, Filter, ArrowRight } from "lucide-react";
import Link from "next/link";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";

export const dynamic = "force-dynamic";

export default function CompletedCasesPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    if (!profile?.uid) return;

    setLoading(true);
    const q = query(collection(db, COLLECTIONS.REPORTS));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: CivicReport[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as CivicReport);
        });
        setReports(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to reports:", err);
        setError("Failed to stream reports update.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile?.uid]);

  // Filter reports completed/resolved where assigned officer is this user
  const myCompletedReports = reports.filter((r) => {
    const isAssignedToMe = r.ai?.assignment?.officerId === profile?.uid;
    if (!isAssignedToMe) return false;

    // Check if status is resolved
    return r.status === "resolved";
  });

  const filteredReports = myCompletedReports.filter((r) => {
    const matchesSearch =
      r.metadata.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.metadata.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.location.formattedAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || r.metadata.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="max-w-7xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-200 to-emerald-500 bg-clip-text text-transparent">
            Completed Case Archives
          </h1>
          <p className="text-sm text-slate-400">
            Historical records of incidents you resolved or verified on behalf of the municipality.
          </p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          disabled={loading}
          variant="outline"
          size="sm"
          className="self-start md:self-auto border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300 flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Sync
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-slate-950/40 p-4 rounded-xl border border-slate-850">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search completed cases by ID, title, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-450" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-emerald-500/50 capitalize"
            >
              <option value="all">All States</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-emerald-500/50 capitalize"
          >
            <option value="all">All Categories</option>
            <option value="Roads">Roads & Potholes</option>
            <option value="Sanitation">Sanitation & Garbage</option>
            <option value="Utilities">Utilities & Water</option>
            <option value="Safety">Public Safety</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
          <p className="text-sm text-slate-450 font-medium">Streaming resolved histories...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="border border-slate-850 rounded-2xl bg-slate-950/20 p-16 flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-200 mb-1">No Completed Cases</h3>
          <p className="text-sm text-slate-450 max-w-sm">
            There are no resolved or closed cases matching your search criteria.
          </p>
        </div>
      ) : (
        <div className="border border-slate-850 rounded-2xl bg-slate-950/30 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-900/35">
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-450">ID</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-455">Title & Address</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-455">Department</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-455">Status</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-455">Resolved Date</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-400">
                      #{report.id.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-200">{report.metadata.title}</span>
                        <span className="text-xs text-slate-500 line-clamp-1">{report.location.formattedAddress}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-300">
                      {report.ai?.assignment?.department || "Pending Audit"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold inline-block capitalize ${
                          report.status === "resolved"
                            ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-500/25 text-slate-350 border border-slate-500/30"
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {report.resolution?.resolvedAt
                        ? new Date(report.resolution.resolvedAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/officer/reports/${report.id}/investigate`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 gap-1.5"
                        >
                          View Work
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
