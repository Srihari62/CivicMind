/**
 * @file src/app/(dashboard)/notifications/page.tsx
 * @description Dedicated Notifications workspace page.
 * Displays all notifications in real-time, supports filtering (all, read, unread), search, mark as read, and clear actions.
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, deleteDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { Bell, Check, Trash2, FileText, Cpu, ShieldCheck, ShieldAlert, Wrench, Image as ImageIcon, CheckCircle, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DbNotification } from "@/features/reports/services/notification.service";

export default function NotificationsPage() {
  const { profile, logout } = useAuth();
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "read" | "unread">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", profile.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: DbNotification[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as DbNotification);
        });
        
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setNotifications(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to notifications:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile?.uid]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, "notifications", n.id), { read: true });
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;

    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        batch.delete(doc(db, "notifications", n.id));
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "report_submitted":
        return FileText;
      case "verification_completed":
        return Cpu;
      case "assigned_to_officer":
        return ShieldCheck;
      case "new_assignment":
        return ShieldAlert;
      case "investigation_started":
        return Wrench;
      case "citizen_added_evidence":
        return ImageIcon;
      case "resolved":
        return CheckCircle;
      case "high_priority_report":
      case "department_backlog":
      case "sla_risk":
        return AlertCircle;
      case "high_fake_media":
        return ShieldAlert;
      default:
        return Bell;
    }
  };

  // Filter & Search logic
  const filtered = notifications
    .filter((n) => {
      if (filter === "read") return n.read;
      if (filter === "unread") return !n.read;
      return true;
    })
    .filter((n) => {
      const queryStr = search.toLowerCase();
      return (
        n.title.toLowerCase().includes(queryStr) ||
        n.message.toLowerCase().includes(queryStr)
      );
    });

  return (
    <RouteGuard allowedRoles={["citizen", "officer", "admin"]}>
      <div className="flex min-h-screen flex-col bg-zinc-950 text-white selection:bg-blue-600/30">
        {/* Navigation Bar */}
        <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="font-bold text-blue-500 tracking-wider flex items-center gap-1.5 select-none">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                CivicMind
              </span>
              <nav className="hidden md:flex items-center gap-4 text-sm font-semibold font-sans">
                <Link href={profile?.role === "officer" ? "/officer" : profile?.role === "admin" ? "/admin" : "/dashboard"} className="text-zinc-400 hover:text-white transition">
                  Dashboard
                </Link>
                <Link href="/community" className="text-zinc-400 hover:text-white transition">
                  Community Feed
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition" title="View Profile">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold font-mono">
                    {profile?.displayName?.[0]?.toUpperCase() || "C"}
                  </div>
                )}
              </Link>
              <Button variant="outline" size="sm" onClick={() => logout()} className="border-white/10 hover:bg-zinc-900 text-zinc-300">
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Notification Feed
              </h1>
              <p className="text-sm text-zinc-450 mt-1">
                Stay updated with reports, verified statuses, assignments, and resolution updates.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              {notifications.filter((n) => !n.read).length > 0 && (
                <Button size="sm" variant="outline" onClick={handleMarkAllAsRead} className="border-white/5 hover:bg-zinc-800 text-zinc-300 text-xs">
                  <Check className="w-3.5 h-3.5 mr-1" /> Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleClearAll} className="bg-rose-950/40 border border-rose-500/25 text-rose-300 hover:bg-rose-900/60 text-xs">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-zinc-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md shadow-lg">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="bg-zinc-950 border-white/15 text-white max-w-xs w-full text-xs h-9"
            />

            <div className="flex items-center gap-1 bg-zinc-955 p-1 border border-white/5 rounded-xl">
              {(["all", "read", "unread"] as const).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={filter === mode ? "primary" : "ghost"}
                  onClick={() => setFilter(mode)}
                  className={`capitalize text-xs px-4 h-8 ${filter === mode ? "bg-blue-600 hover:bg-blue-500 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-3xl p-16 text-center bg-zinc-900/5 backdrop-blur flex flex-col items-center justify-center gap-3">
              <Bell className="w-8 h-8 text-zinc-600" />
              <span className="font-bold text-sm text-zinc-350">No notifications found</span>
              <p className="text-xs text-zinc-500 max-w-xs leading-normal">
                No notifications match your filter criteria or search query.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((n) => {
                  const Icon = getNotificationIcon(n.type);
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`group border border-white/10 rounded-2xl p-5 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all flex items-start gap-4 shadow-md relative ${!n.read ? "border-blue-500/20 bg-blue-500/[0.01]" : ""}`}
                    >
                      {/* Interactive glow border on hover */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${!n.read ? "bg-blue-500" : "bg-transparent group-hover:bg-zinc-700"} transition-all`} />

                      {/* Icon */}
                      <div className={`p-2.5 rounded-xl border shrink-0 ${!n.read ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-zinc-950 border-zinc-800 text-zinc-500"}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-extrabold text-sm text-zinc-200">{n.title}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed mt-1 pr-6">
                          {n.message}
                        </p>

                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5 text-[11px] text-zinc-500">
                          {n.reportId && (
                            <Link
                              href={profile?.role === "officer" ? `/officer/reports/${n.reportId}/investigate` : `/reports/${n.reportId}`}
                              className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                            >
                              Go to incident workspace <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                          {!n.read && (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="text-emerald-400 hover:text-emerald-350 font-bold ml-auto flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Mark read
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(n.id)}
                            className="text-zinc-500 hover:text-rose-400 font-bold ml-auto md:ml-0"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </RouteGuard>
  );
}
