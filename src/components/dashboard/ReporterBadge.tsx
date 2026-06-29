/**
 * @file src/components/dashboard/ReporterBadge.tsx
 * @description Renders reporter user details dynamically based on their UID.
 */

"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase/firestore";
import { User } from "lucide-react";

interface ReporterBadgeProps {
  userId: string;
}

export default function ReporterBadge({ userId }: ReporterBadgeProps) {
  const [name, setName] = useState<string>("Anonymous Citizen");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const fetchUser = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", userId));
        if (userSnap.exists()) {
          const u = userSnap.data();
          setName(u.displayName || "Anonymous Citizen");
          setAvatar(u.avatarUrl || null);
        }
      } catch (err) {
        console.error("Error fetching reporter details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  if (loading) {
    return <div className="w-24 h-4 bg-zinc-800 animate-pulse rounded" />;
  }

  return (
    <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full text-[10px] text-zinc-350 select-none">
      {avatar ? (
        <img src={avatar} alt="Reporter Avatar" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
      ) : (
        <User className="w-3 h-3 text-zinc-500 shrink-0" />
      )}
      <span>Reported by: <strong className="text-zinc-200 font-semibold">{name}</strong></span>
    </div>
  );
}
