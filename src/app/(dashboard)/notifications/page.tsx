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
import { db } from "@/services/firebase/firestore";
import { Bell, Check, Trash2, FileText, Cpu, ShieldCheck, ShieldAlert, Wrench, Image as ImageIcon, CheckCircle, AlertCircle, Loader2, ArrowRight, LogOut, LayoutDashboard, MessageSquare, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DbNotification } from "@/features/reports/services/notification.service";
import NotificationCenter from "@/components/dashboard/NotificationCenter";

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
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 selection:bg-blue-500/20 relative overflow-x-hidden font-sans">
        {/* Ambient Background Data Stream Effects */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-65">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-200/30 blur-[120px] animate-blob" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-200/20 blur-[150px] animate-blob animation-delay-2000" />
        </div>

        {/* Floating Glassmorphic Navigation Bar */}
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-3.5 max-w-6xl mx-auto bg-white/80 border border-white/60 backdrop-blur-2xl rounded-full mt-6 mx-auto w-[92%] shadow-[0_8px_30px_rgb(163,177,198,0.2)] transition-transform duration-200">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-extrabold text-blue-600 tracking-wider flex items-center gap-1.5 select-none text-base">
              <span className="hidden sm:flex w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="hidden sm:inline">CivicMind</span>
              <span className="sm:hidden w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-md text-sm font-black tracking-normal">CM</span>
            </Link>
            
            {/* Desktop Navbar */}
            <nav className="hidden md:flex bg-slate-100/80 p-1.5 rounded-full border border-slate-200/50 items-center gap-1 text-[10px] font-black uppercase tracking-widest relative">
              <Link
                href={
                  profile?.role === 'officer'
                    ? '/officer'
                    : profile?.role === 'admin'
                      ? '/admin'
                      : '/dashboard'
                }
                className="relative px-4 py-2 rounded-full transition-all text-slate-500 hover:text-slate-800"
              >
                <span className="relative z-10">Dashboard</span>
              </Link>
              <Link href="/community" className="relative px-4 py-2 rounded-full transition-all text-slate-500 hover:text-slate-800">
                <span className="relative z-10">Community Feed</span>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/reports/new" className="hidden sm:block">
              <Button size="sm" variant="primary">Report Issue</Button>
            </Link>

            <Link
              href="/profile"
              className="flex items-center gap-2 hover:opacity-80 transition"
              title="View Profile"
            >
              {profile?.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatarUrl}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full border border-white/80 object-cover shadow-sm"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 text-xs font-bold font-mono">
                  {profile?.displayName?.[0]?.toUpperCase() || 'C'}
                </div>
              )}
            </Link>

            <Button variant="ghost" size="icon" onClick={() => logout()} className="text-slate-500 hover:bg-slate-100 rounded-full">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="relative z-10 mx-auto flex w-[92%] max-w-4xl flex-1 flex-col gap-6 px-0 pt-32 pb-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Notification Feed
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Stay updated with reports, verified statuses, assignments, and resolution updates.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              {notifications.filter((n) => !n.read).length > 0 && (
                <Button size="sm" variant="outline" onClick={handleMarkAllAsRead} className="bg-white/50 border-slate-200 hover:bg-slate-100 text-slate-700 text-xs shadow-sm">
                  <Check className="w-3.5 h-3.5 mr-1" /> Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleClearAll} className="bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 text-xs shadow-sm">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/60 border border-slate-200/60 rounded-2xl p-4 backdrop-blur-md shadow-sm">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="bg-white/80 border-slate-200 text-slate-800 max-w-xs w-full text-xs h-9 shadow-sm"
            />

            <div className="flex items-center gap-1 bg-slate-100/80 p-1 border border-slate-200/50 rounded-xl shadow-inner">
              {(["all", "read", "unread"] as const).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={filter === mode ? "primary" : "ghost"}
                  onClick={() => setFilter(mode)}
                  className={`capitalize text-xs px-4 h-8 ${filter === mode ? "bg-blue-600 shadow-md text-white" : "text-slate-600 hover:text-slate-900"}`}
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
            <div className="border border-dashed border-slate-300 rounded-3xl p-16 text-center bg-white/40 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Bell className="w-8 h-8 text-slate-400" />
              <span className="font-bold text-sm text-slate-600">No notifications found</span>
              <p className="text-xs text-slate-500 max-w-xs leading-normal">
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
                      className={`group border rounded-2xl p-5 backdrop-blur-sm transition-all flex items-start gap-4 shadow-sm relative ${!n.read ? "border-blue-200 bg-blue-50/50" : "border-slate-200/60 bg-white/60 hover:bg-white/90"}`}
                    >
                      {/* Interactive glow border on hover */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${!n.read ? "bg-blue-500" : "bg-transparent group-hover:bg-slate-300"} transition-all`} />

                      {/* Icon */}
                      <div className={`p-2.5 rounded-xl border shrink-0 ${!n.read ? "bg-blue-100/50 border-blue-200 text-blue-600 shadow-inner" : "bg-slate-100/50 border-slate-200 text-slate-500"}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-extrabold text-sm text-slate-800">{n.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-medium">
                            {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1 pr-6 font-medium">
                          {n.message}
                        </p>

                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200/50 text-[11px] text-slate-500">
                          {n.reportId && (
                            <Link
                              href={profile?.role === "officer" ? `/officer/reports/${n.reportId}/investigate` : `/reports/${n.reportId}`}
                              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors"
                            >
                              Go to workspace <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                          {!n.read && (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="text-emerald-600 hover:text-emerald-700 font-bold ml-auto flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" /> Mark read
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(n.id)}
                            className={`text-slate-500 hover:text-rose-600 font-bold ${n.read ? "ml-auto" : "ml-2 md:ml-0"} hover:bg-rose-50 px-2.5 py-1 rounded-full transition-colors`}
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
        
        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-slate-200/80 bg-white/90 backdrop-blur-2xl py-2 px-6 flex justify-around items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <Link 
            href={
              profile?.role === 'officer' ? '/officer' : 
              profile?.role === 'admin' ? '/admin' : '/dashboard'
            } 
            className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Dashboard</span>
          </Link>
          <Link href="/community" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Feed</span>
          </Link>
          <Link href="/reports/new" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 transition-colors relative -top-3">
            <div className="bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-500/30">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider mt-1 text-slate-500">Report</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <User className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Profile</span>
          </Link>
        </div>
      </div>
    </RouteGuard>
  );
}
