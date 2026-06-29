/**
 * @file src/components/dashboard/ReportVerificationsList.tsx
 * @description Renders real-time list of community verifications for a specific report.
 */

"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/services/firebase/firestore";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { ThumbsUp, ThumbsDown, Calendar, User, MessageSquare, ShieldCheck, Loader2 } from "lucide-react";

interface VerificationData {
  id: string;
  verifiedAt: string;
  verifiedBy: string;
  verificationPhoto: string | null;
  verificationComment: string | null;
  verificationDecision: "support" | "not_found";
  userName?: string;
  userAvatar?: string | null;
}

interface ReportVerificationsListProps {
  reportId: string;
}

export default function ReportVerificationsList({ reportId }: ReportVerificationsListProps) {
  const [verifications, setVerifications] = useState<VerificationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userCache, setUserCache] = useState<Record<string, { name: string; avatar: string | null }>>({});

  useEffect(() => {
    if (!reportId) return;

    const verificationsRef = collection(db, "reports", reportId, "reportVerifications");

    const unsubscribe = onSnapshot(
      verificationsRef,
      async (snapshot) => {
        const items: VerificationData[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as VerificationData);
        });

        // Resolve user profiles for the verifications
        const updatedItems = await Promise.all(
          items.map(async (item) => {
            const userId = item.verifiedBy;
            if (userCache[userId]) {
              return {
                ...item,
                userName: userCache[userId].name,
                userAvatar: userCache[userId].avatar,
              };
            }

            try {
              const userDocRef = doc(db, "users", userId);
              const userSnap = await getDoc(userDocRef);
              if (userSnap.exists()) {
                const userData = userSnap.data();
                const userName = userData.displayName || "Anonymous Citizen";
                const userAvatar = userData.avatarUrl || null;
                
                // Cache user profile
                setUserCache((prev) => ({
                  ...prev,
                  [userId]: { name: userName, avatar: userAvatar },
                }));

                return {
                  ...item,
                  userName,
                  userAvatar,
                };
              }
            } catch (err) {
              console.error("Error resolving user details for verification:", err);
            }

            return {
              ...item,
              userName: "Anonymous Citizen",
              userAvatar: null,
            };
          })
        );

        // Sort: newest verification first
        updatedItems.sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime());

        setVerifications(updatedItems);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading verifications:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [reportId, userCache]);

  if (loading) {
    return (
      <div className="flex flex-col items-center py-6 gap-2 border border-white/10 rounded-2xl bg-black/40">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        <span className="text-xs text-zinc-500 font-medium">Loading community verifications...</span>
      </div>
    );
  }

  if (verifications.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-zinc-500 border border-dashed border-white/5 rounded-2xl bg-black/20">
        No community verifications submitted yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider select-none flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400" /> Community Verification Audits ({verifications.length})
      </h3>

      <div className="grid grid-cols-1 gap-4">
        {verifications.map((v) => {
          const isSupport = v.verificationDecision === "support";
          return (
            <div
              key={v.id}
              className="border border-white/10 rounded-2xl p-5 bg-zinc-900/40 backdrop-blur-md flex flex-col md:flex-row gap-5 items-start justify-between"
            >
              {/* Left Column: Details */}
              <div className="flex-1 flex gap-3.5 items-start">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {v.userAvatar ? (
                    <img src={v.userAvatar} alt="Verifier Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-zinc-500" />
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">{v.userName}</span>
                    <span
                      className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        isSupport
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {isSupport ? (
                        <>
                          <ThumbsUp className="w-2.5 h-2.5" /> Confirmed
                        </>
                      ) : (
                        <>
                          <ThumbsDown className="w-2.5 h-2.5" /> Issue Not Found
                        </>
                      )}
                    </span>
                  </div>

                  <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-zinc-650" /> {new Date(v.verifiedAt).toLocaleString()}
                  </span>

                  {v.verificationComment ? (
                    <p className="text-xs text-zinc-300 leading-relaxed font-medium bg-zinc-950/40 border border-white/5 p-3 rounded-xl mt-1.5 flex gap-2 items-start">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                      <span>{v.verificationComment}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500 italic mt-1 font-medium">No description provided.</p>
                  )}
                </div>
              </div>

              {/* Right Column: Uploaded Image */}
              {v.verificationPhoto && (
                <div className="relative w-full md:w-32 aspect-video md:aspect-square border border-white/10 rounded-xl overflow-hidden bg-zinc-950/60 group shrink-0 self-center">
                  <img
                    src={v.verificationPhoto}
                    alt="Community Evidence"
                    className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition duration-300"
                    onClick={() => window.open(v.verificationPhoto!, "_blank")}
                  />
                  <div className="absolute top-1.5 left-1.5 bg-black/75 border border-white/10 text-[8px] text-white px-2 py-0.5 rounded font-mono select-none">
                    EVIDENCE PHOTO
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
