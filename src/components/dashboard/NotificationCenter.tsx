/**
 * @file src/components/dashboard/NotificationCenter.tsx
 * @description Premium Notification Center component.
 * Listens to Firestore `notifications` collection in real-time, matching active user ID.
 */

"use client";

import React, { useState, useEffect, useRef } from"react";
import { Bell, Check, Trash2, X, FileText, Cpu, ShieldCheck, ShieldAlert, Wrench, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from"lucide-react";
import { motion, AnimatePresence } from"framer-motion";
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, deleteDoc } from"firebase/firestore";
import { db } from"@/services/firebase/firestore";
import { useAuth } from"@/providers/auth-provider";
import Link from"next/link";
import { DbNotification } from"@/features/reports/services/notification.service";

export default function NotificationCenter() {
 const { profile } = useAuth();
 const [notifications, setNotifications] = useState<DbNotification[]>([]);
 const [isOpen, setIsOpen] = useState(false);
 const [loading, setLoading] = useState(true);
 const dropdownRef = useRef<HTMLDivElement>(null);

 // 1. Subscribe to user notifications in real-time
 useEffect(() => {
 if (!profile?.uid) return;

 const q = query(
 collection(db,"notifications"),
 where("userId","==", profile.uid)
);

 const unsubscribe = onSnapshot(
 q,
 (snapshot) => {
 const list: DbNotification[] = [];
 snapshot.forEach((docSnap) => {
 list.push({ id: docSnap.id, ...docSnap.data() } as DbNotification);
 });

 // Sort chronologically (newest first)
 list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
 setNotifications(list);
 setLoading(false);
 },
 (error) => {
 console.error("Error listening to notifications snapshot:", error);
 setLoading(false);
 }
);

 return () => unsubscribe();
 }, [profile?.uid]);

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

 const unreadCount = notifications.filter((n) => !n.read).length;

 const handleMarkAsRead = async (id: string) => {
 try {
 const docRef = doc(db,"notifications", id);
 await updateDoc(docRef, { read: true });
 } catch (e) {
 console.error("Failed to mark notification as read:", e);
 }
 };

 const handleMarkAllAsRead = async () => {
 const unread = notifications.filter((n) => !n.read);
 if (unread.length === 0) return;

 try {
 const batch = writeBatch(db);
 unread.forEach((n) => {
 batch.update(doc(db,"notifications", n.id), { read: true });
 });
 await batch.commit();
 } catch (e) {
 console.error("Failed to mark all as read:", e);
 }
 };

 const handleClearAll = async () => {
 if (notifications.length === 0) return;

 try {
 const batch = writeBatch(db);
 notifications.forEach((n) => {
 batch.delete(doc(db,"notifications", n.id));
 });
 await batch.commit();
 setIsOpen(false);
 } catch (e) {
 console.error("Failed to clear notifications:", e);
 }
 };

 const getNotificationIcon = (type: string) => {
 switch (type) {
 case"report_submitted":
 return FileText;
 case"verification_completed":
 return Cpu;
 case"assigned_to_officer":
 return ShieldCheck;
 case"new_assignment":
 return ShieldAlert;
 case"investigation_started":
 return Wrench;
 case"citizen_added_evidence":
 return ImageIcon;
 case"resolved":
 return CheckCircle;
 case"high_priority_report":
 case"department_backlog":
 case"sla_risk":
 return AlertCircle;
 case"high_fake_media":
 return ShieldAlert;
 default:
 return Bell;
 }
 };

 return (
 <div className="relative" ref={dropdownRef}>
 {/* Trigger Button */}
 <button
 onClick={() => setIsOpen(!isOpen)}
 className="relative p-2.5 rounded-full bg-white/5 border border-slate-200 hover:bg-white/10 hover:border-slate-200 transition-all text-slate-600 hover:text-slate-800"
 aria-label="Toggle notifications"
 >
 <Bell className="w-5 h-5" />
 <AnimatePresence>
 {unreadCount > 0 && (
 <motion.span
 initial={{ scale: 0.5, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.5, opacity: 0 }}
 className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-655 border border-zinc-950 text-[10px] font-black flex items-center justify-center text-slate-800"
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
 className="fixed sm:absolute sm:right-0 top-[80px] sm:top-auto sm:mt-3.5 left-4 right-4 sm:left-auto w-auto sm:w-80 md:w-96 rounded-2xl border border-slate-200 bg-slate-50/95 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden z-[100] text-slate-800"
 >
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-white/5">
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
 className="text-slate-500 hover:text-blue-400 font-semibold transition"
 >
 Mark read
 </button>
)}
 <Link
 href="/notifications"
 onClick={() => setIsOpen(false)}
 className="text-blue-400 hover:text-blue-300 font-semibold transition"
 >
 View Page
 </Link>
 <button
 onClick={() => setIsOpen(false)}
 className="text-slate-500 hover:text-slate-800"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 </div>

 {/* List */}
 <div className="max-h-[350px] overflow-y-auto divide-y divide-white/5">
 {loading ? (
 <div className="flex items-center justify-center py-10">
 <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
 </div>
) : notifications.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
 <div className="p-3 bg-white/5 rounded-full border border-slate-200 mb-3 text-slate-500">
 <Bell className="w-6 h-6" />
 </div>
 <span className="text-sm font-bold text-slate-500">All caught up!</span>
 <span className="text-xs text-slate-500 mt-1 max-w-[200px]">
 You will receive notifications here as your municipal case profiles update in real time.
 </span>
 </div>
) : (
 notifications.map((n) => {
 const Icon = getNotificationIcon(n.type);
 return (
 <div
 key={n.id}
 className={`flex gap-3.5 p-4 items-start transition-all hover:bg-white/5 ${!n.read ?"bg-blue-500/[0.03]" :""}`}
 >
 {/* Icon */}
 <div className={`p-2 rounded-xl border shrink-0 ${!n.read ?"bg-blue-500/10 border-blue-500/20 text-blue-400" :"bg-slate-100 border-slate-200 text-slate-500"}`}>
 <Icon className="w-4 h-4" />
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0 space-y-1">
 <div className="flex items-start justify-between gap-2">
 <Link
 href={profile?.role ==="officer" ? `/officer/reports/${n.reportId}/investigate` : `/reports/${n.reportId}`}
 onClick={() => {
 handleMarkAsRead(n.id);
 setIsOpen(false);
 }}
 className="font-bold text-xs hover:text-blue-400 transition text-slate-700 line-clamp-1 cursor-pointer"
 >
 {n.title}
 </Link>
 <span className="text-[9px] text-slate-500 shrink-0 mt-0.5">
 {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :""}
 </span>
 </div>
 <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
 {n.message}
 </p>
 
 {/* Action buttons */}
 {!n.read && (
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
 <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-white/5 text-xs text-slate-500">
 <span>Total notifications: {notifications.length}</span>
 <button
 onClick={handleClearAll}
 className="text-slate-500 hover:text-rose-400 font-semibold flex items-center gap-1 transition"
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
