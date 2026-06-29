/**
 * @file src/app/(dashboard)/admin/officers/page.tsx
 * @description Advanced Officer and User Directory management console for Administrators.
 */

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  Plus,
  Edit,
  UserCheck,
  UserX,
  Check,
  X,
  Mail,
  Phone,
  Shield,
  Activity,
  User,
  Image,
  MapPin,
  Briefcase,
  ChevronDown
} from "lucide-react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { FirestoreUserProfile } from "@/features/auth/repositories/user.repository";
import { createNewUserAction } from "@/app/actions/admin.actions";
import { updateOfficerProfileAdminAction } from "@/app/actions/officer.actions";
import { motion, AnimatePresence } from "framer-motion";

export default function OfficerDirectoryPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<FirestoreUserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter, Sort State
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [availFilter, setAvailFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<FirestoreUserProfile | null>(null);

  // Add User Form State
  const [addForm, setAddForm] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "officer" as "citizen" | "officer" | "admin",
    department: "",
    zone: "",
    phone: "",
    photoURL: "",
    isActive: true,
    state: "",
    city: "",
    preferredLanguage: "en",
  });

  // Edit User Form State
  const [editForm, setEditForm] = useState({
    displayName: "",
    role: "officer" as "citizen" | "officer" | "admin",
    department: "",
    zone: "",
    phone: "",
    photoURL: "",
    availability: "available" as "available" | "busy" | "offline",
    isActive: true,
    state: "",
    city: "",
    preferredLanguage: "en",
  });

  // Toast / Status messages
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time listener for all users
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.USERS));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const uList: FirestoreUserProfile[] = [];
        snapshot.forEach((doc) => {
          uList.push({ uid: doc.id, ...doc.data() } as FirestoreUserProfile);
        });
        setUsers(uList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
        showToast("Failed to load user directory.", "error");
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Add User Submit Handler
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setIsSubmitting(true);
    try {
      const response = await createNewUserAction(profile.uid, {
        email: addForm.email,
        password: addForm.password,
        displayName: addForm.displayName,
        role: addForm.role,
        department: addForm.role === "officer" ? addForm.department : "",
        zone: addForm.role === "officer" ? addForm.zone : "",
        phoneNumber: addForm.phone,
        photoURL: addForm.photoURL,
        isActive: addForm.isActive,
        state: addForm.state,
        city: addForm.city,
        preferredLanguage: addForm.preferredLanguage,
      });

      if (response.success) {
        showToast("User account created successfully.", "success");
        setIsAddModalOpen(false);
        // Reset Form
        setAddForm({
          displayName: "",
          email: "",
          password: "",
          role: "officer",
          department: "",
          zone: "",
          phone: "",
          photoURL: "",
          isActive: true,
          state: "",
          city: "",
          preferredLanguage: "en",
        });
      } else {
        showToast(response.error || "Failed to create user.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An unexpected error occurred.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Form
  const openEditModal = (user: FirestoreUserProfile) => {
    setEditingUser(user);
    setEditForm({
      displayName: user.displayName || "",
      role: user.role || "citizen",
      department: user.department || "",
      zone: user.zone || "",
      phone: user.phone || "",
      photoURL: user.photoURL || user.photo || "",
      availability: user.availability || "available",
      isActive: user.isActive !== false,
      state: user.state || "",
      city: user.city || "",
      preferredLanguage: user.preferredLanguage || "en",
    });
    setIsEditModalOpen(true);
  };

  // Edit User Submit Handler
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid || !editingUser) return;
    setIsSubmitting(true);
    try {
      const response = await updateOfficerProfileAdminAction(profile.uid, editingUser.uid, {
        displayName: editForm.displayName,
        role: editForm.role,
        department: editForm.role === "officer" ? editForm.department : "",
        zone: editForm.role === "officer" ? editForm.zone : "",
        phone: editForm.phone,
        photo: editForm.photoURL,
        availability: editForm.availability,
        isActive: editForm.isActive,
        state: editForm.state,
        city: editForm.city,
        preferredLanguage: editForm.preferredLanguage,
      });

      if (response.success) {
        showToast("User profile updated successfully.", "success");
        setIsEditModalOpen(false);
        setEditingUser(null);
      } else {
        showToast(response.error || "Failed to update user profile.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An unexpected error occurred.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle user status immediately
  const toggleUserStatus = async (user: FirestoreUserProfile) => {
    if (!profile?.uid) return;
    const newStatus = user.isActive === false;
    try {
      const response = await updateOfficerProfileAdminAction(profile.uid, user.uid, {
        role: user.role,
        department: user.department || "",
        zone: user.zone || "",
        availability: user.availability || "available",
        isActive: newStatus,
      });
      if (response.success) {
        showToast(
          `User account has been ${newStatus ? "enabled" : "disabled"}.`,
          "success"
        );
      } else {
        showToast(response.error || "Failed to toggle user status.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update status.", "error");
    }
  };

  // Filter & Sort Logic
  const filteredUsers = users
    .filter((u) => {
      const matchesSearch =
        (u.displayName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.phone || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesDept = deptFilter === "all" || u.department === deptFilter;
      const matchesAvail = availFilter === "all" || u.availability === availFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.isActive !== false) ||
        (statusFilter === "inactive" && u.isActive === false);

      return matchesSearch && matchesRole && matchesDept && matchesAvail && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return (a.displayName || "").localeCompare(b.displayName || "");
        case "name-desc":
          return (b.displayName || "").localeCompare(a.displayName || "");
        case "cases-desc":
          return (b.activeCases || 0) - (a.activeCases || 0);
        case "date-desc":
          return (b.createdAt || "").localeCompare(a.createdAt || "");
        case "date-asc":
          return (a.createdAt || "").localeCompare(b.createdAt || "");
        default:
          return 0;
      }
    });

  // Extract Departments for dropdown
  const departments = Array.from(
    new Set(users.map((u) => u.department).filter(Boolean))
  ) as string[];

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border text-sm font-semibold shadow-lg backdrop-blur-md flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {toast.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Officer & User Registry
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Provision new user accounts, assign municipal departments and sectors, update workload bounds, and monitor directory availability.
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-red-500 hover:bg-red-650 text-white font-extrabold text-xs uppercase tracking-widest px-4 h-10 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Create User
        </Button>
      </div>

      {/* Filters & Control Bar */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex flex-col lg:flex-row gap-4 justify-between items-center backdrop-blur-sm">
        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-black/40 border-white/10 text-xs h-9 text-zinc-200"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Role */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg text-[11px] h-8 px-2 text-zinc-300 font-semibold focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="officer">Officer</option>
              <option value="citizen">Citizen</option>
            </select>
          </div>

          {/* Department */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Dept:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg text-[11px] h-8 px-2 text-zinc-300 font-semibold focus:outline-none max-w-[120px]"
            >
              <option value="all">All</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Availability */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Avail:</span>
            <select
              value={availFilter}
              onChange={(e) => setAvailFilter(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg text-[11px] h-8 px-2 text-zinc-300 font-semibold focus:outline-none"
            >
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg text-[11px] h-8 px-2 text-zinc-300 font-semibold focus:outline-none"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto lg:ml-0">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg text-[11px] h-8 px-2 text-zinc-300 font-semibold focus:outline-none"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="cases-desc">Active Cases</option>
              <option value="date-desc">Newest</option>
              <option value="date-asc">Oldest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-zinc-900/20 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="py-24 text-center text-zinc-500 text-xs animate-pulse flex flex-col items-center gap-3">
            <Activity className="h-6 w-6 animate-spin text-zinc-600" />
            Synchronizing database directory...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-24 text-center text-zinc-500 text-xs">
            No accounts found matching the search configuration.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-zinc-900/30 text-zinc-400 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">System Role</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Zone</th>
                  <th className="px-6 py-4">Availability</th>
                  <th className="px-6 py-4">Active Cases</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className={`hover:bg-white/[0.01] transition-colors ${u.isActive === false ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-zinc-300 text-xs overflow-hidden flex-shrink-0">
                        {u.photoURL || u.photo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={u.photoURL || u.photo} alt={u.displayName} className="h-full w-full object-cover" />
                        ) : (
                          (u.displayName || u.email || "?").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-zinc-200">{u.displayName || "Unspecified"}</span>
                        <span className="text-zinc-500 font-mono text-[10px]">{u.email}</span>
                        {u.phone && <span className="text-zinc-500 font-mono text-[9px] flex items-center gap-1 mt-0.5"><Phone className="h-2.5 w-2.5" /> {u.phone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                          u.role === "admin"
                            ? "bg-red-500/15 text-red-400 border-red-500/25"
                            : u.role === "officer"
                              ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                              : "bg-zinc-850 text-zinc-500 border-white/5"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-bold">
                      {u.role === "officer" ? u.department || "Unassigned" : "—"}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {u.role === "officer" ? u.zone || "—" : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {u.role === "officer" ? (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
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
                    <td className="px-6 py-4 font-mono font-bold text-zinc-400">
                      {u.role === "officer" ? u.activeCases ?? 0 : "—"}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 font-mono text-[10px]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                          u.isActive !== false
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                            : "bg-red-500/15 text-red-400 border-red-500/25"
                        }`}
                      >
                        {u.isActive !== false ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(u)}
                        className="border-white/5 hover:bg-zinc-800 text-zinc-300 font-bold text-[10px] py-1 h-7"
                      >
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserStatus(u)}
                        className={`font-bold text-[10px] py-1 h-7 border-white/5 ${
                          u.isActive !== false
                            ? "hover:bg-red-500/10 text-red-400 hover:text-red-300"
                            : "hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300"
                        }`}
                      >
                        {u.isActive !== false ? (
                          <>
                            <UserX className="h-3 w-3 mr-1" /> Disable
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" /> Enable
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 p-6 flex flex-col gap-4 text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-red-450">
                  Provision User Account
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="flex flex-col gap-3 text-xs">
                {/* Full Name */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-zinc-400">Full Name</label>
                  <Input
                    required
                    value={addForm.displayName}
                    onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })}
                    placeholder="Enter name"
                    className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                  />
                </div>

                {/* Email & Temp Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-zinc-400">Email Address</label>
                    <Input
                      required
                      type="email"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      placeholder="email@civicmind.gov"
                      className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-zinc-400">Temporary Password</label>
                    <Input
                      required
                      type="password"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                    />
                  </div>
                </div>

                {/* Phone & Photo URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-zinc-400">Phone Number (optional)</label>
                    <Input
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      placeholder="+91..."
                      className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-zinc-400">Profile Image URL (optional)</label>
                    <Input
                      value={addForm.photoURL}
                      onChange={(e) => setAddForm({ ...addForm, photoURL: e.target.value })}
                      placeholder="https://..."
                      className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                    />
                  </div>
                </div>

                {/* Role */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-zinc-400">Security / System Role</label>
                  <select
                    value={addForm.role}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        role: e.target.value as "citizen" | "officer" | "admin",
                      })
                    }
                    className="bg-black/50 border border-white/10 rounded-lg text-xs h-9 px-3 text-zinc-300 font-semibold focus:outline-none"
                  >
                    <option value="officer">Officer (Municipal Responder)</option>
                    <option value="citizen">Citizen (General reporter)</option>
                    <option value="admin">Administrator (Command staff)</option>
                  </select>
                </div>

                {/* State, City & Language for Officer / Admin */}
                {(addForm.role === "officer" || addForm.role === "admin") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-white/5 pt-3"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-zinc-400">State</label>
                      <Input
                        required
                        value={addForm.state}
                        onChange={(e) => setAddForm({ ...addForm, state: e.target.value })}
                        placeholder="State"
                        className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-zinc-400">City</label>
                      <Input
                        required={addForm.role === "officer"}
                        value={addForm.city}
                        onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                        placeholder="City"
                        className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-zinc-400">Language</label>
                      <select
                        value={addForm.preferredLanguage}
                        onChange={(e) => setAddForm({ ...addForm, preferredLanguage: e.target.value })}
                        className="bg-black/50 border border-white/10 rounded-lg text-xs h-9 px-3 text-zinc-300 font-semibold focus:outline-none"
                      >
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Telugu">Telugu</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Kannada">Kannada</option>
                        <option value="Malayalam">Malayalam</option>
                        <option value="Marathi">Marathi</option>
                        <option value="Gujarati">Gujarati</option>
                        <option value="Punjabi">Punjabi</option>
                        <option value="Bengali">Bengali</option>
                        <option value="Odia">Odia</option>
                        <option value="Urdu">Urdu</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                {/* Officer specific fields */}
                {addForm.role === "officer" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-white/5 pt-3"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-zinc-400">Department</label>
                      <select
                        required
                        value={addForm.department}
                        onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                        className="bg-black/50 border border-white/10 rounded-lg text-xs h-9 px-3 text-zinc-300 font-semibold focus:outline-none"
                      >
                        <option value="">Select Department...</option>
                        <option value="Roads">Roads</option>
                        <option value="Sanitation">Sanitation</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Water Supply">Water Supply</option>
                        <option value="Drainage">Drainage</option>
                        <option value="Parks">Parks</option>
                        <option value="Traffic">Traffic</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-zinc-400">Zone / Sector Bounds</label>
                      <Input
                        required
                        value={addForm.zone}
                        onChange={(e) => setAddForm({ ...addForm, zone: e.target.value })}
                        placeholder="e.g. Zone-4 North"
                        className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Status Toggle */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div>
                    <span className="font-semibold text-zinc-300">Initial Account Status</span>
                    <p className="text-[10px] text-zinc-500">Disabled users cannot sign in.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddForm({ ...addForm, isActive: !addForm.isActive })}
                    className={`h-6 w-11 rounded-full p-0.5 transition-colors focus:outline-none ${
                      addForm.isActive ? "bg-emerald-500" : "bg-zinc-800"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full bg-white transition-transform ${
                        addForm.isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 border-t border-white/5 pt-3 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddModalOpen(false)}
                    className="border-white/10 hover:bg-zinc-950 text-zinc-400 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-red-500 hover:bg-red-650 text-white font-bold text-xs"
                  >
                    {isSubmitting ? "Provisioning..." : "Create User"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingUser(null);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 p-6 flex flex-col gap-4 text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-red-450">
                  Modify User Profile
                </h3>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="flex flex-col gap-3 text-xs">
                {/* Full Name */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-zinc-400">Full Name</label>
                  <Input
                    required
                    value={editForm.displayName}
                    onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                    placeholder="Enter name"
                    className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                  />
                </div>

                {/* Email (Read Only) */}
                <div className="flex flex-col gap-1 opacity-60">
                  <label className="font-semibold text-zinc-500">Email Address (Read-only)</label>
                  <Input
                    disabled
                    value={editingUser.email}
                    className="bg-black/80 border-white/10 text-xs h-9 text-zinc-400"
                  />
                </div>

                {/* Phone & Photo URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-zinc-400">Phone Number</label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="+91..."
                      className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-zinc-400">Profile Image URL</label>
                    <Input
                      value={editForm.photoURL}
                      onChange={(e) => setEditForm({ ...editForm, photoURL: e.target.value })}
                      placeholder="https://..."
                      className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                    />
                  </div>
                </div>

                {/* Role & Availability */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-zinc-400">Security / System Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          role: e.target.value as "citizen" | "officer" | "admin",
                        })
                      }
                      className="bg-black/50 border border-white/10 rounded-lg text-xs h-9 px-3 text-zinc-300 font-semibold focus:outline-none"
                    >
                      <option value="officer">Officer</option>
                      <option value="citizen">Citizen</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-zinc-400">Officer Availability</label>
                    <select
                      disabled={editForm.role !== "officer"}
                      value={editForm.availability}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          availability: e.target.value as "available" | "busy" | "offline",
                        })
                      }
                      className="bg-black/50 border border-white/10 rounded-lg text-xs h-9 px-3 text-zinc-300 font-semibold focus:outline-none disabled:opacity-40"
                    >
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                </div>

                {/* State, City & Language for Officer / Admin */}
                {(editForm.role === "officer" || editForm.role === "admin") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-white/5 pt-3"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-zinc-400">State</label>
                      <Input
                        required
                        value={editForm.state}
                        onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                        placeholder="State"
                        className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-zinc-400">City</label>
                      <Input
                        required={editForm.role === "officer"}
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        placeholder="City"
                        className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-zinc-400">Language</label>
                      <select
                        value={editForm.preferredLanguage}
                        onChange={(e) => setEditForm({ ...editForm, preferredLanguage: e.target.value })}
                        className="bg-black/50 border border-white/10 rounded-lg text-xs h-9 px-3 text-zinc-300 font-semibold focus:outline-none"
                      >
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Telugu">Telugu</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Kannada">Kannada</option>
                        <option value="Malayalam">Malayalam</option>
                        <option value="Marathi">Marathi</option>
                        <option value="Gujarati">Gujarati</option>
                        <option value="Punjabi">Punjabi</option>
                        <option value="Bengali">Bengali</option>
                        <option value="Odia">Odia</option>
                        <option value="Urdu">Urdu</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                {/* Officer specific fields */}
                {editForm.role === "officer" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-white/5 pt-3"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-zinc-400">Department</label>
                      <select
                        required
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        className="bg-black/50 border border-white/10 rounded-lg text-xs h-9 px-3 text-zinc-300 font-semibold focus:outline-none"
                      >
                        <option value="">Select Department...</option>
                        <option value="Roads">Roads</option>
                        <option value="Sanitation">Sanitation</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Water Supply">Water Supply</option>
                        <option value="Drainage">Drainage</option>
                        <option value="Parks">Parks</option>
                        <option value="Traffic">Traffic</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-zinc-400">Zone / Sector Bounds</label>
                      <Input
                        required
                        value={editForm.zone}
                        onChange={(e) => setEditForm({ ...editForm, zone: e.target.value })}
                        placeholder="e.g. Zone-4 North"
                        className="bg-black/50 border-white/10 text-xs h-9 text-zinc-100"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Status Toggle */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div>
                    <span className="font-semibold text-zinc-300">Account Status</span>
                    <p className="text-[10px] text-zinc-500">Disabled users cannot authenticate.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                    className={`h-6 w-11 rounded-full p-0.5 transition-colors focus:outline-none ${
                      editForm.isActive ? "bg-emerald-500" : "bg-zinc-800"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full bg-white transition-transform ${
                        editForm.isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 border-t border-white/5 pt-3 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingUser(null);
                    }}
                    className="border-white/10 hover:bg-zinc-950 text-zinc-400 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-red-500 hover:bg-red-650 text-white font-bold text-xs"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
