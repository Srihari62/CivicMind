/**
 * @file src/components/dashboard/NotificationCenter.tsx
 * @description Premium Notification Center for citizens.
 * Listens to Firestore reports in real time, extracts timeline events, manages read states locally, and animates badge counts.
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, Trash2, X, FileText, Cpu, ShieldAlert, Wrench, Image as ImageIcon, CheckCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CivicReport } from "@/types";
import Link from "next/link";

interface NotificationCenterProps {
  reports: CivicReport[];
}

interface NotificationItem {
  id: string;
  reportId: string;
  reportTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  timestamp: string;
  isUnread: boolean;
}

export default function NotificationCenter({ reports }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load read notifications from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("civicmind_read_notifications");
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to read notification state from localStorage", e);
    }
  }, []);

  // Sync read state back to localStorage
  const saveReadState = (newReadIds: string[]) => {
    setReadIds(newReadIds);
    try {
      localStorage.setItem("civicmind_read_notifications", JSON.stringify(newReadIds));
    } catch (e) {
      console.error("Failed to save notification state to localStorage", e);
    }
  };

  // Extract notifications from reports' timeline events
  useEffect(() => {
    const list: NotificationItem[] = [];

    reports.forEach((report) => {
      const timeline = report.timeline || [];
      const titleLimit = report.ai?.assistant?.title || report.metadata.title || "Report";

      timeline.forEach((event) => {
        const action = event.action || "";
        const lowerAction = action.toLowerCase();
        let icon = Clock;
        let nTitle = "";
        let nDesc = "";

        // Check matching actions
        if (lowerAction.includes("citizen reported")) {
          icon = FileText;
          nTitle = "Report Submitted";
          nDesc = `Your report for "${titleLimit}" has been submitted successfully.`;
        } else if (lowerAction.includes("ai assistant") || lowerAction.includes("ai verification")) {
          icon = Cpu;
          nTitle = "AI Verification Complete";
          nDesc = `AI Triage has completed analysis for "${titleLimit}".`;
        } else if (lowerAction.includes("accepted") || lowerAction.includes("officer assigned")) {
          icon = ShieldAlert;
          nTitle = "Officer Assigned";
          nDesc = `A field officer was dispatched to investigate "${titleLimit}".`;
        } else if (lowerAction.includes("investigation started") || lowerAction.includes("investigation")) {
          icon = Wrench;
          nTitle = "Investigation Started";
          nDesc = `Investigation has commenced on site for "${titleLimit}".`;
        } else if (lowerAction.includes("progress uploaded") || lowerAction.includes("evidence uploaded")) {
          icon = ImageIcon;
          nTitle = "Repair Evidence Uploaded";
          nDesc = `Officer updated notes or uploaded progress media for "${titleLimit}".`;
        } else if (lowerAction.includes("resolved") || lowerAction.includes("completed")) {
          icon = CheckCircle;
          nTitle = "Incident Resolved";
          nDesc = `Incident "${titleLimit}" is resolved. View before/after reports.`;
        } else {
          // General fallback
          return;
        }

        const id = `${report.id}_${action}_${event.timestamp}`;
        const isUnread = !readIds.includes(id);

        list.push({
          id,
          reportId: report.id,
          reportTitle: titleLimit,
          icon,
          title: nTitle,
          description: nDesc,
          timestamp: event.timestamp,
          isUnread,
        });
      });
    });

    // Sort chronologically (newest first)
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setNotifications(list);
  }, [reports, readIds]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const handleMarkAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      saveReadState([...readIds, id]);
    }
  };

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    saveReadState(allIds);
  };

  const handleClearAll = () => {
    // Clear notifications by setting all as read
    const allIds = notifications.map((n) => n.id);
    saveReadState(allIds);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-zinc-300 hover:text-white"
        aria-label="Toggle notifications"
      >
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 border-2 border-zinc-950 text-[10px] font-extrabold flex items-center justify-center text-white"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3.5 w-80 md:w-96 rounded-2xl border border-white/10 bg-zinc-950/95 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden z-50 text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 bg-white/5">
              <span className="font-bold text-sm flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-400 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3 text-xs">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-zinc-400 hover:text-blue-400 font-semibold transition"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[350px] overflow-y-auto divide-y divide-white/5">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="p-3 bg-white/5 rounded-full border border-white/10 mb-3 text-zinc-500">
                    <Bell className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-zinc-400">All caught up!</span>
                  <span className="text-xs text-zinc-500 mt-1 max-w-[200px]">
                    You will receive notifications here as your municipal case profiles update in real time.
                  </span>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div
                      key={n.id}
                      className={`flex gap-3.5 p-4 items-start transition-all hover:bg-white/5 ${n.isUnread ? "bg-blue-500/[0.03]" : ""}`}
                    >
                      {/* Icon */}
                      <div className={`p-2 rounded-xl border shrink-0 ${n.isUnread ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-zinc-900 border-zinc-800 text-zinc-400"}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/reports/${n.reportId}`}
                            onClick={() => {
                              handleMarkAsRead(n.id);
                              setIsOpen(false);
                            }}
                            className="font-bold text-xs hover:text-blue-400 transition text-zinc-200 line-clamp-1 cursor-pointer"
                          >
                            {n.title}
                          </Link>
                          <span className="text-[9px] text-zinc-500 shrink-0 mt-0.5">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                          {n.description}
                        </p>
                        
                        {/* Action buttons */}
                        {n.isUnread && (
                          <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 mt-1.5"
                          >
                            <Check className="w-3 h-3" /> Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 bg-white/5 text-xs text-zinc-400">
                <span>Total notifications: {notifications.length}</span>
                <button
                  onClick={handleClearAll}
                  className="text-zinc-500 hover:text-rose-400 font-semibold flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
